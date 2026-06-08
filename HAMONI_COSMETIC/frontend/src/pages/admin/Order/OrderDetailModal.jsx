import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/axiosClient'; 
import InvoiceModal from "./InvoiceModal";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './OrderManagement.css'; 

const OrderDetailModal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
    const [status, setStatus] = useState(""); 
    const [isPrinted, setIsPrinted] = useState(false);
    const [refundStatus, setRefundStatus] = useState('notRefunded');

    const showSuccess = (msg) => toast.success(msg, { position: 'top-right', autoClose: 3000 });
    const showWarning = (msg) => toast.warning(msg, { position: 'top-right', autoClose: 8000, closeOnClick: true });
    const showError = (msg) => toast.error(msg, { position: 'top-right', autoClose: 5000 });

    const userPermissions = ['ALL']; 
    const isAdmin = userPermissions.includes('ALL');
    const canUpdate = isAdmin || userPermissions.includes('UPDATE_ORDER');
    const canCancel = isAdmin || userPermissions.includes('CANCEL_ORDER');
    const canPrint = isAdmin || userPermissions.includes('PRINT_ORDER');
    const canViewLog = isAdmin || userPermissions.includes('VIEW_ORDER_LOG');
    const disableCancel = order?.trangThai === "HoanThanh" || order?.trangThai === "DaHuy";
    const disableUpdate = order?.trangThai === "HoanThanh";
    const canPrintInvoice = order?.trangThai === 'DaXacNhan' || order?.daInHoaDon;
    const originalRefundState = !!(order?.daHoanTien || order?.isRefunded || order?.refunded || order?.hoanTien);
    const hasStatusChanged = Boolean(order?.trangThai) && (status !== order?.trangThai || originalRefundState !== (refundStatus === 'refunded'));
    const customerName = order?.khachHang?.hoTen || 'Khách hàng';
    const customerAvatar = order?.khachHang?.avatarUrl;
    
    const getInitials = (name) => {
        if (!name) return "H";
        const parts = name.trim().split(" ");
        return parts[parts.length - 1].charAt(0).toUpperCase();
    };

    const getAvatarBgColor = (name) => {
        const colors = ['#e67e22', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f', '#e74c3c'];
        const index = name ? name.charCodeAt(0) % colors.length : 0;
        return colors[index];
    };
    const productPlaceholderImage =
        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="12" fill="%23f2f2f2"/%3E%3Cpath d="M24 64l15-17 13 14 9-10 15 13v9H24z" fill="%23c9c9c9"/%3E%3Ccircle cx="40" cy="39" r="7" fill="%23dbdbdb"/%3E%3C/svg%3E';

    const parseShippingAddress = (raw) => {
        if (!raw) return { ten: '', sdt: '', email: '', diaChi: '' };
        const extract = (label) => {
            const regex = new RegExp(`${label}:\\s*([^|]+)`);
            const match = raw.match(regex);
            return match ? match[1].trim() : '';
        };
        return {
            ten:    extract('Tên'),
            sdt:    extract('SĐT'),
            email:  extract('Email'),
            diaChi: extract('Địa chỉ'),
        };
    };

    const fetchOrderDetail = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get(`/orders/${id}`);
            setOrder(res.data ?? res);
        } catch (err) {
            console.error("Lỗi tải chi tiết đơn hàng:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchOrderDetail(); }, [fetchOrderDetail]);

    useEffect(() => {
        if (order) {
            setStatus(order.trangThai);
            setIsPrinted(!!order.daInHoaDon);
        }
    }, [order]);

    useEffect(() => {
        if (!order) return;
        const maybeRefund = order.daHoanTien || order.isRefunded || order.hoanTien || order.refunded;
        setRefundStatus(maybeRefund ? 'refunded' : 'notRefunded');
    }, [order]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';
    };

    const isTransferPaidOrder = (data) => {
        const method = String(data?.phuongThucThanhToan || '').toUpperCase();
        const status = String(data?.trangThaiThanhToan || '').toUpperCase();
        const transferMethods = ['VNPAY', 'THANHTOANTHEOSO', 'CHUYENKHOAN', 'BANK_TRANSFER'];
        return transferMethods.includes(method) && status === 'DATHANHTOAN';
    };

    const totalNeedCollect = isTransferPaidOrder(order) ? 0 : Number(order?.tongTien || 0);

    const handleUpdateStatus = async () => {
        if (!hasStatusChanged) {
            showWarning("Vui lòng chọn trạng thái mới trước khi cập nhật.");
            return;
        }
        if (status === 'DangGiao' && !(isPrinted || order?.daInHoaDon)) {
            showWarning("Vui lòng in hóa đơn trước khi chuyển sang trạng thái đang giao.");
            return;
        }
        try {
            const body = { newStatus: status, daHoanTien: refundStatus === 'refunded' };
            await axiosClient.put(`/orders/${id}/status`, body);
            if (status === 'DaHuy') {
                showError("⚠️ Đơn hàng đã bị hủy!");
            } else {
                showSuccess("Cập nhật trạng thái đơn hàng thành công!");
            }
            setOrder((prev) => prev ? { ...prev, trangThai: status, daHoanTien: refundStatus === 'refunded' } : prev);
            fetchOrderDetail(); 
        } catch (err) {
            console.error(err);
            showError("Lỗi cập nhật trạng thái!");
        }
    };

    const handleOpenInvoice = () => {
        if (order?.trangThai !== 'DaXacNhan' && !order?.daInHoaDon) {
            showWarning('Vui lòng xác nhận đơn hàng trước khi in hóa đơn.');
            return;
        }
        setIsInvoiceOpen(true);
    };

    const handleConfirmPrintInvoice = async () => {
        try {
            window.print();
            await axiosClient.put(`/orders/${id}/print`);
            setIsPrinted(true);
            setOrder((prev) => (prev ? { ...prev, daInHoaDon: true } : prev));
            await fetchOrderDetail();
            showSuccess("🖨️ Đã in hóa đơn!");
            setIsInvoiceOpen(false);
        } catch (err) {
            console.error("Lỗi khi in hóa đơn:", err);
            showError("Lỗi khi in hóa đơn!");
        }
    };

    const handleCancelOrder = async () => {
        try {
            await axiosClient.put(`/orders/${id}/cancel`);
            showError("🚫 Đơn hàng đã bị hủy!");
            setTimeout(() => navigate('/admin/orders'), 1500);
        } catch (err) {
            console.error("🔥 ERROR:", err.response?.data || err.message);
            showError("Lỗi hủy đơn hàng!");
        }
    };

    const buildTimeline = () => {
        if (!order) return [];
        const timeline = [];
        timeline.push({ label: "Đơn hàng đã đặt", time: order.ngayTao });
        const validLogs = (order.lichSu || []).filter(log => log.moTa && !log.moTa.includes("→ ChoXacNhan"));
        validLogs.sort((a, b) => new Date(a.thoiGian) - new Date(b.thoiGian));
        validLogs.forEach(log => {
            let displayLabel = log.moTa;
            const statusMap = {
                "DaXacNhan": "Đã xác nhận đơn hàng",
                "DangGiao": "Đang giao hàng",
                "HoanThanh": "Giao hàng thành công",
                "DaHuy": "Đơn hàng đã bị hủy"
            };
            if (log.moTa.includes("→")) {
                const newStatus = log.moTa.split("→")[1].trim();
                displayLabel = statusMap[newStatus] || newStatus;
            }
            if (displayLabel === "DaInHoaDon") displayLabel = "Đã in hóa đơn";
            if (timeline.length === 0 || timeline[timeline.length - 1].label !== displayLabel) {
                timeline.push({ label: displayLabel, time: log.thoiGian });
            }
        });
        return timeline;
    };

    if (loading) return <div className="loading-container">Đang tải dữ liệu đơn hàng #{id}...</div>;
    if (!order) return <div className="error-container">Không tìm thấy thông tin đơn hàng!</div>;

    const shipping = parseShippingAddress(order?.diaChiGiaoHang);

    return (
        <div className="order-detail-container">
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            <button className="back-btn-text" onClick={() => navigate('/admin/orders')}>
                ← Quay lại danh sách
            </button>

            <h1 className="main-title">XỬ LÝ ĐƠN HÀNG & CẬP NHẬT TRẠNG THÁI</h1>

            {/* ===== CUSTOMER INFO CARD ===== */}
            <div className="customer-info-card">
                {/* Cột 1: Avatar */}
                <div className="col-avatar">
                    {customerAvatar ? (
                        <div className="avatar-box" style={{
                            backgroundImage: `url(${customerAvatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px'
                        }}></div>
                    ) : (
                        <div className="avatar-box" style={{
                            backgroundColor: getAvatarBgColor(customerName),
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            fontWeight: 'bold',
                            color: '#fff'
                        }}>
                            {getInitials(customerName)}
                        </div>
                    )}
                </div>

                {/* Cột 2: Tên & SĐT */}
                <div className="col-customer">
                    <span className="label-top">KHÁCH HÀNG THÀNH VIÊN</span>
                    <h3 className="col-value">{shipping.ten || customerName}</h3>
                    <span className="label-top">SỐ ĐIỆN THOẠI</span>
                    <p className="col-value">📞 {shipping.sdt || order.khachHang?.soDienThoai}</p>
                </div>

                {/* Cột 3: Địa chỉ & Email */}
                <div className="col-address">
                    <span className="label-top">ĐỊA CHỈ GIAO HÀNG</span>
                    <p className="col-value">{shipping.diaChi}</p>
                    <span className="label-top">EMAIL</span>
                    <p className="col-value">✉️ {shipping.email || order.khachHang?.email}</p>
                </div>
            </div>  {/* ← đóng customer-info-card */}

            {/* ===== DETAIL GRID ===== */}
            <div className="detail-grid-layout">
                <div className="left-column">
                    <div className="products-card">
                        <div className="card-header">
                            <span>Danh mục đơn hàng</span>
                            <span className="product-count">{order.chiTiet?.length} SẢN PHẨM</span>
                        </div>
                        <div className="products-list">
                            {(order.chiTiet || []).map((item, index) => (
                                <div className="product-item" key={index}>
                                    <img 
                                        className="product-thumb" 
                                        src={item.hinhAnh || productPlaceholderImage} 
                                        alt={item.tenSP}
                                        onError={(e) => { e.currentTarget.src = productPlaceholderImage; }}
                                    />
                                    <div className="item-info">
                                        <h4>{item.tenSP || item.TenSP || item.tenSanPham || "Sản phẩm không tên"}</h4> 
                                        <p className="variant">{item.TenBienThe || item.tenBienThe || item.PhanLoai}</p>
                                    </div>
                                    <div className="item-price-qty">
                                        <span className="price">{formatCurrency(item.giaBan)}</span>
                                        <span className="qty">SL: {item.soLuong}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="billing-summary">
                            <div className="bill-row"><span>TẠM TÍNH</span><span>{formatCurrency(order.tamTinh)}</span></div>
                            <div className="bill-row"><span>VOUCHER</span><span>-{formatCurrency(order.giamGia)}</span></div>
                            <div className="bill-row"><span>SHIP</span><span>{formatCurrency(order.phiShip)}</span></div>
                            {isTransferPaidOrder(order) && (
                                <div className="paid-badge">
                                    <span>Đã thanh toán</span>
                                    <span className="paid-amount">{formatCurrency(order.tongTien)}</span>
                                </div>
                            )}
                            <div className="bill-total">
                                <span>Tổng</span>
                                <span className="final-price">{formatCurrency(totalNeedCollect)}</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {canPrint && (
                                <button
                                    className="full-print-btn"
                                    style={{ flex: 1 }}
                                    onClick={handleOpenInvoice}
                                    disabled={!canPrintInvoice}
                                    title={!canPrintInvoice ? 'Phải xác nhận đơn hàng trước khi in hóa đơn' : ''}
                                >
                                    🖨️ IN HÓA ĐƠN
                                </button>
                            )}
                            {canViewLog && (
                                <button className="full-print-btn" style={{ flex: 1, background: "#333", color: "#fff" }} onClick={() => navigate(`/admin/orders/${id}/logs`)}>
                                    📜 XEM LỊCH SỬ
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="right-column">
                    <div className="status-control-card">
                        <p className="card-sub-title">📦 Trạng thái đơn hàng</p>
                        <div className={`print-status-badge ${(isPrinted || order?.daInHoaDon) ? 'printed' : 'not-printed'}`}>
                            {(isPrinted || order?.daInHoaDon) ? '✔ Đã in' : '⏳ Chưa in'}
                        </div>
                        {isTransferPaidOrder(order) && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>Hoàn tiền</label>
                                <select
                                    className={`refund-select ${refundStatus}`}
                                    value={refundStatus}
                                    onChange={(e) => {
                                        setRefundStatus(e.target.value);
                                        if (e.target.value === 'refunded') showSuccess('Đã đánh dấu là đã hoàn tiền');
                                        else showWarning('Đã đánh dấu là chưa hoàn tiền');
                                    }}
                                >
                                    <option value="notRefunded">Chưa hoàn tiền</option>
                                    <option value="refunded">Đã hoàn tiền</option>
                                </select>
                            </div>
                        )}
                        <select 
                            className="status-dropdown"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={order.trangThai === "HoanThanh" || order.trangThai === "DaHuy"}
                        >
                            {order.trangThai === "ChoXacNhan" && (
                                <>
                                    <option value="ChoXacNhan">-- Chờ xác nhận --</option>
                                    <option value="DaXacNhan">Xác nhận đơn hàng</option>
                                    <option value="DaHuy">Hủy đơn hàng</option>
                                </>
                            )}
                            {order.trangThai === "DaXacNhan" && (
                                <>
                                    <option value="DaXacNhan">-- Đã xác nhận --</option>
                                    <option value="DangGiao">Bắt đầu giao hàng</option>
                                    <option value="DaHuy">Hủy đơn hàng</option>
                                </>
                            )}
                            {order.trangThai === "DangGiao" && (
                                <>
                                    <option value="DangGiao">-- Đang giao hàng --</option>
                                    <option value="HoanThanh">Đã giao thành công</option>
                                    <option value="DaHuy">Hủy đơn hàng</option>
                                </>
                            )}
                            {order.trangThai === "HoanThanh" && <option value="HoanThanh">Đã hoàn thành</option>}
                            {order.trangThai === "DaHuy" && <option value="DaHuy">Đã hủy</option>}
                        </select>
                        <div className="action-btns">
                            {canCancel && (
                                <button 
                                    className="btn-white" 
                                    onClick={handleCancelOrder}
                                    disabled={disableCancel}
                                >
                                    HỦY ĐƠN
                                </button>
                            )}
                            {canUpdate && (
                                <button 
                                    className="btn-black" 
                                    onClick={handleUpdateStatus}
                                    disabled={disableUpdate || !hasStatusChanged}
                                >
                                    CẬP NHẬT
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="timeline-card">
                        <p className="card-sub-title">🕒 LỊCH SỬ VẬN HÀNH</p>
                        <div className="timeline-list">
                            {buildTimeline().map((item, index, arr) => (
                                <div key={index} className={`timeline-item ${index === arr.length - 1 ? 'active' : ''}`}>
                                    <div className="dot"></div>
                                    <div className="time-content">
                                        <p>{item.label}</p>
                                        <small>{item.time ? new Date(item.time).toLocaleString('vi-VN') : ''}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>  {/* ← đóng detail-grid-layout */}

            {isInvoiceOpen && (
                <InvoiceModal 
                    order={order} 
                    onClose={() => setIsInvoiceOpen(false)} 
                    onPrint={handleConfirmPrintInvoice}
                />
            )}
        </div>
    );
};

export default OrderDetailModal;