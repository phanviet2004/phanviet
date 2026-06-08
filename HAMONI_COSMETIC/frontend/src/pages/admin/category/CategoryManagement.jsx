// src/pages/admin/category/CategoryManagement.jsx
import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Box, CheckCircle, Download, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { categoryApi } from '../../../services/categoryApi';
import CategoryForm from './CategoryForm'; // Import Modal vào
import './Category.css';

const CategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState(""); 
    
    // Quản lý Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null); 
    const [currentCat, setCurrentCat] = useState(null);

     // --- PHẦN THÊM MỚI: State cho phân trang ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // Số dòng trên mỗi trang

    const loadData = async () => {
        try {
            const res = await categoryApi.getAll(search);
            console.log("Dữ liệu API trả về:", res); // Thêm dòng này để dễ debug
            setCategories(res);
            setCurrentPage(1); // Reset về trang đầu sau khi tìm kiếm
        } catch (error) {
            console.error("Lỗi tải dữ liệu:", error); 
        }
    };

    useEffect(() => {
        let isActive = true;

        const fetchCategories = async () => {
            try {
                const res = await categoryApi.getAll(search);
                if (isActive) {
                    setCategories(res);
                    setCurrentPage(1); // Reset về trang đầu sau khi tìm kiếm
                }
            } catch (err) {
                console.error("Lỗi tải dữ liệu:", err);
            }
        };

        fetchCategories();

        return () => {
            isActive = false;
        };
    }, [search]);

     // --- LOGIC PHÂN TRANG ---
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = Array.isArray(categories) ? categories.slice(indexOfFirstItem, indexOfLastItem) : [];
    const totalPages = Math.ceil((categories?.length || 0) / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleOpenAdd = () => {
        setEditingId(null);
        setCurrentCat(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (cat) => {
        setEditingId(cat.MaDM);
        setCurrentCat(cat);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        loadData(); // Tải lại bảng sau khi thêm/sửa thành công
    };

    // Tính số danh mục đang hoạt động
    const activeCount = categories.filter(cat => cat.TrangThai === 1).length;

    return (
        <div className="category-page">
            <div className="category-wrapper">
                <h2 className="page-title">QUẢN LÝ DANH MỤC SẢN PHẨM</h2>

                <div className="category-stats-container">
                    <div className="category-stat-card">
                        <div className="category-stat-info">
                            <p className="category-stat-label">Tổng danh mục</p>
                            {/* Đã thêm ?.length || 0 */}
                            <span className="category-stat-number text-italic">{categories?.length || 0}</span>
                        </div>
                        <div className="category-stat-icon blue"><Box size={20} /></div>
                    </div>
                    <div className="category-stat-card">
                        <div className="category-stat-info">
                            <p className="category-stat-label">Đang hoạt động</p>
                            {/* Hiển thị số danh mục có sản phẩm */}
                            <span className="category-stat-number text-italic category-text-green">{activeCount}</span>
                        </div>
                        <div className="category-stat-icon green"><CheckCircle size={20} /></div>
                    </div>
                </div>

                <div className="toolbar">
                    <button className="btn-add" onClick={handleOpenAdd}>
                        <UserPlus size={18} /> THÊM DANH MỤC MỚI
                    </button>
                    
                    <div className="search-group">
                        <div className="search-input-wrapper">
                            <Search className="icon-search" size={16} />
                            <input 
                                type="text" 
                                placeholder="Tìm theo Mã ID, Tên..." 
                                className="search-input"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)} 
                            />
                        </div>
                        <button className="btn-download" onClick={categoryApi.exportExcel} title="Xuất file Excel">
                            <Download size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="table-wrapper">
                    <table className="custom-table">
                        <thead>
                            <tr>
                                <th>Mã danh mục</th>
                                <th>Hình ảnh</th>
                                <th>Tên danh mục</th>
                                <th>Số sản phẩm</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Đã thêm kiểm tra mảng an toàn trước khi .map() */}
                            {Array.isArray(currentItems) && currentItems.length > 0 ? (
                                currentItems.map((cat) => (
                                    <tr
                                        key={cat.MaDM}
                                        className={`category-row clickable-row ${Number(cat.TrangThai) === 0 ? 'inactive-row' : ''}`}
                                        onClick={() => handleOpenEdit(cat)}
                                        title="Click để chỉnh sửa danh mục"
                                        style={Number(cat.TrangThai) === 0 ? { opacity: 0.6, backgroundColor: '#f5f5f5' } : {}}
                                    >
                                        <td className="col-id">{cat.MaDM}</td>
                                        <td>
                                            <div className="category-thumb">
                                                {cat.DuongDanAnh ? (
                                                    <img src={cat.DuongDanAnh} alt={cat.TenDM} />
                                                ) : (
                                                    <span>Chưa có ảnh</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="col-name">{cat.TenDM}</td>
                                        <td style={{ textAlign: 'center' }}>{cat.SoLuongSanPham || 0}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {Number(cat.TrangThai) === 1 ? (
                                                <span style={{ color: '#27ae60', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                    <CheckCircle size={16} /> Hoạt động
                                                </span>
                                            ) : (
                                                <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                                    <AlertCircle size={16} /> Không hoạt động
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#7f8c8d' }}>
                                        Chưa có dữ liệu danh mục nào để hiển thị.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                                {/* --- PHẦN THÊM MỚI: Giao diện phân trang (image_9f3b7b.png) --- */}
                {totalPages > 1 && (
                    <div className="pagination-container">
                        <button 
                            className="pagi-btn" 
                            disabled={currentPage === 1}
                            onClick={() => paginate(currentPage - 1)}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {[...Array(totalPages)].map((_, index) => (
                            <button
                                key={index + 1}
                                onClick={() => paginate(index + 1)}
                                className={`pagi-number ${currentPage === index + 1 ? 'active' : ''}`}
                            >
                                {index + 1}
                            </button>
                        ))}

                        <button 
                            className="pagi-btn" 
                            disabled={currentPage === totalPages}
                            onClick={() => paginate(currentPage + 1)}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                {/* Nhúng component Modal vào đây */}
                <CategoryForm 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    editingId={editingId} 
                    initialData={currentCat}
                    onSuccess={handleSuccess}
                />

            </div>
        </div>
    );
};

export default CategoryManagement;