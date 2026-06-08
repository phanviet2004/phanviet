// src/pages/admin/Employee/EmployeeForm.jsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosClient from '../../../services/axiosClient';

const EmployeeForm = ({ isOpen, onClose, onSuccess }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State quản lý dữ liệu nhập vào
    const [formData, setFormData] = useState({
        HoTen: '', Email: '', SoDienThoai: '', MaQuyen: 'STAFF', MatKhau: '', AvatarUrl: ''
    });

    if (!isOpen) return null;

    // Xử lý khi gõ phím
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Hàm kiểm tra tính hợp lệ của dữ liệu (Validation)
    const validateForm = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;

        if (formData.HoTen.trim().length < 3) return "Tên nhân viên phải có ít nhất 3 ký tự!";
        if (!emailRegex.test(formData.Email)) return "Định dạng Email không hợp lệ!";
        if (!phoneRegex.test(formData.SoDienThoai)) return "Số điện thoại không hợp lệ (Phải là số Việt Nam 10 chữ số)!";
        if (formData.MatKhau.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự!";
        return null; // Không có lỗi
    };

    // Gửi dữ liệu lên API
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Chạy Validation
        const errorMessage = validateForm();
        if (errorMessage) {
            toast.error(errorMessage);
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosClient.post('/employees', formData);
            toast.success('Thêm nhân viên thành công!');
            
            setTimeout(() => {
                setFormData({ HoTen: '', Email: '', SoDienThoai: '', MaQuyen: 'STAFF', MatKhau: '', AvatarUrl: '' });
                setIsSubmitting(false);
                onSuccess(); 
            }, 1500);

        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi kết nối máy chủ, vui lòng thử lại!");
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div 
            className="position-fixed top-0 inset-s-0 w-100 h-100 d-flex justify-content-center align-items-center" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
        >
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '100%', maxWidth: '600px' }}>
                <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">
                    <h5 className="fw-bold m-0" style={{ color: '#003399' }}>THÊM NHÂN VIÊN MỚI</h5>
                    <X style={{ cursor: 'pointer', color: '#777' }} onClick={() => !isSubmitting && onClose()} />
                </div>

                <div className="card-body px-4 pb-4">
                    <form onSubmit={handleSubmit}>
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '13px' }}>Họ và Tên <span className="text-danger">*</span></label>
                                <input type="text" name="HoTen" value={formData.HoTen} onChange={handleChange} className="form-control bg-light" required placeholder="Nhập tên nhân viên..." disabled={isSubmitting} />
                            </div>
                            
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '13px' }}>Địa chỉ Email <span className="text-danger">*</span></label>
                                <input type="email" name="Email" value={formData.Email} onChange={handleChange} className="form-control bg-light" required placeholder="Nhập email..." disabled={isSubmitting} />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '13px' }}>Số điện thoại <span className="text-danger">*</span></label>
                                <input type="text" name="SoDienThoai" value={formData.SoDienThoai} onChange={handleChange} className="form-control bg-light" required placeholder="Ví dụ: 0912345678" disabled={isSubmitting} />
                            </div>

                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '13px' }}>Vai trò hệ thống <span className="text-danger">*</span></label>
                                <select name="MaQuyen" value={formData.MaQuyen} onChange={handleChange} className="form-select bg-light" disabled={isSubmitting}>
                                    <option value="STAFF">NHÂN VIÊN</option>
                                    <option value="ADMIN">QUẢN LÝ</option>
                                </select>
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '13px' }}>Avatar (URL ảnh)</label>
                                <input type="text" name="AvatarUrl" value={formData.AvatarUrl} onChange={handleChange} className="form-control bg-light" placeholder="https://example.com/avatar.jpg" disabled={isSubmitting} />
                                <small className="text-muted">Tùy chọn - Dán đường link ảnh avatar</small>
                            </div>

                            <div className="col-12">
                                <label className="form-label fw-bold text-secondary" style={{ fontSize: '13px' }}>Mật khẩu đăng nhập <span className="text-danger">*</span></label>
                                <input type="password" name="MatKhau" value={formData.MatKhau} onChange={handleChange} className="form-control bg-light" required placeholder="Ít nhất 6 ký tự..." disabled={isSubmitting} />
                            </div>
                        </div>

                        <div className="d-flex gap-3 justify-content-end border-top pt-3">
                            <button type="button" className="btn btn-light border px-4 fw-semibold" onClick={onClose} disabled={isSubmitting}>
                                Hủy bỏ
                            </button>
                            <button type="submit" className="btn px-4 text-white shadow-sm fw-bold d-flex align-items-center gap-2" style={{ backgroundColor: '#003399' }} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : "Thêm mới"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EmployeeForm;