// src/pages/admin/Customer/CustomerDetail.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosClient from '../../../services/axiosClient'; // Đổi sang dùng axiosClient
import './CustomerDetail.css';

const CustomerDetail = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [statusValue, setStatusValue] = useState('1');
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Hàm fetch dữ liệu (useCallback để tránh infinite loop)
    const fetchCustomerDetail = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/customers/detail-analytics/${id}`);
            setData(res); 
            setStatusValue(String(res.customerInfo?.TrangThai ?? 1));
        } catch (err) {
            console.error("Lỗi fetch chi tiết:", err);
            toast.error("Không thể tải chi tiết khách hàng!");
        }
    }, [id]);

    // Fetch khi component mount hoặc id thay đổi
    useEffect(() => {
        fetchCustomerDetail();
    }, [fetchCustomerDetail]);

    // Refetch khi quay lại trang này
    useEffect(() => {
        if (location.pathname === `/admin/customer-detail/${id}`) {
            fetchCustomerDetail();
        }
    }, [location.pathname, id, fetchCustomerDetail]);

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

    const handleUpdateStatus = async () => {
        setIsSaving(true);
        try {
            const nextStatus = statusValue === '1' ? 1 : 0;
            await axiosClient.put(`/customers/${id}/status`, { TrangThai: nextStatus });

            setData((prev) => prev ? ({
                ...prev,
                customerInfo: {
                    ...prev.customerInfo,
                    TrangThai: nextStatus,
                }
            }) : prev);

            toast.success("Cập nhật trạng thái thành công!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Không thể cập nhật trạng thái!");
        } finally {
            setIsSaving(false);
        }
    };

    if (!data) return <div className="loading-screen">Đang tải dữ liệu Hamoni...</div>;

    const fullName = data.customerInfo?.HoTen || "Khách Hàng";

    return (
        <div className="admin-detail-analytics-container">
            <div className="analytics-content-wrapper">
                <header className="analytics-header">
                    <button onClick={() => navigate(-1)} className="btn-back-rect">← Quay lại</button>
                    <div className="header-text-group">
                        <h1 className="title-large">CHI TIẾT KHÁCH HÀNG</h1>
                        <p className="subtitle">Hồ sơ khách hàng tại hệ thống Hamoni</p>
                    </div>
                </header>

                {/* Thông tin khách hàng */}
                <div className="info-card profile-info-card">
                    {data.customerInfo?.Avatar ? (
                        <div className="avatar-box" style={{
                            backgroundImage: `url(${data.customerInfo.Avatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}></div>
                    ) : (
                        <div className="avatar-box" style={{ backgroundColor: getAvatarBgColor(fullName) }}>
                            {getInitials(fullName)}
                        </div>
                    )}
                    <div className="profile-details-grid">
                        <div className="detail-item">
                            <label>HỌ VÀ TÊN</label>
                            <h2 className="customer-name-display"><strong>{fullName}</strong></h2>
                        </div>
                        <div className="detail-item">
                            <label>SỐ ĐIỆN THOẠI</label>
                            <p><strong>{data.customerInfo?.SoDienThoai || 'Chưa cập nhật'}</strong></p>
                        </div>
                        <div className="detail-item">
                            <label>EMAIL</label>
                            <p><strong>{data.customerInfo?.Email}</strong></p>
                        </div>
                        <div className="detail-item">
                            <label>ĐỊA CHỈ</label>
                            <p><strong>{data.customerInfo?.DiaChi || 'Chưa cập nhật'}</strong></p>
                        </div>
                    </div>
                </div>

                {/* TRẠNG THÁI */}
                <div className="info-card status-filter-card">
                    <h3 className="card-title-medium">Trạng thái tài khoản</h3>
                    <div className="status-edit-row">
                        <div className="status-editor">
                            <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
                                <option value="1">Hoạt động</option>
                                <option value="0">Bị chặn</option>
                            </select>
                            <button className="btn-status-update" onClick={handleUpdateStatus} disabled={isSaving}>
                                {isSaving ? 'Đang lưu...' : 'Cập nhật'}
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* LỊCH SỬ & HẠNG */}
                <div className="analytics-bottom-grid">
                    <div className="info-card history-card">
                        <h3 className="card-title-medium">Lịch sử mua hàng</h3>
                        <div className="order-list-vertical">
                            {data.orderHistory?.length > 0 ? (
                                data.orderHistory.map(order => (
                                    <div key={order.MaDH} className="order-item-rect">
                                        <div className="order-left">
                                            <span className="cart-icon">🛒</span>
                                            <span className="order-code"><strong>#HM-DH{order.MaDH}</strong></span>
                                        </div>
                                        <strong className="order-price">
                                            {Number(order.TongTien).toLocaleString('vi-VN')}đ
                                        </strong>
                                    </div>
                                ))
                            ) : (
                                <p className="no-order" style={{color: '#7f8c8d'}}>Chưa có đơn hàng nào.</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="info-card membership-rank-card">
                        <label>HẠNG THÀNH VIÊN</label>
                        <h2 className="rank-name-large">Hạng {data.membership?.rankName || 'Đồng'}</h2>
                        <div className="rank-stats">
                            <p>Tổng chi tiêu: <strong>{Number(data.membership?.totalSpent || 0).toLocaleString('vi-VN')}đ</strong></p>
                            <p>Số đơn: <strong>{data.membership?.totalOrders || 0}</strong></p>
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default CustomerDetail;