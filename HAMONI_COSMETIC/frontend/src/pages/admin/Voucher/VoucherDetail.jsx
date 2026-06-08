import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './VoucherDetail.css'; // Sử dụng file CSS riêng
import axiosClient from "../../../services/axiosClient";

const VoucherDetail = () => {
    const { id } = useParams(); // Lấy MaVoucher từ URL
    const voucherId = decodeURIComponent(id || '');
    const navigate = useNavigate();
    
    const [voucher, setVoucher] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Chuyển đổi định dạng ngày CSDL sang YYYY-MM-DD cho input
    const formatToInputDate = (dateString) => {
        if (!dateString) return '';
        return dateString.split('T')[0];
    };

    // 1. Fetch dữ liệu khi khởi tạo
    useEffect(() => {
        const getDetail = async () => {
            try {
                const response = await axiosClient.get(`vouchers/${encodeURIComponent(voucherId)}`);
                const data = response;
                
                // Chuẩn bị dữ liệu cho form
                setVoucher({
                    ...data,
                    NgayBatDau: formatToInputDate(data.NgayBatDau),
                    NgayKetThuc: formatToInputDate(data.NgayKetThuc)
                });
            } catch (error) {
                const statusCode = error?.response?.status;
                const errorMessage = error?.response?.data?.message;
                if (statusCode === 404) {
                    toast.error("Không tìm thấy mã giảm giá này!");
                } else {
                    toast.error(errorMessage || "Không tải được chi tiết voucher. Vui lòng thử lại.");
                }
                setTimeout(() => navigate('/admin/vouchers'), 2000);
            } finally {
                setIsLoading(false);
            }
        };
        getDetail();
    }, [voucherId, navigate]);

    // 2. Xử lý thay đổi Input
    const handleChange = (e) => {
        const { name, value } = e.target;
        setVoucher(prev => ({ ...prev, [name]: value }));
    };

    const getVoucherStatus = (currentVoucher) => {
        const rawSoLuongToiDa = currentVoucher.SoLuong ?? currentVoucher.SoLuongToiDa;
        const rawSoLuongDaDung = currentVoucher.SoLuongDaDung;
        const hasQuantityData =
            rawSoLuongToiDa !== undefined &&
            rawSoLuongToiDa !== null &&
            rawSoLuongDaDung !== undefined &&
            rawSoLuongDaDung !== null;

        if (hasQuantityData) {
            const soLuongToiDa = Number(rawSoLuongToiDa);
            const soLuongDaDung = Number(rawSoLuongDaDung);
            const quantityIsValid = Number.isFinite(soLuongToiDa) && Number.isFinite(soLuongDaDung);

            if (quantityIsValid && soLuongToiDa >= 0 && soLuongDaDung >= soLuongToiDa) {
                return 'HetMa';
            }
        }

        if (currentVoucher.TrangThai === 'TamDung') return 'TamDung';
        if (currentVoucher.TrangThai === 'HetHan') return 'HetHan';
        const now = new Date();
        const startDate = new Date(currentVoucher.NgayBatDau);
        const endDate = new Date(currentVoucher.NgayKetThuc);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'TamDung';
        if (now < startDate) return 'TamDung';
        if (now > endDate) return 'HetHan';
        return 'KichHoat';
    };

    // 3. Gửi yêu cầu cập nhật (PUT)
    const handleUpdate = async (e) => {
        e.preventDefault();
        
        // === VALIDATE DỮ LIỆU ===
        if (Number(voucher.SoLuongToiDa) <= 0) {
            toast.warning("Số lượng tối đa phải lớn hơn 0!");
            return;
        }

        if (Number(voucher.DonHangToiThieu) < 0) {
            toast.warning("Đơn hàng tối thiểu không được âm!");
            return;
        }

        // === VALIDATE LOGIC NGÀY ===
        const startDate = new Date(voucher.NgayBatDau);
        const endDate = new Date(voucher.NgayKetThuc);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            toast.error("Định dạng ngày không hợp lệ!");
            return;
        }

        if (endDate <= startDate) {
            toast.error("Ngày bắt đầu không thể sau ngày kết thúc!");
            return;
        }

        try {
            await axiosClient.put(`vouchers/${encodeURIComponent(voucherId)}`, {
                DonHangToiThieu: Number(voucher.DonHangToiThieu),
                SoLuongToiDa: Number(voucher.SoLuongToiDa),
                NgayBatDau: voucher.NgayBatDau,
                NgayKetThuc: voucher.NgayKetThuc
            });
            toast.success("Cập nhật thông tin thành công!");
        } catch (error) {
            const errorMsg = error?.response?.data?.message || "Lỗi khi lưu thông tin. Vui lòng kiểm tra lại.";
            toast.error(errorMsg);
        }
    };

    // 4. Thay đổi trạng thái (PATCH)
    const handleToggleStatus = async () => {
        const currentStatus = getVoucherStatus(voucher);

        // === KIỂM TRA CÁC TRẠNG THÁI KHÔNG THỂ THAY ĐỔI ===
        if (currentStatus === 'HetMa') {
            toast.warning("Voucher đã hết số lượng, không thể thay đổi trạng thái.");
            return;
        }

        if (currentStatus === 'HetHan') {
            toast.warning("Voucher đã hết hạn, không thể kích hoạt lại.");
            return;
        }

        const nextStatus = currentStatus === 'KichHoat' ? 'TamDung' : 'KichHoat';
        try {
            await axiosClient.patch(`vouchers/${encodeURIComponent(voucherId)}/status`, { TrangThai: nextStatus });
            setVoucher(prev => ({ ...prev, TrangThai: nextStatus }));
            const statusText = nextStatus === 'KichHoat' ? 'Hoạt động' : 'Tạm dừng';
            toast.success(`Cập nhật trạng thái thành công: ${statusText}`);
        } catch (error) {
            const errorMessage = error?.response?.data?.message;
            toast.error(errorMessage || "Không thể cập nhật trạng thái! Vui lòng kiểm tra điều kiện voucher.");
        }
    };

    if (isLoading) return <div className="loading-box">Đang tải dữ liệu voucher...</div>;
    if (!voucher) return null;

    const effectiveStatus = getVoucherStatus(voucher);
    const statusText =
        effectiveStatus === 'KichHoat'
            ? '● Đang hoạt động'
            : effectiveStatus === 'TamDung'
                ? '○ Đang tạm dừng'
                : effectiveStatus === 'HetMa'
                    ? '● Đã hết mã'
                    : '● Đã hết hạn';
    const toggleButtonClass = effectiveStatus === 'KichHoat' ? 'pause' : 'resume';
    const isToggleDisabled = effectiveStatus === 'HetMa' || effectiveStatus === 'HetHan';
    const toggleButtonLabel =
        effectiveStatus === 'KichHoat'
            ? '⏸ TẠM DỪNG MÃ'
            : effectiveStatus === 'HetMa'
                ? '⛔ HẾT MÃ'
                : effectiveStatus === 'HetHan'
                    ? '⛔ HẾT HẠN'
                    : '▶ KÍCH HOẠT LẠI';

    return (
        <div className="voucher-detail-container">
            {/* Header */}
            <header className="detail-header">
                <button className="btn-back" onClick={() => navigate('/admin/vouchers')}>
                    ⬅ Quay lại
                </button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
                        Mã giảm giá: <span style={{ color: '#2563eb' }}>{voucher.MaVoucher}</span>
                    </h1>
                </div>
                <div className={`status-badge ${effectiveStatus}`}>
                    {statusText}
                </div>
            </header>

            {/* Form */}
            <main className="detail-card">
                <form onSubmit={handleUpdate}>
                    <div className="voucher-info-grid">
                        {/* Các trường không được sửa (Read-only) */}
                        <div className="form-field">
                            <label>Mã Voucher</label>
                            <input type="text" value={voucher.MaVoucher} disabled />
                        </div>
                        <div className="form-field">
                            <label>Loại giảm giá</label>
                            <input 
                                type="text" 
                                value={voucher.PhanTramGiam ? "Phần trăm (%)" : "Số tiền mặt (VNĐ)"} 
                                disabled 
                            />
                        </div>
                        <div className="form-field">
                            <label>Giá trị giảm</label>
                            <input 
                                type="text" 
                                value={voucher.PhanTramGiam ? `${voucher.PhanTramGiam}%` : `${Number(voucher.SoTienGiam).toLocaleString()}đ`} 
                                disabled 
                            />
                        </div>
                        <div className="form-field">
                            <label>Số lượng đã dùng</label>
                            <input type="text" value={voucher.SoLuongDaDung} disabled />
                        </div>

                        {/* Các trường được phép sửa */}
                        <div className="form-field">
                            <label>Đơn tối thiểu (VNĐ)</label>
                            <input 
                                type="number" 
                                name="DonHangToiThieu"
                                value={voucher.DonHangToiThieu} 
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-field">
                            <label>Tổng số lượng phát hành</label>
                            <input 
                                type="number" 
                                name="SoLuongToiDa"
                                value={voucher.SoLuongToiDa} 
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-field">
                            <label>Ngày bắt đầu hiệu lực</label>
                            <input 
                                type="date" 
                                name="NgayBatDau"
                                value={voucher.NgayBatDau} 
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-field">
                            <label>Ngày kết thúc hiệu lực</label>
                            <input 
                                type="date" 
                                name="NgayKetThuc"
                                value={voucher.NgayKetThuc} 
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Nút thao tác */}
                    <div className="action-group">
                        <button type="submit" className="btn-save">
                            💾 CẬP NHẬT THÔNG TIN
                        </button>
                        
                        <button 
                            type="button" 
                            className={`btn-status-toggle ${toggleButtonClass}`}
                            onClick={handleToggleStatus}
                            disabled={isToggleDisabled}
                        >
                            {toggleButtonLabel}
                        </button>
                    </div>
                </form>
            </main>

            {/* Thông báo */}
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default VoucherDetail;