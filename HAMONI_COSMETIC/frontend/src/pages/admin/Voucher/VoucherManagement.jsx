import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { ToastContainer, toast } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css';

import './VoucherManagement.css';
import axiosClient from "../../../services/axiosClient"; 

const VoucherManagement = () => {
    const navigate = useNavigate(); 

    // 1. STATE QUẢN LÝ DỮ LIỆU
    const [vouchers, setVouchers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // State cho Custom Dropdown Filter
    const [filterStatus, setFilterStatus] = useState('All'); 
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const filterRef = useRef(null); // Dùng để bắt sự kiện click ra ngoài menu

    const [newVoucher, setNewVoucher] = useState({
        MaVoucher: '',
        LoaiGiamGia: 'PhanTram',
        GiaTriGiam: '',
        DonHangToiThieu: '',
        SoLuongToiDa: '',
        NgayBatDau: '',
        NgayKetThuc: ''
    });

    // Bắt sự kiện click ra ngoài để đóng menu filter
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 2. GỌI API LẤY DỮ LIỆU
    const fetchVouchers = async () => {
        setIsLoading(true);
        try {
            const response = await axiosClient.get('vouchers');
            setVouchers(response || []);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu Voucher:", error);
            toast.error("Lỗi khi tải danh sách Voucher từ máy chủ!");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers(); 
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    const getVoucherStatus = (voucher) => {
        const rawSoLuongToiDa = voucher.SoLuong ?? voucher.SoLuongToiDa;
        const rawSoLuongDaDung = voucher.SoLuongDaDung;
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

        if (voucher.TrangThai === 'TamDung') return 'TamDung';
        if (voucher.TrangThai === 'HetHan') return 'HetHan';
        const now = new Date();
        const startDate = new Date(voucher.NgayBatDau);
        const endDate = new Date(voucher.NgayKetThuc);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 'TamDung';
        if (now < startDate) return 'TamDung'; 
        if (now > endDate) return 'HetHan';    
        return 'KichHoat';                     
    };

    const getVoucherQuantity = (voucher) => {
        const soLuongPhatHanh = Number(voucher.SoLuong ?? voucher.SoLuongToiDa ?? 0);
        const soLuongDaDung = Number(voucher.SoLuongDaDung ?? 0);

        const issued = Number.isFinite(soLuongPhatHanh) ? soLuongPhatHanh : 0;
        const used = Number.isFinite(soLuongDaDung) ? soLuongDaDung : 0;
        const remaining = Math.max(issued - used, 0);

        return { issued, used, remaining };
    };

    // 3. CÁC HÀM XỬ LÝ SỰ KIỆN
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewVoucher(prev => ({ ...prev, [name]: value }));
    };

    const handleAddVoucher = async (e) => {
        e.preventDefault();
        // === VALIDATE DỮ LIỆU BẮT BUỘC ===
        if (!newVoucher.MaVoucher?.trim()) {
            toast.warning("Vui lòng nhập mã voucher!");
            return;
        }

        if (!newVoucher.GiaTriGiam || Number(newVoucher.GiaTriGiam) <= 0) {
            toast.warning("Giá trị giảm phải lớn hơn 0!");
            return;
        }

        if (newVoucher.LoaiGiamGia === 'PhanTram' && Number(newVoucher.GiaTriGiam) > 100) {
            toast.warning("Giảm theo % không được vượt quá 100%!");
            return;
        }

        if (!newVoucher.SoLuongToiDa || Number(newVoucher.SoLuongToiDa) <= 0) {
            toast.warning("Số lượng tối đa phải lớn hơn 0!");
            return;
        }

        if (!newVoucher.NgayBatDau || !newVoucher.NgayKetThuc) {
            toast.warning("Vui lòng chọn ngày bắt đầu và kết thúc!");
            return;
        }

        // === VALIDATE LOGIC NGÀY ===
        const startDate = new Date(newVoucher.NgayBatDau);
        const endDate = new Date(newVoucher.NgayKetThuc);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            toast.error("Định dạng ngày không hợp lệ!");
            return;
        }

        if (endDate <= startDate) {
            toast.error("Ngày kết thúc phải sau ngày bắt đầu!");
            return;
        }

        // === VALIDATE ĐƠNHÀNG TỐI THIỂU ===
        const donHangToiThieu = Number(newVoucher.DonHangToiThieu) || 0;
        if (donHangToiThieu < 0) {
            toast.warning("Đơn hàng tối thiểu không được âm!");
            return;
        }

        try {
            const payload = {
                MaVoucher: newVoucher.MaVoucher.toUpperCase().trim(),
                LoaiGiamGia: newVoucher.LoaiGiamGia,
                GiaTriGiam: Number(newVoucher.GiaTriGiam),
                DonHangToiThieu: donHangToiThieu,
                SoLuongToiDa: Number(newVoucher.SoLuongToiDa),
                NgayBatDau: newVoucher.NgayBatDau,
                NgayKetThuc: newVoucher.NgayKetThuc
            };
            await axiosClient.post('vouchers', payload);
            toast.success("Đã thêm Voucher thành công vào hệ thống!");
            setNewVoucher({ MaVoucher: '', LoaiGiamGia: 'PhanTram', GiaTriGiam: '', DonHangToiThieu: '', SoLuongToiDa: '', NgayBatDau: '', NgayKetThuc: '' });
            fetchVouchers(); 
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(`Lỗi: ${error.response.data.message}`);
            } else {
                toast.error("Có lỗi xảy ra khi lưu Voucher!");
            }
        }
    };

    // Hàm chọn filter và đóng menu
    const selectFilter = (status) => {
        setFilterStatus(status);
        setIsFilterOpen(false);
    };

    const filteredVouchers = vouchers.filter(v => {
        if (filterStatus === 'All') return true;
        return getVoucherStatus(v) === filterStatus;
    });

   // const now = new Date();
    const stats = {
        total: vouchers.length,
        active: vouchers.filter(v => getVoucherStatus(v) === 'KichHoat').length,
        expired: vouchers.filter(v => getVoucherStatus(v) === 'HetHan').length
    };

    if (isLoading) return <div className="loading-container">Đang tải dữ liệu...</div>;

    return (
        <div className="voucher-dashboard">
            <h1 className="page-title">QUẢN LÝ VOUCHER</h1>

            <div className="voucher-stats-grid">
                <div className="voucher-stat-card">
                    <div className="voucher-stat-icon">🎟️</div>
                    <div className="voucher-stat-info"><p className="voucher-stat-label">Tổng Voucher</p><h2 className="voucher-stat-value">{stats.total}</h2></div>
                </div>
                <div className="voucher-stat-card">
                    <div className="voucher-stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>✅</div>
                    <div className="voucher-stat-info"><p className="voucher-stat-label">Đang hoạt động</p><h2 className="voucher-stat-value">{stats.active}</h2></div>
                </div>
                <div className="voucher-stat-card">
                    <div className="voucher-stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>⚠️</div>
                    <div className="voucher-stat-info"><p className="voucher-stat-label">Đã hết hạn</p><h2 className="voucher-stat-value voucher-text-red">{stats.expired}</h2></div>
                </div>
            </div>

            <div className="voucher-content-grid">
                <div className="form-section">
                    <h3>➕ Tạo Voucher Mới</h3>
                    <form onSubmit={handleAddVoucher} className="voucher-form">
                        <div className="form-group"><label>Mã Voucher *</label><input type="text" name="MaVoucher" value={newVoucher.MaVoucher} onChange={handleInputChange} placeholder="VD: SUMMER26" /></div>
                        <div className="form-group">
                            <label>Loại giảm giá</label>
                            <select name="LoaiGiamGia" value={newVoucher.LoaiGiamGia} onChange={handleInputChange}>
                                <option value="PhanTram">Phần trăm (%)</option>
                                <option value="SoTien">Số tiền (VNĐ)</option>
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}><label>Giá trị giảm *</label><input type="number" name="GiaTriGiam" value={newVoucher.GiaTriGiam} onChange={handleInputChange} /></div>
                            <div style={{ flex: 1 }}><label>SL phát hành *</label><input type="number" name="SoLuongToiDa" value={newVoucher.SoLuongToiDa} onChange={handleInputChange} /></div>
                        </div>
                        <div className="form-group"><label>Đơn tối thiểu (VNĐ)</label><input type="number" name="DonHangToiThieu" value={newVoucher.DonHangToiThieu} onChange={handleInputChange} /></div>
                        <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}><label>Ngày bắt đầu *</label><input type="date" name="NgayBatDau" value={newVoucher.NgayBatDau} onChange={handleInputChange} /></div>
                            <div style={{ flex: 1 }}><label>Ngày kết thúc *</label><input type="date" name="NgayKetThuc" value={newVoucher.NgayKetThuc} onChange={handleInputChange} /></div>
                        </div>
                        <button type="submit" className="btn-submit">Tạo Mã Khuyến Mãi</button>
                    </form>
                </div>

                <div className="table-section">
                    <h3 style={{ marginBottom: '15px' }}>📋 Danh Sách Khuyến Mãi</h3>
                    <table className="voucher-table">
                        <thead>
                            <tr>
                                <th>MÃ VOUCHER</th>
                                <th>ƯU ĐÃI</th>
                                <th>THỜI HẠN</th>
                                <th>SỐ LƯỢNG CÒN</th>
                                
                                {/* --- CUSTOM DROPDOWN TRẠNG THÁI --- */}
                                <th style={{ position: 'relative' }} ref={filterRef}>
                                    <div 
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '6px', 
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            color: filterStatus !== 'All' ? '#2563eb' : 'inherit' // Đổi màu xanh nếu đang có filter
                                        }}
                                        title="Bấm để lọc trạng thái"
                                    >
                                        TRẠNG THÁI
                                        <span style={{ fontSize: '0.7rem', transition: 'transform 0.2s', transform: isFilterOpen ? 'rotate(180deg)' : 'none' }}>
                                            ▼
                                        </span>
                                    </div>

                                    {/* MENU XỔ XUỐNG */}
                                    {isFilterOpen && (
                                        <div className="custom-filter-menu">
                                            <div className={`filter-item ${filterStatus === 'All' ? 'active' : ''}`} onClick={() => selectFilter('All')}>Tất cả</div>
                                            <div className={`filter-item ${filterStatus === 'KichHoat' ? 'active' : ''}`} onClick={() => selectFilter('KichHoat')}>Đang hoạt động</div>
                                            <div className={`filter-item ${filterStatus === 'TamDung' ? 'active' : ''}`} onClick={() => selectFilter('TamDung')}>Chưa diễn ra</div>
                                            <div className={`filter-item ${filterStatus === 'HetMa' ? 'active' : ''}`} onClick={() => selectFilter('HetMa')}>Hết mã</div>
                                            <div className={`filter-item ${filterStatus === 'HetHan' ? 'active' : ''}`} onClick={() => selectFilter('HetHan')}>Đã hết hạn</div>
                                        </div>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVouchers.map(v => {
                                const status = getVoucherStatus(v);
                                const quantity = getVoucherQuantity(v);
                                return (
                                    <tr 
                                        key={v.MaVoucher} 
                                        onClick={() => navigate(`/admin/vouchers/${encodeURIComponent(v.MaVoucher)}`)}
                                        className="clickable-row"
                                    >
                                        <td><strong>{v.MaVoucher}</strong></td>
                                        <td>
                                            {v.PhanTramGiam != null
                                                ? `Giảm ${Number(v.PhanTramGiam)}%${v.GiamToiDa != null ? `, tối đa ${Number(v.GiamToiDa).toLocaleString()}đ` : ''}`
                                                : `Giảm ${Number(v.SoTienGiam || 0).toLocaleString()}đ`}
                                            <br/><span className="sub-text">Đơn từ {Number(v.DonTaiThieu || 0).toLocaleString()}đ</span>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                                                {formatDate(v.NgayBatDau)} <br/> <span style={{ color: '#94a3b8' }}>đến</span> <br/> {formatDate(v.NgayKetThuc)}
                                            </span>
                                        </td>
                                        <td>
                                            <strong>{quantity.remaining.toLocaleString()}</strong>
                                            <br />
                                            <span className="sub-text">
                                                Đã dùng: {quantity.used.toLocaleString()} / Phát hành: {quantity.issued.toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${status}`}>
                                                {status === 'KichHoat'
                                                    ? 'Hoạt động'
                                                    : status === 'TamDung'
                                                        ? 'Chưa diễn ra'
                                                        : status === 'HetMa'
                                                            ? 'Hết mã'
                                                            : 'Hết hạn'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredVouchers.length === 0 && (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Không có mã giảm giá nào phù hợp với bộ lọc.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default VoucherManagement;