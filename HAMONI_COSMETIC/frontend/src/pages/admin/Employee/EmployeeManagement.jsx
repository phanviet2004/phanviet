// src/pages/admin/Employee/EmployeeManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../../services/axiosClient';
import { Plus, Search, Trash2, Download } from 'lucide-react'; // Đã thêm Download
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './EmployeeManagement.css';
import EmployeeForm from './EmployeeForm';

const EmployeeManagement = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [status, setStatus] = useState('Tất cả trạng thái');
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const canDelete = true;
    const recordsPerPage = 10;

    const loadEmployees = useCallback(async () => {
        try {
            const res = await axiosClient.get(`/employees`, {
                params: { search, status }
            });
            const data = Array.isArray(res) ? res : (res.data || []);
            setEmployees(data); 
            setCurrentPage(1);
        } catch (err) {
            console.error("Lỗi tải danh sách nhân viên:", err);
            setEmployees([]); 
        }
    }, [search, status]);

    useEffect(() => {
        const initFetch = async () => {
            await loadEmployees();
        };
        initFetch();
    }, [loadEmployees]);

    const handleDelete = async (id) => {
        // Đổi câu hỏi xác nhận thành XÓA
        if (window.confirm("Bạn có chắc chắn muốn xóa nhân viên này khỏi hệ thống không?")) {
            try {
                await axiosClient.delete(`/employees/${id}`);
                toast.success("Đã xóa nhân viên thành công!");
                loadEmployees();
            } catch {
                toast.error("Lỗi! Không thể xóa nhân viên này.");
            }
        }
    };

    

    
// HÀM XUẤT EXCEL (Chuẩn bảo mật có kẹp Token)
    const handleExportExcel = async () => { 
        try {
            // 1. Dùng axiosClient gọi API, nhớ cấu hình responseType là 'blob' để nhận file
            const response = await axiosClient.get('/employees/export', {
                responseType: 'blob' 
            });

            // 2. Tạo một đường dẫn ảo (URL) từ dữ liệu file vừa tải về
            const url = window.URL.createObjectURL(new Blob([response]));
            
            // 3. Tạo một thẻ <a> ẩn, gán link ảo đó và click tự động để tải về máy
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'DanhSachNhanVien.xlsx'); // Tên file tải xuống
            document.body.appendChild(link);
            link.click();
            
            // 4. Xóa thẻ <a> ẩn sau khi tải xong để dọn dẹp bộ nhớ
            link.parentNode.removeChild(link);
            
        } catch (error) {
            console.error("Lỗi khi tải file Excel:", error);
            toast.error("Bạn không có quyền xuất file hoặc có lỗi xảy ra!");
        }
    };

    const safeEmployees = Array.isArray(employees) ? employees : [];
    
    const lastIndex = currentPage * recordsPerPage;
    const firstIndex = lastIndex - recordsPerPage;
    const currentRecords = safeEmployees.slice(firstIndex, lastIndex);
    const nPage = Math.ceil(safeEmployees.length / recordsPerPage);
    const numbers = [...Array(nPage + 1).keys()].slice(1);

    return (
        <div className="admin-container">
            <h1 className="title">QUẢN LÝ NHÂN VIÊN</h1>
            
            {/* TOOLBAR ĐÃ ĐƯỢC TÁCH CSS GỌN GÀNG */}
            <div className="toolbar">
                <div className="filter-search-group">
                    <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Ngoại tuyến">Ngoại tuyến (Bị khóa)</option>
                    </select>

                    <div className="search-box-wrapper">
                        <Search size={16} className="search-icon-inner" />
                        <input 
                            type="text" 
                            className="search-input"
                            placeholder="Tìm kiếm..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>  

                <div className="action-button-group">
                    <button className="btn-export-excel" onClick={handleExportExcel} title="Tải xuống danh sách nhân viên">
                        <Download size={18} /> Xuất Excel
                    </button>

                    <button className="btn-add-primary" onClick={() => setIsFormOpen(true)}>
    <Plus size={18} /> Thêm nhân viên mới
</button>
                </div>
            </div>        

            {/* BẢNG DỮ LIỆU CŨNG ĐƯỢC LÀM SẠCH INLINE STYLE */}
            <div className="table-card">
                <table className="employee-table">
                    <thead>
                        <tr>
                            <th className="th-employee-name">TÊN NHÂN VIÊN</th>
                            <th>MÃ NV</th>
                            <th>VAI TRÒ</th>
                            <th>EMAIL</th>
                            <th>SỐ ĐIỆN THOẠI</th>
                            <th>TRẠNG THÁI</th>
                            <th className="th-action">THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRecords.length > 0 ? currentRecords.map((item) => (
                            <tr 
                                key={item.MaND}
                                // THÊM SỰ KIỆN CLICK VÀO DÒNG ĐỂ CHUYỂN TRANG
                               onClick={() => navigate(`/admin/employee-detail/${item.MaND}`)}
                                style={{ cursor: 'pointer' }}
                                className="employee-row"
                            >
                                <td className="td-employee-name">
                                    <div className="employee-info-wrapper">
                                        {item.AvatarUrl ? (
                                            <img 
                                                src={item.AvatarUrl}
                                                alt={item.HoTen}
                                                className="avatar"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div className="avatar">
                                                {item.HoTen?.charAt(0).toUpperCase() || 'NV'}
                                            </div>
                                        )}
                                        <div>
                                            <div className="employee-name">{item.HoTen}</div>
                                            <div className="employee-dept">{item.PhongBan || 'Phòng ban chung'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="td-code">NV-{item.MaND}</td>
                                <td>
                                    <span className={`role-badge ${item.MaQuyen === 'ADMIN' ? 'role-manager' : 'role-staff'}`}>
                                        {item.MaQuyen === 'ADMIN' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}
                                    </span>
                                </td>
                                <td className="td-text-mute">{item.Email}</td>
                                <td className="td-text-mute">{item.SoDienThoai}</td>
                                <td>
                                    {item.TrangThai === 1 || item.TrangThai === 'Hoạt động' ? (
                                        <div className="status-active">
                                            <span className="dot dot-active"></span> Hoạt động
                                        </div>
                                    ) : (
                                        <div className="status-offline">
                                            <span className="dot dot-offline"></span> Ngoại tuyến
                                        </div>
                                    )}
                                </td>
                                <td className="td-action">
                                    {canDelete && (
                                        <button 
                                            className="action-btn btn-ban" 
                                            title="Xóa nhân viên" 
                                            onClick={(e) => {
                                                e.stopPropagation(); 
                                                handleDelete(item.MaND);
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" className="td-empty">
                                    Không tìm thấy dữ liệu nhân viên
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* FOOTER PHÂN TRANG */}
                <div className="pagination-footer">
                    <div>
                        Hiển thị <strong>{safeEmployees.length > 0 ? firstIndex + 1 : 0} - {Math.min(lastIndex, safeEmployees.length)}</strong> của <strong>{safeEmployees.length}</strong> nhân viên
                    </div>
                    {nPage > 1 && (
                        <div className="pagination-buttons">
                            {numbers.map(n => (
                                <button 
                                    key={n} 
                                    onClick={() => setCurrentPage(n)} 
                                    className={`page-btn ${n === currentPage ? 'active' : ''}`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <EmployeeForm 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSuccess={() => {
                    setIsFormOpen(false); // Tắt form
                    loadEmployees(); // Load lại dữ liệu bảng (thay bằng tên hàm tải data của bạn)
                }} 
            />

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default EmployeeManagement;