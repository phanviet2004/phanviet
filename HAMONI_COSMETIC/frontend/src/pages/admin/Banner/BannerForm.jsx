import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { bannerApi } from '../../../services/bannerApi';
import axios from 'axios';

const BannerForm = ({ isOpen, onClose, data, onSuccess }) => {
    // 1. State Management
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [preview, setPreview] = useState(''); 
    const [selectedFile, setSelectedFile] = useState(null); 
    const [errors, setErrors] = useState({}); // THÊM: State quản lý lỗi
    const [allBanners, setAllBanners] = useState([]); // Lưu danh sách tất cả banner
    const [activePromotions, setActivePromotions] = useState([]); // Gợi ý: chương trình KM đang hoạt động

    const editingId = data?.MaBanner;
    
    const [formValues, setFormValues] = useState({
        TieuDe: '',
        URLDich: '',
        ViTriHienThi: 'TrangChu',
        ThuTuHienThi: 1,
        TrangThai: 'Active',
        NgayBatDau: '',
        NgayHetHan: ''
    });

    // 2. Fetch danh sách banner khi form mở
    useEffect(() => {
        if (isOpen) {
            const fetchBanners = async () => {
                try {
                    const res = await axios.get('http://localhost:5000/api/banners');
                    setAllBanners(res.data?.data || res.data || []);
                } catch (error) {
                    console.error('Lỗi tải danh sách banner:', error);
                }
            };
            fetchBanners();

            // Lấy danh sách khuyến mãi đang hoạt động để hiển thị dropdown gợi ý URL
            const fetchActivePromos = async () => {
                try {
                    // Gọi trực tiếp backend bằng URL đầy đủ để tránh phụ thuộc vào axiosClient.baseURL
                    const resp = await axios.get('http://localhost:5000/api/promotions/active');
                    console.debug('API /promotions/active returned:', resp.data || resp);
                    const list = Array.isArray(resp.data) ? resp.data : (Array.isArray(resp) ? resp : (resp?.data || []));
                    setActivePromotions(list);

                    // Nếu chỉ có 1 chương trình đang hoạt động và URL hiện tại rỗng, tự động điền
                    if (Array.isArray(list) && list.length === 1) {
                        setFormValues(prev => {
                            if (!prev.URLDich || prev.URLDich.trim() === '') {
                                return { ...prev, URLDich: `/khuyen-mai/${list[0].MaCTKM}` };
                            }
                            return prev;
                        });
                    }
                } catch (err) {
                    console.error('Lỗi tải khuyến mãi đang hoạt động:', err);
                    setActivePromotions([]);
                }
            };
            fetchActivePromos();
        }
    }, [isOpen]);

    // 3. Sync Data & Cleanup
    useEffect(() => {
        if (isOpen) {
            const initialPreview = data?.DuongDanAnh || '';
            
            if (preview !== initialPreview) {
                setPreview(initialPreview);
            }

            if (data) {
                setFormValues({
                    TieuDe: data.TieuDe || '',
                    URLDich: data.URLDich || '',
                    ViTriHienThi: data.ViTriHienThi || 'TrangChu',
                    ThuTuHienThi: normalizeOrderValue(data.ThuTuHienThi),
                    TrangThai: data.TrangThai || 'Active',
                    NgayBatDau: toDateInputValue(data.NgayBatDau),
                    NgayHetHan: toDateInputValue(data.NgayHetHan)
                });
            } else {
                // Reset form nếu là thêm mới
                setFormValues({
                    TieuDe: '',
                    URLDich: '',
                    ViTriHienThi: 'TrangChu',
                    ThuTuHienThi: 1,
                    TrangThai: 'Active',
                    NgayBatDau: '',
                    NgayHetHan: ''
                });
            }

            setSelectedFile(null);
            setAlert({ show: false, type: '', message: '' });
            setErrors({}); // Xóa hết lỗi cũ khi mở form
        }
        
        return () => {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.DuongDanAnh, isOpen]);

    if (!isOpen) return null;

    // Helper: Kiểm tra banner có đang hoạt động không
    const isActiveBanner = (banner) => {
        if (banner.TrangThai !== 'Active') return false;
        
        // Nếu có ngày hết hạn, kiểm tra xem đã hết hạn chưa
        if (banner.NgayHetHan) {
            const endDate = new Date(banner.NgayHetHan);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return endDate >= today;
        }
        
        return true; // Không có hạn => vẫn hoạt động
    };

    // 4. Hàm kiểm tra số thứ tự không trùng (chỉ với banner đang hoạt động)
    const checkDuplicateOrder = (orderValue) => {
        const normalizedValue = normalizeOrderValue(orderValue);
        // Chỉ kiểm tra xem số thứ tự này có banner **đang hoạt động** nào dùng không (trừ banner hiện tại)
        const isDuplicate = allBanners.some(
            banner => 
                banner.ThuTuHienThi === normalizedValue && 
                banner.MaBanner !== editingId && 
                isActiveBanner(banner)
        );
        return isDuplicate;
    };

    // 5. Hàm kiểm tra hợp lệ (Validation)
    const validateForm = () => {
        let newErrors = {};
        
        // Kiểm tra Tiêu đề
        if (!formValues.TieuDe || formValues.TieuDe.trim() === '') {
            newErrors.TieuDe = 'Vui lòng nhập tiêu đề chiến dịch';
        }

        // Kiểm tra Ảnh (Bắt buộc nếu là thêm mới hoặc không có ảnh cũ)
        if (!editingId && !selectedFile && !preview) {
            newErrors.image = 'Vui lòng chọn hình ảnh cho banner';
        }

        if (formValues.NgayBatDau && formValues.NgayHetHan && formValues.NgayBatDau > formValues.NgayHetHan) {
            newErrors.NgayBatDau = 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày hết hạn';
        }

        if (normalizeOrderValue(formValues.ThuTuHienThi) < 1) {
            newErrors.ThuTuHienThi = 'Thứ tự phải lớn hơn hoặc bằng 1';
        }

        // Kiểm tra số thứ tự không trùng (chỉ với banner đang hoạt động)
        if (checkDuplicateOrder(formValues.ThuTuHienThi)) {
            newErrors.ThuTuHienThi = 'Số thứ tự này đã được sử dụng bởi banner đang hoạt động';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Trả về true nếu không có lỗi
    };

    // 6. Xử lý khi chọn File
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (preview && preview.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }

            setSelectedFile(file);
            setPreview(URL.createObjectURL(file)); 
            
            // Xóa báo lỗi ảnh nếu người dùng đã chọn
            if (errors.image) setErrors({ ...errors, image: null });
        }
    };
    
    // 7. Gửi dữ liệu lên Server
    const handleSubmit = async (e) => {
        e.preventDefault();

        // GỌI HÀM KIỂM TRA: Nếu có lỗi thì dừng lại luôn
        if (!validateForm()) {
            return; 
        }

        try {
            let urlToSave = preview; 

            if (selectedFile) {
                const fileToUpload = await prepareImageForUpload(selectedFile);
                const formData = new FormData();
                formData.append('image', fileToUpload);

                const uploadRes = await axios.post('http://localhost:5000/api/upload', formData);
                urlToSave = uploadRes.data.url; 
            }

            const dataToSend = {
                ...formValues,
                ThuTuHienThi: normalizeOrderValue(formValues.ThuTuHienThi),
                DuongDanAnh: urlToSave 
            };

            if (editingId) {
                await bannerApi.update(editingId, dataToSend);
            } else {
                await bannerApi.create(dataToSend);
            }

            onSuccess(editingId ? 'Cập nhật banner thành công' : 'Thêm banner mới thành công');
            onClose();
        } catch (error) {
            const apiMessage = error?.response?.data?.message || error?.response?.data?.error;
            setAlert({ show: true, type: 'danger', message: "Lỗi khi lưu: " + (apiMessage || error.message) });
        }
    };

    return createPortal(
        <div 
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1050, padding: '24px 16px', overflowY: 'auto' }}
        >
            <div className="card shadow-lg border-0 rounded-4" style={{ width: '100%', maxWidth: '550px', maxHeight: 'calc(100vh - 48px)', overflow: 'hidden' }}>
                
                {/* Header */}
                <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center pt-4 pb-2 px-4">
                    <h5 className="fw-bold m-0" style={{ color: '#81802E' }}>
                        {editingId ? "CẬP NHẬT BANNER" : "THÊM BANNER MỚI"}
                    </h5>
                    <X style={{ cursor: 'pointer', color: '#777' }} onClick={onClose} />
                </div>

                <div className="card-body px-4 pb-4" style={{ overflowY: 'auto' }}>
                    {alert.show && (
                        <div className={`alert alert-${alert.type} d-flex align-items-center p-3 mb-4`} role="alert">
                            {alert.type === 'success' ? <CheckCircle size={20} className="me-2" /> : <AlertCircle size={20} className="me-2" />}
                            <div className="fw-medium" style={{ fontSize: '15px' }}>{alert.message}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} encType="multipart/form-data">
                        {/* Tiêu đề chiến dịch */}
                        <div className="mb-3">
                            <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                Tiêu đề chiến dịch <span className="text-danger">*</span>
                            </label>
                            <input 
                                type="text"
                                className={`form-control bg-light ${errors.TieuDe ? 'is-invalid border-danger' : 'border-0'}`}
                                value={formValues.TieuDe}
                                onChange={(e) => {
                                    setFormValues({ ...formValues, TieuDe: e.target.value });
                                    // Xóa lỗi khi bắt đầu gõ
                                    if (errors.TieuDe) setErrors({ ...errors, TieuDe: null }); 
                                }}
                            />
                            {/* Hiển thị lỗi Tiêu đề */}
                            {errors.TieuDe && <div className="text-danger mt-1" style={{ fontSize: '13px' }}>{errors.TieuDe}</div>}
                        </div>

                        {/* Upload & Preview Ảnh */}
                        <div className="mb-3">
                            <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                Hình ảnh banner {(!editingId) && <span className="text-danger">*</span>}
                            </label>
                            <div className="d-flex flex-column gap-2">
                                <div className="input-group">
                                    <label className={`input-group-text bg-light ${errors.image ? 'border-danger' : 'border-0'}`} htmlFor="upload-banner" style={{ cursor: 'pointer' }}>
                                        <Upload size={18} className={errors.image ? 'text-danger' : ''} />
                                    </label>
                                    <input 
                                        id="upload-banner"
                                        type="file" 
                                        className="d-none"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <div 
                                        className={`form-control bg-light text-muted d-flex align-items-center ${errors.image ? 'is-invalid border-danger' : 'border-0'}`}
                                        onClick={() => document.getElementById('upload-banner').click()}
                                        style={{ cursor: 'pointer', fontSize: '14px' }}
                                    >
                                        {selectedFile ? selectedFile.name : (data?.DuongDanAnh ? "Đã có ảnh (Click để thay đổi)" : "Chọn ảnh từ máy tính...")}
                                    </div>
                                </div>
                                
                                {/* Hiển thị lỗi Hình ảnh */}
                                {errors.image && <div className="text-danger" style={{ fontSize: '13px' }}>{errors.image}</div>}
                                
                                {preview && (
                                    <div className="rounded-3 border overflow-hidden bg-white d-flex justify-content-center align-items-center mt-2" style={{ height: '180px' }}>
                                        <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Link và Vị trí */}
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Link đích (URLDich)</label>
                                <input 
                                    value={formValues.URLDich}
                                    className="form-control bg-light border-1 py-2 px-3 rounded-3"
                                    type="text"
                                    onChange={(e) => setFormValues({ ...formValues, URLDich: e.target.value })}
                                />

                                {/* Dropdown gợi ý: các chương trình khuyến mãi đang hoạt động */}
                                {activePromotions && activePromotions.length > 0 ? (
                                    <div className="mt-2">
                                        <label className="form-label small text-muted">Chọn chương trình khuyến mãi đang hoạt động</label>
                                        <select
                                            className="form-select form-select-sm mt-1"
                                            value={(() => {
                                                const found = activePromotions.find(p => `/khuyen-mai/${p.MaCTKM}` === formValues.URLDich);
                                                return found ? String(found.MaCTKM) : '';
                                            })()}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!val) setFormValues({ ...formValues, URLDich: '' });
                                                else setFormValues({ ...formValues, URLDich: `/khuyen-mai/${val}` });
                                            }}
                                        >
                                            <option value="">-- Không chọn --</option>
                                            {activePromotions.map((p) => (
                                                <option key={p.MaCTKM} value={p.MaCTKM}>
                                                    {p.TenCTKM}{p.NgayKetThuc ? ` (Hết: ${formatDateDisplay(toDateInputValue(p.NgayKetThuc))})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="form-text small text-muted mt-1">Chọn khuyến mãi để tự điền URL, hoặc gõ URL tuỳ ý.</div>
                                    </div>
                                ) : (
                                    <div className="mt-2">
                                        <small className="text-muted">(Không có chương trình khuyến mãi đang hoạt động)</small>
                                    </div>
                                )}
                            </div>
                            <div className="col-md-6">
    <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
        Vị trí hiển thị
    </label>
    <input
        type="text"
        className="form-control bg-light border-1 py-2 px-3 rounded-3"
        style={{ cursor: 'not-allowed' }} // Hiển thị icon cấm khi di chuột vào
        value="Trang chủ"
        readOnly // Ngăn người dùng sửa nội dung
    />
    {/* Vẫn giữ input ẩn hoặc mặc định giá trị trong formValues là 'TrangChu' */}
</div>
                        </div>

                        {/* Thứ tự và Trạng thái */}
                        <div className="row mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Thứ tự</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={`form-control bg-light border-1 py-2 px-3 rounded-3 ${errors.ThuTuHienThi ? 'is-invalid border-danger' : ''}`}
                                    value={formValues.ThuTuHienThi}
                                    onChange={(e) => {
                                        const rawValue = e.target.value;
                                        if (rawValue === '') {
                                            setFormValues({ ...formValues, ThuTuHienThi: '' });
                                            if (errors.ThuTuHienThi) setErrors({ ...errors, ThuTuHienThi: null });
                                            return;
                                        }

                                        const parsedValue = Number.parseInt(rawValue, 10);
                                        if (Number.isNaN(parsedValue) || parsedValue < 1) {
                                            return;
                                        }

                                        setFormValues({ ...formValues, ThuTuHienThi: parsedValue });
                                        
                                        // Kiểm tra trùng lặp khi nhập
                                        if (checkDuplicateOrder(parsedValue)) {
                                            setErrors({ ...errors, ThuTuHienThi: 'Số thứ tự này đã được sử dụng bởi banner khác' });
                                        } else if (errors.ThuTuHienThi) {
                                            setErrors({ ...errors, ThuTuHienThi: null });
                                        }
                                    }}
                                />
                                {errors.ThuTuHienThi && (
                                    <div className="text-danger mt-1" style={{ fontSize: '13px' }}>
                                        {errors.ThuTuHienThi}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>Trạng thái</label>
                                <select
                                    value={formValues.TrangThai}
                                    className="form-select bg-light border-1 py-2 px-3 rounded-3"
                                    onChange={(e) => setFormValues({ ...formValues, TrangThai: e.target.value })}
                                >
                                    <option value="Active">Đang hiển thị</option>
                                    <option value="Hidden">Tạm ẩn</option>
                                </select>
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                    Ngày bắt đầu
                                </label>
                                <input
                                    type="date"
                                    className={`form-control bg-light border-1 py-2 px-3 rounded-3 ${errors.NgayBatDau ? 'is-invalid border-danger' : ''}`}
                                    value={formValues.NgayBatDau}
                                    onChange={(e) => {
                                        setFormValues({ ...formValues, NgayBatDau: e.target.value });
                                        if (errors.NgayBatDau) setErrors({ ...errors, NgayBatDau: null });
                                    }}
                                />
                                {errors.NgayBatDau && (
                                    <div className="text-danger mt-1" style={{ fontSize: '13px' }}>
                                        {errors.NgayBatDau}
                                    </div>
                                )}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-dark" style={{ fontSize: '14px' }}>
                                    Ngày hết hạn
                                </label>
                                <input
                                    type="date"
                                    className="form-control bg-light border-1 py-2 px-3 rounded-3"
                                    value={formValues.NgayHetHan}
                                    onChange={(e) => setFormValues({ ...formValues, NgayHetHan: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-text mb-2">
                            {`Hiển thị: Bắt đầu: ${formatDateDisplay(formValues.NgayBatDau)} - Hết hạn: ${formatDateDisplay(formValues.NgayHetHan)}`}
                        </div>
                        <div className="form-text">Để trống nếu banner không giới hạn thời gian.</div>

                        {/* Action Buttons */}
                        <div className="d-flex gap-3">
                            <button type="button" className="btn btn-light flex-grow-1 border-0 fw-semibold" onClick={onClose}>
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

function toDateInputValue(dateValue) {
    if (!dateValue) return '';

    if (typeof dateValue === 'string') {
        const rawDate = dateValue.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            return rawDate;
        }
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeOrderValue(value) {
    const parsedValue = Number.parseInt(String(value).replace(/\D/g, ''), 10);
    if (Number.isNaN(parsedValue) || parsedValue < 1) {
        return 0;
    }

    return parsedValue;
}

function formatDateDisplay(dateInputValue) {
    if (!dateInputValue) return 'Chưa đặt';

    const parts = String(dateInputValue).split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    }

    return dateInputValue;
}

async function prepareImageForUpload(file) {
    const maxDirectUploadSize = 2 * 1024 * 1024; // 2MB

    if (!file || file.size <= maxDirectUploadSize) {
        return file;
    }

    try {
        const image = await loadImage(file);
        const maxDimension = 1200;
        const ratio = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) return file;

        context.drawImage(image, 0, 0, width, height);

        const compressedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.82);
        if (!compressedBlob) return file;

        const compressedName = (file.name || 'banner').replace(/\.[^.]+$/, '.jpg');
        return new File([compressedBlob], compressedName, { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = reader.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function canvasToBlob(canvas, mimeType, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
}
    
export default BannerForm;