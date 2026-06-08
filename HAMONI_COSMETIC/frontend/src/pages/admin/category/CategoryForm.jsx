// src/pages/admin/category/CategoryForm.jsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import axios from 'axios';
import { categoryApi } from '../../../services/categoryApi';

const CategoryForm = ({ isOpen, onClose, editingId, initialData, onSuccess }) => {
    // State quản lý thông báo Bootstrap
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [preview, setPreview] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [formValues, setFormValues] = useState({
        MaDM: '',
        TenDM: ''
    });

    useEffect(() => {
        if (isOpen) {
            const initialPreview = initialData?.DuongDanAnh || '';

            if (preview !== initialPreview) {
                setPreview(initialPreview);
            }

            setFormValues({
                MaDM: initialData?.MaDM || '',
                TenDM: initialData?.TenDM || ''
            });
            setSelectedFile(null);
            setErrors({});
            setAlert({ show: false, type: '', message: '' });
        }

        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData?.DuongDanAnh, isOpen]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};

        if (!formValues.MaDM || formValues.MaDM.trim() === '') {
            newErrors.MaDM = 'Vui lòng nhập mã danh mục';
        }

        if (!formValues.TenDM || formValues.TenDM.trim() === '') {
            newErrors.TenDM = 'Vui lòng nhập tên danh mục';
        }

        if (!selectedFile && !preview) {
            newErrors.image = 'Vui lòng chọn hình ảnh cho danh mục';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }

        setSelectedFile(file);
        setPreview(URL.createObjectURL(file));

        if (errors.image) {
            setErrors({ ...errors, image: null });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setAlert({ show: false, type: '', message: '' });

        try {
            let imageUrl = preview;

            if (selectedFile) {
                const uploadData = new FormData();
                uploadData.append('image', selectedFile);

                const uploadRes = await axios.post('http://localhost:5000/api/upload', uploadData);
                imageUrl = uploadRes.data.url;
            }

            const formData = {
                MaDM: formValues.MaDM.trim().toUpperCase(),
                TenDM: formValues.TenDM.trim(),
                DuongDanAnh: imageUrl
            };

            if (editingId) {
                await categoryApi.update(editingId, formData);
                setAlert({ show: true, type: 'success', message: 'Cập nhật danh mục thành công!' });
            } else {
                await categoryApi.create(formData);
                setAlert({ show: true, type: 'success', message: 'Thêm mới danh mục thành công!' });
            }
            
            // Chờ 1.5 giây để người dùng đọc thông báo rồi mới đóng form
            setTimeout(() => {
                onSuccess(); // Báo cho trang cha load lại dữ liệu & đóng form
                setAlert({ show: false, type: '', message: '' }); // Reset thông báo
            }, 1500);

        } catch (err) {
            setAlert({ 
                show: true, 
                type: 'danger', 
                message: err.response?.data?.message || "Thao tác thất bại. Vui lòng thử lại!" 
            });
        }
    };

// ... (Các phần import và logic giữ nguyên bên trên)

    return createPortal(
        <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050 }}
        >
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '100%', maxWidth: '450px' }}>
                
                <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">
                    <h5 className="fw-bold m-0" style={{ color: '#81802E' }}>
                        {editingId ? "CẬP NHẬT DANH MỤC" : "THÊM DANH MỤC MỚI"}
                    </h5>
                    <X style={{ cursor: 'pointer', color: '#777' }} onClick={onClose} />
                </div>

                <div className="card-body px-4 pb-4">
                    
                    {alert.show && (
                        <div className={`alert alert-${alert.type} d-flex align-items-center p-3 mb-4`} role="alert">
                            {alert.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <AlertCircle size={20} className="me-2" />}
                            <div className="fw-medium" style={{ fontSize: '15px' }}>{alert.message}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* THÊM KHỐI CUỘN TẠI ĐÂY */}
                        <div 
                            style={{ 
                                maxHeight: '60vh', // Giới hạn chiều cao là 60% màn hình
                                overflowY: 'auto', // Hiện thanh cuộn khi nội dung dài
                                overflowX: 'hidden',
                                paddingRight: '10px', // Khoảng cách để không bị đè vào thanh cuộn
                                marginBottom: '20px'
                            }}
                            className="custom-scrollbar" // Có thể thêm class để custom thanh cuộn cho đẹp
                        >
                            <div className="mb-3">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Mã danh mục</label>
                                <input 
                                    key={editingId ? initialData?.MaDM || editingId : 'new'}
                                    name="MaDM"
                                    type="text" 
                                    className={`form-control form-control-lg bg-light ${errors.MaDM ? 'is-invalid border-danger' : ''}`}
                                    style={{ fontSize: '15px' }}
                                    placeholder="Ví dụ: DM001"
                                    disabled={!!editingId}
                                    value={formValues.MaDM}
                                    onChange={(e) => {
                                        setFormValues({ ...formValues, MaDM: e.target.value.toUpperCase() });
                                        if (errors.MaDM) setErrors({ ...errors, MaDM: null });
                                    }}
                                />
                                {errors.MaDM && <div className="text-danger mt-1" style={{ fontSize: '13px' }}>{errors.MaDM}</div>}
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Tên danh mục</label>
                                <input 
                                    key={editingId ? `${initialData?.MaDM || editingId}-name` : 'new-name'}
                                    name="TenDM"
                                    type="text" 
                                    className={`form-control form-control-lg bg-light ${errors.TenDM ? 'is-invalid border-danger' : ''}`}
                                    style={{ fontSize: '15px' }}
                                    placeholder="Nhập tên danh mục..."
                                    value={formValues.TenDM}
                                    onChange={(e) => {
                                        setFormValues({ ...formValues, TenDM: e.target.value });
                                        if (errors.TenDM) setErrors({ ...errors, TenDM: null });
                                    }}
                                />
                                {errors.TenDM && <div className="text-danger mt-1" style={{ fontSize: '13px' }}>{errors.TenDM}</div>}
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                    Hình ảnh danh mục <span className="text-danger">*</span>
                                </label>
                                <div className="d-flex flex-column gap-2">
                                    <div className="input-group">
                                        <label
                                            className={`input-group-text bg-light ${errors.image ? 'border-danger' : 'border-0'}`}
                                            htmlFor="upload-category"
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <Upload size={18} className={errors.image ? 'text-danger' : ''} />
                                        </label>
                                        <input
                                            id="upload-category"
                                            type="file"
                                            className="d-none"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                        <div
                                            className={`form-control bg-light text-muted d-flex align-items-center ${errors.image ? 'is-invalid border-danger' : 'border-0'}`}
                                            onClick={() => document.getElementById('upload-category').click()}
                                            style={{ cursor: 'pointer', fontSize: '14px' }}
                                        >
                                            {selectedFile ? selectedFile.name : (preview ? 'Đã có ảnh (Click để thay đổi)' : 'Chọn ảnh vuông từ máy tính...')}
                                        </div>
                                    </div>

                                    {errors.image && <div className="text-danger" style={{ fontSize: '13px' }}>{errors.image}</div>}

                                    {preview && (
                                        <div
                                            className="rounded-3 border overflow-hidden bg-white d-flex justify-content-center align-items-center mx-auto mt-2"
                                            style={{ width: '100%', maxWidth: '260px', aspectRatio: '1 / 1' }}
                                        >
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* PHẦN NÚT BẤM CỐ ĐỊNH Ở DƯỚI */}
                        <div className="d-flex gap-3">
                            <button 
                                type="button" 
                                className="btn btn-light flex-grow-1 border fw-semibold" 
                                onClick={onClose}
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                type="submit" 
                                className="btn flex-grow-1 fw-bold text-white shadow-sm" 
                                style={{ backgroundColor: '#81802E' }}
                            >
                                {editingId ? "Lưu thay đổi" : "Thêm mới"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
};


export default CategoryForm;