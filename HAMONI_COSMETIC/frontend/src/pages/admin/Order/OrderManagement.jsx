import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; 
import orderApi from '../../../services/orderApi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './OrderManagement.css';

const OrderManagement = () => {
    const navigate = useNavigate(); 
    
    const [orders, setOrders] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ===== LOAD DATA =====
    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            let finalStartDate = dateRange.start;
            let finalEndDate = dateRange.end;

            if (finalStartDate) {
                finalStartDate = `${finalStartDate} 00:00:00`;
            }

            if (finalEndDate) {
                finalEndDate = `${finalEndDate} 23:59:59`;
            }

           const res = await orderApi.getOrders({
    search: search.trim(),
    status: statusFilter,
    startDate: finalStartDate,
    endDate: finalEndDate,
    page: currentPage,
    limit: 5
});

console.log("🔥 API:", res.data);

let dataList = res.data || [];
let totalPages = res.pagination?.totalPages || 1;

setOrders(dataList);
setTotalPages(totalPages);
        } catch (err) {
            console.error("❌ Lỗi loadOrders:", err);
            setOrders([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter, currentPage, dateRange.start, dateRange.end]);

    // ===== CALL API =====
    useEffect(() => {
        const timer = setTimeout(() => {
            loadOrders();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadOrders]);

    // show toast for transfer-paid canceled orders that are not refunded
    useEffect(() => {
        if (loading) return;
        if (!orders || orders.length === 0) return;

        const flagged = orders.filter(o => {
            try {
                return o.trangThai === 'DaHuy' && isTransferPaidOrder(o) && !o.daHoanTien;
            } catch {
                return false;
            }
        });

        if (flagged.length > 0) {
            const ids = flagged.map(o => `#HM-${o.id}`).slice(0, 10).join(', ');
            const msg = `Có ${flagged.length} đơn chuyển khoản đã hủy chưa hoàn tiền: ${ids}`;
            toast.warning(msg, { position: 'top-right', autoClose: 8000 });
        }
    }, [orders, loading]);

    // also fetch alerts endpoint to show server-side computed alerts (keeps list in sync)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await orderApi.getRefundAlerts();
                if (cancelled) return;
                if (!res || !res.data) return;
                const { count, ids } = res.data;
                if (count > 0) {
                    const msg = `Có ${count} đơn chuyển khoản đã hủy chưa hoàn tiền: ${ids.slice(0,10).map(i=>`#HM-${i}`).join(', ')}`;
                    toast.warning(msg, { position: 'top-right', autoClose: 8000 });
                }
            } catch {
                // ignore
            }
        })();

        return () => { cancelled = true; };
    }, []);

    // ===== RESET PAGE =====
    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, dateRange.start, dateRange.end]);

    // ===== FORMAT =====
    const formatCurrency = (amount) =>
        new Intl.NumberFormat('vi-VN').format(amount || 0) + 'đ';

    const isTransferPaidOrder = (order) => {
        const method = String(order?.phuongThucThanhToan || '').toUpperCase();
        const status = String(order?.trangThaiThanhToan || '').toUpperCase();
        const transferMethods = ['VNPAY', 'THANHTOANTHEOSO', 'CHUYENKHOAN', 'BANK_TRANSFER'];

        return transferMethods.includes(method) && status === 'DATHANHTOAN';
    };

    const getAmountNeedCollect = (order) => {
        if (isTransferPaidOrder(order)) return 0;
        return Number(order?.tongTien || 0);
    };

    const getStatusClass = (status) => {
    if (!status) return "status-badge";

    const clean = status
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
        .replace(/\s+/g, "")             // bỏ space
        .replace(/_/g, "");              // bỏ underscore

    const map = {
        hoanthanh: "status-HoanThanh",
        danggiao: "status-DangGiao",
        choxacnhan: "status-ChoXacNhan",
        dahuy: "status-DaHuy"
    };

    return `status-badge ${map[clean] || ""}`;
};

    const tabs = [
        { id: 'all', label: 'Tất cả trạng thái' },
        { id: 'ChoXacNhan', label: 'Chờ xác nhận' }, 
        { id: 'DangGiao', label: 'Đang giao' },     
        { id: 'HoanThanh', label: 'Hoàn thành' },   
        { id: 'DaHuy', label: 'Đã hủy' },           
    ];

    return (
        <div className="order-admin-container">
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="light" />
            <h1 className="main-title">QUẢN LÝ ĐƠN HÀNG</h1>

            {/* ===== THANH CÔNG CỤ LỌC & TÌM KIẾM ===== */}
            <div className="action-bar-container">
                
                {/* 1. Dropdown Trạng thái */}
                <div className="status-dropdown-wrapper">
                    <select 
                        className="status-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {tabs.map(tab => (
                            <option key={tab.id} value={tab.id}>
                                {tab.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. Ô Tìm kiếm đã được dời xuống */}
                <div className="search-wrapper">
                    <input 
                        type="text" 
                        className="search-input"
                        placeholder="Tìm theo Mã đơn hàng, Tên khách hàng..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* 3. Lọc theo ngày */}
                <div className="date-filter-group">
                    <span className="filter-label">Lọc theo ngày:</span>
                    <div className="date-inputs">
                        <input 
                            type="date" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        />
                        <span className="date-separator">-</span>
                        <input 
                            type="date" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            {/* ===== TABLE ===== */}
            <div className="order-table-wrapper">
                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>MÃ ĐƠN</th>
                            <th>NGÀY ĐẶT</th>
                            <th>KHÁCH HÀNG</th>
                            <th>TỔNG TIỀN</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className="text-center py-4">Đang tải...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan="5" className="text-center py-4">Không có dữ liệu</td></tr>
                        ) : (
                            orders.map((order) => (
                                <tr 
                                    key={order.id} 
                                    className="clickable-row"
                                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                                >
                                    <td className="order-id-cell">
                                        <span className="order-code">#HM-{order.id}</span>
                                    </td>
                                    <td>{new Date(order.ngayTao).toLocaleDateString('vi-VN')}</td>
                                    <td>{order.khachHang}</td>
                                    <td className="total-amount-list">{formatCurrency(getAmountNeedCollect(order))}</td>
                                    <td>
                                        <span className={getStatusClass(order.trangThai)}>
                                            {order.trangThai === 'HoanThanh' ? 'Hoàn thành' : 
                                             order.trangThai === 'DangGiao' ? 'Đang giao' :
                                             order.trangThai === 'ChoXacNhan' ? 'Chờ xác nhận' : 
                                             order.trangThai === 'DaHuy' ? 'Đã hủy' : order.trangThai}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* ===== PAGINATION ===== */}
                <div className="pagination-wrapper">
                    <button 
                        className="pagi-arrow"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                    >
                        ‹ Trước
                    </button>

                    <div className="pagi-numbers-group">
                        {(() => {
                            // Tính toán phạm vi trang để hiển thị (chỉ 3 trang)
                            let startPage = Math.max(1, currentPage - 1);
                            let endPage = Math.min(totalPages, startPage + 2);
                            
                            // Nếu gần cuối, shift lại để lúc nào cũng có 3 trang
                            if (endPage - startPage < 2) {
                                startPage = Math.max(1, endPage - 2);
                            }
                            
                            const pages = [];
                            for (let i = startPage; i <= endPage; i++) {
                                pages.push(i);
                            }
                            
                            return pages.map((pageNum) => (
                                <button
                                    key={pageNum}
                                    className={`pagi-item ${currentPage === pageNum ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(pageNum)}
                                >
                                    {pageNum}
                                </button>
                            ));
                        })()}
                    </div>

                    <button 
                        className="pagi-arrow"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                        Sau ›
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderManagement;