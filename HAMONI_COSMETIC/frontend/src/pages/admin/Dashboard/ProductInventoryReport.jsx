import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ProductInventoryReport.css';
import reportApi from "../../../services/reportApi"; 
import axiosClient from "../../../services/axiosClient";

const ProductInventoryReport = () => {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // 1. STATE QUẢN LÝ PHÂN TRANG
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchReportData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Truyền tham số page vào hàm gọi API (Giả sử API nhận object params)
                // Nếu api của bạn nhận query string, đảm bảo services/reportApi cấu hình đúng.
                const data = await reportApi.getInventoryReport({ page, limit: 10 });
                const safeData = {
                    ...data,
                    summary: data?.summary || {
                        totalProducts: 0,
                        totalInventory: 0,
                        lowStock: 0,
                        topSelling: 'N/A'
                    },
                    products: Array.isArray(data?.products) ? data.products : [],
                    chart: Array.isArray(data?.chart) ? data.chart : []
                };
                setReportData(safeData);
            } catch (err) {
                console.error("Lỗi khi lấy dữ liệu báo cáo:", err);
                setError(err.message || "Lỗi server");
            } finally {
                setIsLoading(false);
            }
        };

        fetchReportData();
    }, [page]); // Bổ sung dependency: Gọi lại API mỗi khi 'page' thay đổi

    // 2. HÀM XỬ LÝ XUẤT EXCEL
   // 2. HÀM XỬ LÝ XUẤT EXCEL (CHUẨN HỆ THỐNG)
    const handleExportExcel = async () => {
        try {
            // Thông báo đang tải (Tùy chọn, bạn có thể tạo 1 state isExporting nếu thích)
            console.log("Đang xử lý xuất file Excel...");

            // 1. Dùng axiosClient để gọi API (Nó sẽ tự ghép domain thật và tự đính kèm Token)
            const response = await axiosClient.get('/reports/export', {
                responseType: 'blob', // 🔥 Quan trọng: Báo cho Axios biết đây là file, không phải JSON
            });

            // AxiosClient của bạn có thể trả về thẳng response hoặc response.data, 
            // nên ta dự phòng cả 2 trường hợp để lấy được dữ liệu thô (Blob)
            const blobData = response.data || response;

            // 2. Tạo một đường link ảo (URL) trong bộ nhớ trình duyệt
            const url = window.URL.createObjectURL(new Blob([blobData]));
            
            // 3. Tạo một thẻ <a> ẩn, gán link ảo đó vào và ép trình duyệt tự động click
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Hamoni_TonKho_${Date.now()}.xlsx`); // Tên file khi tải về
            
            document.body.appendChild(link);
            link.click();

            // 4. Dọn dẹp rác bộ nhớ sau khi tải xong
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Lỗi khi xuất file Excel:", error);
            toast.error("Không thể xuất dữ liệu. Vui lòng thử lại sau!");
        }
    };

    if (isLoading && !reportData) {
        return <div className="loading-container">Đang tải dữ liệu báo cáo...</div>;
    }

    if (error) {
        return <div className="error-container">Lỗi: {error}. Vui lòng kiểm tra lại Backend.</div>;
    }

    if (!reportData || !reportData.products || reportData.products.length === 0) {
        return <div className="no-data-container">Không có dữ liệu tồn kho để hiển thị.</div>;
    }

    return (
        <div className="inventory-report-page">
            
            {/* THÊM NÚT XUẤT EXCEL VÀO HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="report-title m-0">BÁO CÁO SẢN PHẨM & TỒN KHO</h1>
                <button 
                    onClick={handleExportExcel}
                    style={{
                        backgroundColor: '#5b5a41', color: 'white', border: 'none', 
                        padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                    }}
                >
                    📥 Xuất Excel
                </button>
            </div>

            {/* --- STATS --- */}
            <div className="inventory-stats-grid">
                <div className="inventory-stat-card">
                    <div className="inventory-stat-card-header">
                        <span className="inventory-stat-icon">📦</span>
                        <span className="inventory-stat-badge green">+4.2%</span>
                    </div>
                    <p className="inventory-stat-label">Tổng sản phẩm</p>
                    <h2 className="inventory-stat-value">{reportData.summary.totalProducts}</h2>
                </div>

                <div className="inventory-stat-card">
                    <div className="inventory-stat-card-header">
                        <span className="inventory-stat-icon">🏠</span>
                        <span className="inventory-stat-badge green">+12%</span>
                    </div>
                    <p className="inventory-stat-label">Tổng tồn kho</p>
                    <h2 className="inventory-stat-value">
                        {Number(reportData.summary.totalInventory).toLocaleString()}
                    </h2>
                </div>

                <div className="inventory-stat-card inventory-danger-card">
                    <div className="inventory-stat-card-header">
                        <span className="inventory-stat-icon">⚠️</span>
                        {/* Đã sửa text cứng "-2 vùng" thành "Chú ý" cho hợp logic nghiệp vụ */}
                        <span className="inventory-stat-badge red">Chú ý</span>
                    </div>
                    <p className="inventory-stat-label inventory-text-red">Sản phẩm sắp hết hàng</p>
                    <h2 className="inventory-stat-value inventory-text-red">{reportData.summary.lowStock}</h2>
                </div>

                <div className="inventory-stat-card">
                    <div className="inventory-stat-card-header">
                        <span className="inventory-stat-icon">📈</span>
                        <span className="inventory-stat-badge gold">Top 5</span>
                    </div>
                    <p className="inventory-stat-label">Sản phẩm bán chạy</p>
                    <h2 className="inventory-stat-value">{reportData.summary.topSelling}</h2>
                </div>
            </div>

          {/* --- CHART (BIỂU ĐỒ TƯƠNG QUAN: ĐÃ BÁN VS TỒN KHO) --- */}
            <div className="chart-wrapper">
                <h3 className="chart-header">Top 10 Bán Chạy: Số lượng Đã bán vs Tồn kho</h3>
                
                {/* Chú thích màu sắc */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '14px', height: '14px', backgroundColor: '#4caf50', borderRadius: '3px' }}></div>
                        <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>Đã bán</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '14px', height: '14px', backgroundColor: '#ff9800', borderRadius: '3px' }}></div>
                        <span style={{ fontSize: '13px', color: '#555', fontWeight: 500 }}>Tồn kho</span>
                    </div>
                </div>

                {reportData.chart.length === 0 ? (
                    <div className="no-data-container" style={{ background: 'transparent', minHeight: 120 }}>
                        Chưa có dữ liệu biểu đồ để hiển thị.
                    </div>
                ) : (
                <div className="inventory-bar-chart">
                    {reportData.chart.map((item, index) => (
                        <div key={index} className="dual-bar-column">
                            <div className="bars-container">
                                {/* Cột Đã bán (Màu Xanh) */}
                                <div className="bar-group">
                                    <span className="bar-value" style={{ color: '#4caf50' }}>{item.soldVal.toLocaleString()}</span>
                                    <div 
                                        className="bar-fill sold-bar" 
                                        style={{ height: `${item.soldPercent}%` }} 
                                        title={`Đã bán: ${item.soldVal}`}
                                    ></div>
                                </div>
                                
                                {/* Cột Tồn kho (Màu Cam) */}
                                <div className="bar-group">
                                    <span className="bar-value" style={{ color: '#ff9800' }}>{item.stockVal.toLocaleString()}</span>
                                    <div 
                                        className="bar-fill stock-bar" 
                                        style={{ height: `${item.stockPercent}%` }} 
                                        title={`Tồn kho: ${item.stockVal}`}
                                    ></div>
                                </div>
                            </div>
                            
                            <span className="bar-label" title={item.label}>
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>
                )}
            </div>

            {/* --- TABLE --- */}
            <div className="table-wrapper">
                <table className="inventory-data-table">
                    <thead>
                        <tr>
                            <th>TÊN SẢN PHẨM</th>
                            <th>DANH MỤC</th>
                            <th>TỒN KHO</th>
                            <th>SỐ LƯỢNG ĐÃ BÁN</th>
                            <th>TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.products.map((product, index) => (
                            <tr key={index}>
                                <td className="product-cell">
                                    <div className="product-image-placeholder">
                                        <img 
                                            src={`https://ui-avatars.com/api/?name=${product.name}&background=random`} 
                                            alt="img" 
                                            className="product-avatar" 
                                        />
                                    </div>
                                    <span className="product-name">{product.name}</span>
                                </td>
                                <td>{product.category}</td>
                                <td>
                                    <strong className="stock-number">
                                        {Number(product.stock).toLocaleString()}
                                    </strong>
                                </td>
                                <td>{Number(product.sold).toLocaleString()}</td>
                                <td>
                                    <span className={`status-tag ${product.color}`}>
                                        {product.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* 3. THÊM UI PHÂN TRANG (PAGINATION) BÊN DƯỚI BẢNG */}
                {reportData.totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', padding: '15px 20px', borderTop: '1px solid #eee' }}>
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', cursor: page <= 1 ? 'not-allowed' : 'pointer', background: '#fff' }}
                        >
                            Trang trước
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                            Trang {reportData.currentPage} / {reportData.totalPages}
                        </span>
                        <button 
                            onClick={() => setPage(p => Math.min(reportData.totalPages, p + 1))}
                            disabled={page >= reportData.totalPages}
                            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', cursor: page >= reportData.totalPages ? 'not-allowed' : 'pointer', background: '#fff' }}
                        >
                            Trang sau
                        </button>
                    </div>
                )}
            </div>

            <ToastContainer position="top-right" autoClose={3000} theme="colored" />
        </div>
    );
};

export default ProductInventoryReport;