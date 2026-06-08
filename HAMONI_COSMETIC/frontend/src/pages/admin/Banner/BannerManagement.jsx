import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit3, Trash2 } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { bannerApi } from '../../../services/bannerApi';
import BannerForm from './BannerForm';

import './Banner.css';

const BannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [bannerStats, setBannerStats] = useState({ totalItems: 0, totalActiveItems: 0 });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState(null);
    const [bannerToDelete, setBannerToDelete] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // 1. TẠO BIẾN TRIGGER ĐỂ BÁO HIỆU CẦN TẢI LẠI DỮ LIỆU
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const showNotification = (message, type = 'success') => {
        if (type === 'success') {
            toast.success(message);
        } else {
            toast.error(message);
        }
    };

    // 2. USEEFFECT GỌI API (Sẽ tự chạy lại khi chuyển trang HOẶC khi refreshTrigger thay đổi)
    useEffect(() => {
        const loadBanners = async () => {
            try {
                const res = await Promise.race([
                    bannerApi.getAll({
                        page: currentPage,
                        limit: 5
                    }),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('API timeout')), 5000)
                    )
                ]);

                const dataList = res?.data || (Array.isArray(res) ? res : []);
                setBanners(dataList);

                if (res?.pagination?.totalPages) {
                    setTotalPages(res.pagination.totalPages);
                    setBannerStats({
                        totalItems: res.pagination.totalItems ?? dataList.length,
                        totalActiveItems:
                            res.pagination.totalActiveItems ?? dataList.filter((b) => b.TrangThai === 'Active').length
                    });
                    if (res.pagination.page && res.pagination.page !== currentPage) {
                        setCurrentPage(res.pagination.page);
                    }
                } else {
                    setTotalPages(1);
                    setBannerStats({
                        totalItems: dataList.length,
                        totalActiveItems: dataList.filter((b) => b.TrangThai === 'Active').length
                    });
                }
            } catch (err) {
                console.error('Lỗi API:', err.message);
                setBanners([]);
                setBannerStats({ totalItems: 0, totalActiveItems: 0 });
            }
        };

        loadBanners();
    }, [currentPage, refreshTrigger]);

    // 3. THỐNG KÊ
    const statsData = useMemo(() => {
        return [
            {
                label: 'TỔNG SỐ BANNER',
                value: bannerStats.totalItems,
                sub: `${bannerStats.totalActiveItems} đang hoạt động`
            }
        ];
    }, [bannerStats]);

    // 4. HÀM XÓA (Cũng dùng Trigger để tải lại)
    const handleDelete = async () => {
        if (!bannerToDelete) return;

        try {
            await bannerApi.delete(bannerToDelete.MaBanner);
            // Xóa xong thì tăng refreshTrigger lên 1 để load lại danh sách
            setRefreshTrigger((prev) => prev + 1);
            showNotification('Xóa banner thành công', 'success');
            setBannerToDelete(null);
        } catch (error) {
            console.error('Lỗi khi xóa:', error);
            showNotification('Xóa banner thất bại', 'danger');
        }
    };

    return (
        <div className="banner-page-container">
            <h1 className="main-title">QUẢN LÝ BANNER</h1>

            {/* Khối danh sách chính */}
            <div className="table-card mt-4 shadow-sm">
                {/* Header tích hợp: Tiêu đề + Thống kê + Nút thêm */}
                <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-white rounded-top">
                    <div>
                        <h3 className="table-title m-0" style={{ fontSize: '2.0rem', color: '#81802E', fontWeight: 'bold' }}>
                            Danh sách Banner
                        </h3>
                        {/* Phần tổng số banner được kéo vào đây */}
                        <div className="mt-1">
                            <span className="badge bg-light text-dark border me-2">
                                {statsData[0].label}: <strong>{statsData[0].value}</strong>
                            </span>
                            <span className="badge bg-success-subtle text-success border">{statsData[0].sub}</span>
                        </div>
                    </div>

                    <button
                        className="btn-add-banner d-flex align-items-center gap-2"
                        onClick={() => {
                            setSelectedBanner(null);
                            setIsFormOpen(true);
                        }}
                        style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
                    >
                        <Plus size={18} /> Thêm banner mới
                    </button>
                </div>

                <table className="custom-table">
                    <thead>
                        <tr>
                            <th>MÃ BANNER</th>
                            <th>HÌNH ẢNH</th>
                            <th>TÊN CHIẾN DỊCH</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {banners.length > 0 ? (
                            banners.map((bn) => (
                                <tr key={bn.MaBanner}>
                                    <td className="banner-code">#BN-{String(bn.MaBanner).padStart(3, '0')}</td>
                                    <td>
                                        <div className="banner-img-wrapper">
                                            <img src={bn.DuongDanAnh} alt={bn.TieuDe} />
                                        </div>
                                    </td>
                                    <td>
                                        <div className="campaign-info">
                                            <strong>{bn.TieuDe}</strong>
                                            <span>{formatCampaignPeriod(bn.NgayBatDau, bn.NgayHetHan)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`status-badge ${bn.TrangThai === 'Active' ? 'active' : 'hidden'}`}>
                                            <span className="dot"></span>
                                            {bn.TrangThai === 'Active' ? 'Đang hiển thị' : 'Tạm ẩn'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <Edit3
                                                size={18}
                                                className="icon-edit"
                                                onClick={() => {
                                                    setSelectedBanner(bn);
                                                    setIsFormOpen(true);
                                                }}
                                            />
                                            <Trash2
                                                size={18}
                                                className="icon-delete"
                                                onClick={() => setBannerToDelete(bn)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                                    Không có dữ liệu banner nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* FORM BANNER NẰM Ở ĐÂY */}
            {isFormOpen && (
                <BannerForm
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    data={selectedBanner}
                    onSuccess={(message) => {
                        setIsFormOpen(false);
                        // KÍCH HOẠT TẢI LẠI DỮ LIỆU
                        setRefreshTrigger(Date.now()); // Dùng timestamp để đảm bảo giá trị luôn thay đổi
                        showNotification(message || 'Lưu banner thành công', 'success');
                    }}
                />
            )}

            {bannerToDelete && (
                <>
                    <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Xác nhận xóa banner</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        aria-label="Close"
                                        onClick={() => setBannerToDelete(null)}
                                    ></button>
                                </div>
                                <div className="modal-body">
                                    <p className="mb-0">
                                        Bạn có chắc chắn muốn xóa banner <strong>{bannerToDelete.TieuDe}</strong> không?
                                    </p>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setBannerToDelete(null)}>
                                        Hủy
                                    </button>
                                    <button type="button" className="btn btn-danger" onClick={handleDelete}>
                                        Xóa banner
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop show"></div>
                </>
            )}

            <div className="pagination-wrapper">
                <button className="pagi-arrow" disabled={currentPage === 1} onClick={() => setCurrentPage((prev) => prev - 1)}>
                    ‹
                </button>
                <div className="pagi-numbers-group">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            className={`pagi-item ${currentPage === pageNum ? 'active' : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                        >
                            {pageNum}
                        </button>
                    ))}
                </div>
                <button
                    className="pagi-arrow"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                    ›
                </button>
            </div>

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

function formatCampaignPeriod(startDateValue, endDateValue) {
    const startDateText = formatDateText(startDateValue);
    const endDateText = formatDateText(endDateValue);

    const startLabel = startDateText || 'Chưa đặt';
    const endLabel = endDateText || 'Chưa đặt';
    return `Bắt đầu: ${startLabel} - Hết hạn: ${endLabel}`;
}

function formatDateText(dateValue) {
    if (!dateValue) return '';

    if (typeof dateValue === 'string') {
        const rawDate = dateValue.trim().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
            const [year, month, day] = rawDate.split('-');
            return `${day}/${month}/${year}`;
        }
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('vi-VN');
}

export default BannerManagement;
