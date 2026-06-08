// src/pages/admin/Employee/EmployeeDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../../../services/axiosClient';
import { ArrowLeft, Save, User, Mail, Phone, ShieldCheck, CheckCircle, AlertCircle, ImageOff } from 'lucide-react';
import './EmployeeDetail.css';

const EmployeeDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        HoTen: '', Email: '', SoDienThoai: '', MaQuyen: '', TrangThai: 1, AvatarUrl: ''
    });
    
    const [loading, setLoading] = useState(true);
    const [alertConfig, setAlertConfig] = useState({ show: false, type: '', message: '' });
    const [avatarError, setAvatarError] = useState(false); // ← THÊM: theo dõi lỗi ảnh

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const res = await axiosClient.get(`/employees/${id}`);
                const data = res.data || res;
                setFormData({
                    HoTen: data.HoTen || '',
                    Email: data.Email || '',
                    SoDienThoai: data.SoDienThoai || '',
                    MaQuyen: data.MaQuyen || '',
                    TrangThai: data.TrangThai || 1,
                    AvatarUrl: data.AvatarUrl || ''
                });
                setAvatarError(false); // reset lỗi khi load data mới
                setLoading(false);
            } catch {
                setAlertConfig({ show: true, type: 'danger', message: "Không tìm thấy dữ liệu Employee!" });
                setLoading(false);
            }
        };
        fetchEmployee();
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        // Reset lỗi avatar khi người dùng nhập URL mới
        if (name === 'AvatarUrl') setAvatarError(false);
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setAlertConfig({ show: false, type: '', message: '' });
        try {
            await axiosClient.put(`/employees/${id}`, formData);
            setAlertConfig({ show: true, type: 'success', message: "Cập nhật thông tin Employee thành công!" });
            setTimeout(() => setAlertConfig({ show: false, type: '', message: '' }), 3000);
        } catch {
            setAlertConfig({ show: true, type: 'danger', message: "Lỗi! Không thể cập nhật dữ liệu. Vui lòng thử lại." });
        }
    };

    // ← THÊM: component avatar tái sử dụng, xử lý cả lỗi load ảnh
    const AvatarDisplay = ({ size = 120, fontSize = 48 }) => {
        const hasValidUrl = formData.AvatarUrl && formData.AvatarUrl.trim() !== '' && !avatarError;

        if (hasValidUrl) {
            return (
                <img
                    src={formData.AvatarUrl}
                    alt={formData.HoTen}
                    className="avatar-large mx-auto mb-4"
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        objectFit: 'cover',
                        borderRadius: '50%',
                        border: '3px solid #e9efff',
                        boxShadow: '0 8px 20px rgba(0, 51, 153, 0.15)'
                    }}
                    onError={() => setAvatarError(true)} // ← fallback khi link lỗi
                />
            );
        }

        // Fallback: chữ cái đầu hoặc icon nếu chưa có tên
        return (
            <div
                className="avatar-large mx-auto mb-4"
                style={{ width: `${size}px`, height: `${size}px`, fontSize: `${fontSize}px` }}
            >
                {formData.HoTen?.charAt(0).toUpperCase() || <ImageOff size={40} />}
            </div>
        );
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
                <button className="btn-back-detail" onClick={() => navigate('/admin/employee')}>
                    <ArrowLeft size={20} /> Quay lại danh sách
                </button>
                <h1 className="title mb-0">HỒ SƠ NHÂN VIÊN</h1>
            </div>

            {alertConfig.show && (
                <div className={`alert alert-${alertConfig.type} d-flex align-items-center shadow-sm mb-4`} role="alert">
                    {alertConfig.type === 'success' ? <CheckCircle className="me-2" size={20} /> : <AlertCircle className="me-2" size={20} />}
                    <div className="fw-medium">{alertConfig.message}</div>
                </div>
            )}

            <div className="row g-4">
                {/* CỘT TRÁI: THẺ PROFILE */}
                <div className="col-xl-4 col-lg-5">
                    <div className="card shadow-sm border-0 rounded-4 h-100 profile-summary-card">
                        <div className="card-body text-center p-5">
                            
                            {/* ← SỬA: dùng component AvatarDisplay */}
                            <AvatarDisplay size={120} fontSize={48} />

                            <h3 className="fw-bold text-dark mb-1">{formData.HoTen}</h3>
                            <p className="text-muted mb-4">Mã số: <strong>NV-{id}</strong></p>
                            
                            <div className="d-flex justify-content-center gap-2 mb-4">
                                <span className={`badge-custom ${formData.MaQuyen === 'ADMIN' ? 'badge-admin' : 'badge-staff'}`}>
                                    {formData.MaQuyen === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'NHÂN VIÊN'}
                                </span>
                                <span className={`badge-custom ${String(formData.TrangThai) === '1' ? 'badge-active' : 'badge-offline'}`}>
                                    {String(formData.TrangThai) === '1' ? 'Đang hoạt động' : 'Ngoại tuyến'}
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

                {/* CỘT PHẢI: FORM */}
                <div className="col-xl-8 col-lg-7">
                    <div className="card shadow-sm border-0 rounded-4 h-100">
                        <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 px-md-5">
                            <h4 className="fw-bold text-primary m-0">Chỉnh sửa thông tin</h4>
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

                                    <div className="col-md-6">
                                        <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
                                            <ShieldCheck size={18} /> Vai trò hệ thống
                                        </label>
                                        <select className="form-select form-select-lg bg-light" name="MaQuyen" value={formData.MaQuyen || 'STAFF'} onChange={handleInputChange}>
                                            <option value="STAFF">NHÂN VIÊN</option>
                                            <option value="ADMIN">QUẢN TRỊ VIÊN</option>
                                        </select>
                                    </div>

                                    {/* ← SỬA: ô nhập URL avatar có preview live */}
                                    <div className="col-12">
                                        <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
                                            Avatar (URL ảnh)
                                        </label>
                                        <div className="d-flex align-items-center gap-3">
                                            {/* Preview nhỏ ngay cạnh ô input */}
                                            <div className="avatar-preview-small flex-shrink-0">
                                                {formData.AvatarUrl && !avatarError ? (
                                                    <img
                                                        src={formData.AvatarUrl}
                                                        alt="preview"
                                                        className="avatar-preview-img"
                                                        onError={() => setAvatarError(true)}
                                                    />
                                                ) : (
                                                    <div className="avatar-preview-fallback">
                                                        {formData.HoTen?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                className="form-control form-control-lg bg-light"
                                                name="AvatarUrl"
                                                placeholder="https://example.com/avatar.jpg"
                                                value={formData.AvatarUrl || ''}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <small className="text-muted mt-1 d-block">
                                            {avatarError
                                                ? '⚠️ Link ảnh không hợp lệ hoặc không load được. Vui lòng kiểm tra lại.'
                                                : 'Dán đường link ảnh avatar — xem preview ngay bên trái'}
                                        </small>
                                    </div>

                                    <div className="col-12 mt-4">
                                        <label className="form-label text-secondary fw-semibold mb-3">Trạng thái tài khoản</label>
                                        <div className="d-flex gap-4 p-3 bg-light rounded-3 border">
                                            <div className="form-check">
                                                <input className="form-check-input" type="radio" name="TrangThai" id="active" value="1" checked={String(formData.TrangThai) === '1'} onChange={handleInputChange} />
                                                <label className="form-check-label text-success fw-bold" htmlFor="active">Đang hoạt động</label>
                                            </div>
                                            <div className="form-check">
                                                <input className="form-check-input" type="radio" name="TrangThai" id="inactive" value="0" checked={String(formData.TrangThai) === '0'} onChange={handleInputChange} />
                                                <label className="form-check-label text-secondary fw-bold" htmlFor="inactive">Ngoại tuyến (Bị khóa)</label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <hr className="my-5 text-muted opacity-25" />

                                <div className="d-flex justify-content-end gap-3">
                                    <button type="button" className="btn btn-light border px-4 py-2 fw-semibold btn-cancel-custom" onClick={() => navigate('/admin/employee')}>
                                        Hủy bỏ
                                    </button>
                                    <button type="submit" className="btn custom-btn-primary px-4 py-2 fw-bold d-flex align-items-center gap-2">
                                        <Save size={18} /> Cập nhật thông tin
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDetail;