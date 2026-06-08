// src/pages/admin/Profile/Profile.jsx
import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosClient from '../../../services/axiosClient';
import authApi from '../../../services/authApi';
import { Save, User, Mail, Phone, ShieldCheck, CheckCircle, AlertCircle, Key } from 'lucide-react';
import './Profile.css'; 

const Profile = () => {
    const [formData, setFormData] = useState({
        MaND: '', HoTen: '', Email: '', SoDienThoai: '', MaQuyen: '', TrangThai: 1
    });
    
    const [loading, setLoading] = useState(true);
    const [alertConfig, setAlertConfig] = useState({ show: false, type: '', message: '' });

    // Lấy thông tin người dùng đang đăng nhập
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await authApi.getCurrentUser();
                const user = response?.user || {};
                setFormData({
                    MaND: user.id || '',
                    HoTen: user.hoTen || '',
                    Email: user.email || '',
                    SoDienThoai: user.soDienThoai || '',
                    MaQuyen: user.maQuyen || '',
                    TrangThai: 1
                });
                setLoading(false);
            } catch {
                setAlertConfig({ show: true, type: 'danger', message: "Không thể tải hồ sơ cá nhân!" });
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setAlertConfig({ show: false, type: '', message: '' }); 
        
        try {
            await axiosClient.put('/auth/profile', {
                HoTen: formData.HoTen,
                Email: formData.Email,
                SoDienThoai: formData.SoDienThoai
            });
            
            const currentUserInfo = JSON.parse(localStorage.getItem('user_info')) || {};
            localStorage.setItem('user_info', JSON.stringify({ ...currentUserInfo, hoTen: formData.HoTen }));

            setAlertConfig({ show: true, type: 'success', message: "Cập nhật hồ sơ thành công!" });
            setTimeout(() => setAlertConfig({ show: false, type: '', message: '' }), 3000);
        } catch (error) {
            const errorMsg = error?.response?.data?.message || "Lỗi! Không thể cập nhật dữ liệu.";
            console.error("Lỗi cập nhật profile:", errorMsg);
            setAlertConfig({ show: true, type: 'danger', message: errorMsg });
        }
    };
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="title mb-0" style={{ fontSize: '26px' }}>HỒ SƠ CÁ NHÂN</h1>
            </div>

            {/* THÔNG BÁO ALERT */}
            {alertConfig.show && (
                <div className={`alert alert-${alertConfig.type} d-flex align-items-center shadow-sm mb-4`} role="alert">
                    {alertConfig.type === 'success' ? <CheckCircle className="me-2" size={20} /> : <AlertCircle className="me-2" size={20} />}
                    <div className="fw-medium">{alertConfig.message}</div>
                </div>
            )}

            <div className="row g-4">
                {/* CỘT TRÁI: THẺ PROFILE SUMMARY */}
                <div className="col-xl-4 col-lg-5">
                    <div className="card shadow-sm border-0 rounded-4 h-100 profile-summary-card">
                        <div className="card-body text-center p-5">
                            <div className="avatar-large mx-auto mb-4">
                                {formData.HoTen?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <h3 className="fw-bold text-dark mb-1">{formData.HoTen}</h3>
                            <p className="text-muted mb-4">Mã số: <strong>NV-{formData.MaND}</strong></p>
                            
                            <div className="d-flex justify-content-center gap-2 mb-4">
                                <span className={`badge-custom ${formData.MaQuyen === 'ADMIN' ? 'badge-admin' : 'badge-staff'}`}>
                                    {formData.MaQuyen === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN'}
                                </span>
                                <span className="badge-custom badge-active">
                                    Đang hoạt động
                                </span>
                            </div>
                            
                            <hr className="text-muted opacity-25" />
                            <div className="text-start mt-4">
                                <div className="mb-3 d-flex align-items-center gap-3 text-secondary">
                                    <Mail size={18} /> <span>{formData.Email || 'Chưa cập nhật'}</span>
                                </div>
                                <div className="d-flex align-items-center gap-3 text-secondary">
                                    <Phone size={18} /> <span>{formData.SoDienThoai || 'Chưa cập nhật'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: FORM CHỈNH SỬA THÔNG TIN */}
                <div className="col-xl-8 col-lg-7">
                    <div className="card shadow-sm border-0 rounded-4 h-100">
                        <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 px-md-5">
                            <h4 className="fw-bold text-primary m-0">Cập nhật thông tin</h4>
                        </div>

                        <div className="card-body px-4 px-md-5 pb-5">
                            <form onSubmit={handleUpdate} className="mt-3">
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
                                            <User size={18} /> Họ và Tên
                                        </label>
                                        <input type="text" className="form-control form-control-lg bg-light" name="HoTen" value={formData.HoTen || ''} onChange={handleInputChange} required />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
                                            <Mail size={18} /> Địa chỉ Email
                                        </label>
                                        <input type="email" className="form-control form-control-lg bg-light" name="Email" value={formData.Email || ''} onChange={handleInputChange} required />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
                                            <Phone size={18} /> Số điện thoại
                                        </label>
                                        <input type="text" className="form-control form-control-lg bg-light" name="SoDienThoai" value={formData.SoDienThoai || ''} onChange={handleInputChange} />
                                    </div>

                                    {/* Khóa quyền: Thuộc tính disabled ngăn chặn việc sửa đổi */}
                                    <div className="col-md-6">
                                        <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
                                            <ShieldCheck size={18} /> Vai trò hệ thống
                                        </label>
                                        <input 
                                            type="text" 
                                            className="form-control form-control-lg text-muted" 
                                            value={formData.MaQuyen === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN'} 
                                            disabled 
                                            style={{ backgroundColor: '#e9ecef', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                </div>

                                <hr className="my-5 text-muted opacity-25" />

                                {/* Các nút bấm */}
                                <div className="d-flex justify-content-between align-items-center">
                                    <button type="button" className="btn btn-outline-secondary fw-semibold d-flex align-items-center gap-2 px-4 py-2" onClick={() => toast.info("Tính năng đổi mật khẩu đang phát triển!")}>
                                        <Key size={18} /> Đổi mật khẩu
                                    </button>
                                    
                                    <button type="submit" className="btn custom-btn-primary px-4 py-2 fw-bold d-flex align-items-center gap-2">
                                        <Save size={18} /> Lưu thay đổi
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default Profile;