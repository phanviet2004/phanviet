// src/pages/admin/Customer/CustomerManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosClient from '../../../services/axiosClient'; 
import { Search, Download } from 'lucide-react'; // Đổi sang dùng Lucide React cho đồng bộ
import './CustomerManagement.css'; 

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [status, setStatus] = useState('Tất cả trạng thái');
    const [search, setSearch] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const recordsPerPage = 5;

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

    const loadCustomers = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/customers`, {
                params: { search, status }
            });
            setCustomers(res); 
            setCurrentPage(1);
        } catch (err) {
            console.error("Lỗi tải danh sách khách hàng:", err);
            toast.error("Không thể tải danh sách khách hàng!");
            setCustomers([]); 
        }
    }, [search, status]);

    useEffect(() => {
        const initFetch = async () => {
            await loadCustomers();
        };
        initFetch();
    }, [loadCustomers]);

    // Reload dữ liệu khi quay lại trang quản lý (detection pathname change)
    useEffect(() => {
        // Chỉ gọi khi component mount hoặc quay lại trang này
        const handleReload = async () => {
            try {
                const res = await axiosClient.get(`/customers`, {
                    params: { search, status }
                });
                setCustomers(res); 
                setCurrentPage(1);
            } catch (err) {
                console.error("Lỗi tải danh sách khách hàng:", err);
            }
        };
        
        if (location.pathname === '/admin/customer') {
            handleReload();
        }
    }, [location.pathname, search, status]);

    const handleGoToDetail = (id) => {
        navigate(`/admin/customer-detail/${id}`);
    };

    // HÀM XUẤT EXCEL CHUẨN BẢO MẬT (Dùng axiosClient để tự động kèm Token)
    const handleExportExcel = async () => { 
        try {
            const response = await axiosClient.get('/customers/export', {
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'DanhSachKhachHang.xlsx');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Lỗi khi tải file Excel:", error);
            toast.error("Bạn không có quyền xuất file hoặc có lỗi xảy ra!");
        }
    };

    const safeCustomers = Array.isArray(customers) ? customers : [];
    
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRecords = safeCustomers.slice(firstIndex, lastIndex);
    const nPage = Math.ceil(safeCustomers.length / recordsPerPage);
    const numbers = [...Array(nPage + 1).keys()].slice(1);

    return (
        <div className="admin-container">
            <h1 className="title">QUẢN LÝ KHÁCH HÀNG</h1>
            <div className="toolbar">
                <div className="search-box-wrapper">
                    <Search className="search-icon-inner" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo Mã ID, Tên..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>  
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Bị chặn">Bị chặn</option>
                    </select>
                    <button className="download-btn" title="Xuất Excel" onClick={handleExportExcel}>
                        <Download size={20} />
                    </button>
                </div>
            </div>        
            <div className="table-card">
                <table className="customer-table">
                    <thead>
                        <tr>
                            <th>MÃ KH</th>
                            <th>TÊN KHÁCH HÀNG</th>
                            <th>LIÊN HỆ</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.length > 0 ? currentRecords.map((item) => (
                            <tr
                                key={item.MaND}
                                onClick={() => handleGoToDetail(item.MaND)}
                                style={{ cursor: 'pointer' }}
                            >
                                <td style={{ color: '#888' }}>#HM-{item.MaND}</td>
                                <td>
                                    <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {item.Avatar ? (
                                            <div className="avatar" style={{
                                                backgroundImage: `url(${item.Avatar})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}></div>
                                        ) : (
                                            <div className="avatar" style={{ backgroundColor: getAvatarBgColor(item.HoTen) }}>
                                                {getInitials(item.HoTen)}
                                            </div>
                                        )}
                                        <span style={{ fontWeight: '600' }}>{item.HoTen}</span>
                                    </div>
                                </td>
                                <td>
                                    <div>{item.Email}</div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>{item.SoDienThoai}</div>
                                </td>
                                <td>
                                    <span className={`status-badge ${item.TrangThai === 1 ? 'status-active' : 'status-banned'}`}>
                                        ● {item.TrangThai === 1 ? 'Hoạt động' : 'Bị chặn'}
                                    </span>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#7f8c8d' }}>
                                    Không tìm thấy dữ liệu khách hàng
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {nPage > 1 && (
                    <div className="pagination-container">
                        {numbers.map(n => (
                            <button key={n} onClick={() => setCurrentPage(n)} className={`page-number ${currentPage === n ? 'active' : ''}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default CustomerManagement;