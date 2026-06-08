import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from "../../../services/axiosClient"; 
import './PromotionManagement.css'; 

const PromotionManagement = () => {
    const navigate = useNavigate();
    const [promotions, setPromotions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State quản lý bộ lọc
    const [filterStatus, setFilterStatus] = useState('all');
    // State quản lý việc mở/đóng menu Dropdown ở cột Trạng thái
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        setIsLoading(true);
        try {
            const res = await axiosClient.get('promotions');
            setPromotions(res || []);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPromoStatusValue = (startDate, endDate) => {
        const now = new Date();
        if (now < new Date(startDate)) return 'upcoming'; 
        if (now > new Date(endDate)) return 'ended';      
        return 'active';                                  
    };

    const renderStatusBadge = (statusValue) => {
        switch(statusValue) {
            case 'upcoming': return <span className="status-badge upcoming">Chưa diễn ra</span>;
            case 'ended': return <span className="status-badge ended">Đã hết hạn</span>;
            case 'active': return <span className="status-badge active">Đang hoạt động</span>;
            default: return null;
        }
    };

    const filteredPromotions = promotions.filter(p => {
        if (filterStatus === 'all') return true;
        const currentStatus = getPromoStatusValue(p.NgayBatDau, p.NgayKetThuc);
        return currentStatus === filterStatus;
    });

    // Hàm chọn trạng thái từ Dropdown
    const handleSelectStatus = (e, status) => {
        e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài làm đóng menu sai cách
        setFilterStatus(status);
        setIsStatusDropdownOpen(false);
    };

    return (
        <div className="promo-dashboard">
            <div className="page-header">
                <h1 className="page-title">QUẢN LÝ CHƯƠNG TRÌNH SALE</h1>
                <button className="btn-add-new" onClick={() => navigate('/admin/promotions/create')}>
                    + Tạo Khuyến Mãi Mới
                </button>
            </div>

            <div className="table-section full-width">
                <table className="promo-table">
                    <thead>
                        <tr>
                            <th>TÊN CHƯƠNG TRÌNH</th>
                            <th>MỨC GIẢM</th>
                            <th>THỜI GIAN</th>
                            
                            {/* CỘT TRẠNG THÁI CÓ TÍCH HỢP DROPDOWN LỌC */}
                            <th 
                                className="th-status" 
                                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            >
                                TRẠNG THÁI <span className="sort-icon">{isStatusDropdownOpen ? '▲' : '▼'}</span>
                                
                                {/* Overlay tàng hình để click ra ngoài là đóng menu */}
                                {isStatusDropdownOpen && (
                                    <div className="dropdown-overlay" onClick={(e) => { e.stopPropagation(); setIsStatusDropdownOpen(false); }}></div>
                                )}

                                {/* Menu Dropdown */}
                                {isStatusDropdownOpen && (
                                    <div className="status-dropdown-menu">
                                        <div 
                                            className={`status-dropdown-item ${filterStatus === 'all' ? 'active' : ''}`}
                                            onClick={(e) => handleSelectStatus(e, 'all')}
                                        >
                                            Tất cả
                                        </div>
                                        <div 
                                            className={`status-dropdown-item ${filterStatus === 'active' ? 'active' : ''}`}
                                            onClick={(e) => handleSelectStatus(e, 'active')}
                                        >
                                            Đang hoạt động
                                        </div>
                                        <div 
                                            className={`status-dropdown-item ${filterStatus === 'upcoming' ? 'active' : ''}`}
                                            onClick={(e) => handleSelectStatus(e, 'upcoming')}
                                        >
                                            Chưa diễn ra
                                        </div>
                                        <div 
                                            className={`status-dropdown-item ${filterStatus === 'ended' ? 'active' : ''}`}
                                            onClick={(e) => handleSelectStatus(e, 'ended')}
                                        >
                                            Đã hết hạn
                                        </div>
                                    </div>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPromotions.map(p => {
                            const statusValue = getPromoStatusValue(p.NgayBatDau, p.NgayKetThuc);
                            return (
                                <tr 
                                    key={p.MaCTKM} 
                                    onClick={() => navigate(`/admin/promotions/${p.MaCTKM}`)}
                                    className="clickable-row"
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>
                                        <strong style={{ color: '#1e293b' }}>{p.TenCTKM}</strong>
                                        {/* <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>Xem chi tiết →</div> */}
                                    </td>
                                    <td className="fw-bold" style={{ color: '#e11d48' }}>
                                        {p.LoaiGiamGia === 'PhanTram' ? `-${Number(p.GiaTriGiam)}%` : `-${Number(p.GiaTriGiam).toLocaleString()}đ`}
                                    </td>
                                    <td className="time-col">
                                        Bắt đầu: {new Date(p.NgayBatDau).toLocaleString('vi-VN')} <br/>
                                        Kết thúc: {new Date(p.NgayKetThuc).toLocaleString('vi-VN')}
                                    </td>
                                    <td>{renderStatusBadge(statusValue)}</td>
                                </tr>
                            );
                        })}
                        {filteredPromotions.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan="4" className="empty-state">
                                    Không tìm thấy chương trình khuyến mãi nào phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PromotionManagement;