import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import reportApi from "../../../services/reportApi"; 
import './ExportExcelReport.css';
const ExportExcelReport = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // State Bộ lọc & Phân trang
    const [category, setCategory] = useState('all');
    const [status, setStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

   // Đảm bảo useEffect của bạn trông như thế này:
useEffect(() => {
    const fetchInventory = async () => {
        try {
            // Quan trọng: Truyền đúng category và status vào params
            const res = await reportApi.getInventoryReport({ 
                category, 
                status, 
                page: currentPage,
                limit: 5 
            });

            if (res && res.products) {
                setProducts(res.products);
                setTotalPages(res.totalPages || 1);
            }
        } catch (error) {
            console.error("Lỗi lấy dữ liệu:", error);
        }
    };
    fetchInventory();
}, [category, status, currentPage]); // <-- Lắng nghe cả 3 biến này

    const handleExport = async () => {
        try {
            setLoading(true);
            const res = await reportApi.exportExcel({ category, status });
            const blob = new Blob([res.data], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Bao_Cao_Ton_Kho_Hamoni_${new Date().getTime()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Lỗi xuất file:", error);
            toast.error("Không thể kết nối Backend để xuất file!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="excel-page-wrapper">
            <div className="excel-container-centered">
                <h1 className="excel-header-title">XUẤT BÁO CÁO EXCEL</h1>

                <div className="excel-filter-card">
                    <select 
                        className="excel-select-box"
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">Tất cả danh mục</option>
                        <option value="Chăm sóc da">Chăm sóc da</option>
                        <option value="Trang điểm">Trang điểm</option>
                    </select>

                    <select 
                        className="excel-select-box"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="conhang">Còn hàng</option>
                        <option value="saphet">Sắp hết hàng</option>
                        <option value="hethang">Hết hàng</option>
                    </select>
                    <button className="excel-btn-gear">⚙️</button>
                </div>

                <div className="excel-table-layout-box">
                    <table className="excel-main-data-table">
                        <thead>
                            <tr>
                                <th>TÊN SẢN PHẨM</th>
                                <th>DANH MỤC</th>
                                <th>TỒN KHO</th>
                                <th>SỐ LƯỢNG ĐÃ BÁN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? products.map((p, i) => (
                                <tr key={i}>
                                    <td className="col-product">
                                        <div className="product-img-circle">
                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=635F40&color=fff`} alt="p" />
                                        </div>
                                        {p.name}
                                    </td>
                                    <td><span className="category-bubble">{p.category}</span></td>
                                    <td style={{fontWeight: 'bold', color: p.stock < 100 ? '#f44336' : 'inherit'}}>
                                        {Number(p.stock).toLocaleString()}
                                    </td>
                                    <td>{Number(p.sold || 0).toLocaleString()}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" style={{textAlign:'center', padding:'50px', color:'#999'}}>
                                        Không tìm thấy dữ liệu phù hợp...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="excel-table-footer">
                        <span>Hiển thị {products.length} sản phẩm thực tế</span>
                        <div className="pagi-ctrl-group">
                            <button 
                                className="pagi-num-btn"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => p - 1)}
                            >‹</button>
                            
                            {[...Array(totalPages)].map((_, i) => (
                                <button 
                                    key={i}
                                    className={`pagi-num-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                    onClick={() => setCurrentPage(i + 1)}
                                >{i + 1}</button>
                            ))}

                            <button 
                                className="pagi-num-btn"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >›</button>
                        </div>
                    </div>
                </div>

                <div className="excel-bottom-nav">
                    <button className="btn-go-back" onClick={() => window.history.back()}>←</button>
                    <button className="btn-action-export" onClick={handleExport} disabled={loading}>
                        {loading ? "ĐANG XUẤT..." : "📥 XUẤT EXCEL"}
                    </button>
                </div>

                <ToastContainer position="top-right" autoClose={3000} theme="colored" />
            </div>
        </div>
    );
};

export default ExportExcelReport;