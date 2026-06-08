import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import warehouseApi from "../../../services/warehouseApi";
import "./WarehouseLog.css";



const normalizeText = (value) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const getPriceValidation = (item, product) => {
    if (!product) {
        return { level: "neutral", message: "Chọn sản phẩm để kiểm tra giá nhập" };
    }

    const salePrice = Number(product.Gia || 0);
    const importPrice = Number(item?.GiaNhap || 0);

    if (importPrice <= 0) {
        return { level: "neutral", message: "Nhập giá nhập để kiểm tra lợi nhuận" };
    }

    if (salePrice <= 0) {
        return { level: "neutral", message: "Chưa có giá bán để đối chiếu" };
    }

    const gapPercent = ((salePrice - importPrice) / salePrice) * 100;

    if (importPrice > salePrice) {
        return {
            level: "error",
            message: "❌ Giá nhập lớn hơn giá bán, không thể lưu phiếu nhập"
        };
    }

    if (gapPercent >= 1 && gapPercent <= 2) {
        return {
            level: "warning",
            message: `⚠ Lợi nhuận quá thấp (chênh ${gapPercent.toFixed(1)}%)`
        };
    }

    if (gapPercent >= 10 && gapPercent <= 15) {
        return {
            level: "ok",
            message: `✔ Giá nhập hợp lý (chênh ${gapPercent.toFixed(1)}%)`
        };
    }

    return {
        level: "neutral",
        message: `Chênh lệch hiện tại ${gapPercent.toFixed(1)}%`
    };
};

const WarehouseLog = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const type = new URLSearchParams(location.search).get("type") || "inbound";

    const [products, setProducts] = useState([]);
    const [items, setItems] = useState([]);
    const [loai, setLoai] = useState("");
    const [ghiChu, setGhiChu] = useState("");
    const [loading, setLoading] = useState(false);
    const [activePickerIndex, setActivePickerIndex] = useState(null);

    // ===== LOAD DATA =====
    useEffect(() => {
        const fetch = async () => {
            const res = await warehouseApi.getProducts();
            setProducts(res);
        };
        fetch();
    }, []);

    // ===== CRUD ITEM =====
    const addItem = () => {
        setItems([...items, { MaBienThe: "", SoLuong: 0, GiaNhap: 0, stock: 0, productQuery: "" }]);
    };

    const removeItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = async (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === "MaBienThe") {
            const res = await warehouseApi.getStock(value);
            newItems[index].stock = res.SoLuongTon || 0;
            const selectedProduct = products.find((p) => String(p.MaBienThe) === String(value));
            newItems[index].productQuery = selectedProduct ? `${selectedProduct.TenSP} - ${selectedProduct.TenBienThe}` : "";
        }

        if (field === "productQuery") {
            newItems[index].MaBienThe = "";
            newItems[index].stock = 0;
            setActivePickerIndex(index);
        }

        setItems(newItems);
    };

    const handleSelectProduct = async (index, product) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            MaBienThe: product.MaBienThe,
            productQuery: `${product.TenSP} - ${product.TenBienThe}`
        };
        setItems(newItems);
        setActivePickerIndex(null);

        const res = await warehouseApi.getStock(product.MaBienThe);
        setItems((prev) => {
            const next = [...prev];
            next[index].stock = res.SoLuongTon || 0;
            return next;
        });
    };

    const getFilteredProducts = (query) => {
        const keyword = normalizeText(query).trim();
        if (!keyword) return products;

        return products.filter((product) => {
            const haystack = [product.TenSP, product.TenBienThe, product.MaBienThe]
                .map(normalizeText)
                .join(' ');

            return haystack.includes(keyword);
        });
    };

    const getProductByVariantId = (variantId) => {
        return products.find((product) => String(product.MaBienThe) === String(variantId));
    };

    // ===== SUBMIT =====
    const handleSubmit = async () => {
        if (!loai) {
            toast.error("❌ Chưa chọn loại nghiệp vụ", { style: { backgroundColor: '#f44336' } });
            return;
        }
        if (items.length === 0) {
            toast.error("❌ Chưa có sản phẩm", { style: { backgroundColor: '#f44336' } });
            return;
        }

        for (let i of items) {
            if (!i.MaBienThe || i.SoLuong <= 0) {
                toast.error("❌ Dữ liệu sản phẩm không hợp lệ", { style: { backgroundColor: '#f44336' } });
                return;
            }

            if (type === "inbound") {
                const product = getProductByVariantId(i.MaBienThe);
                const priceValidation = getPriceValidation(i, product);
                if (priceValidation.level === "error") {
                    toast.error("❌ Giá nhập không hợp lệ: có sản phẩm đang cao hơn giá bán", {
                        style: { backgroundColor: '#f44336' }
                    });
                    return;
                }
            }

            if (type === "outbound" && i.SoLuong > i.stock) {
                toast.error("❌ Không đủ tồn kho", {
                    style: { backgroundColor: '#f44336' }
                });
                return;
            }
        }

        const payload = {
            Loai: loai,
            GhiChu: ghiChu,
            items: items.map(i => ({
                MaBienThe: Number(i.MaBienThe),
                SoLuong: Number(i.SoLuong),
                GiaNhap: Number(i.GiaNhap || 0)
            }))
        };

        try {
            setLoading(true);

            if (type === "inbound") {
                await warehouseApi.createInbound(payload);
                toast.success("✅ Nhập kho thành công!", {
                    autoClose: 3000,
                    style: { backgroundColor: '#4caf50', color: 'white' }
                });
            } else {
                await warehouseApi.createOutbound(payload);
                toast.success("✅ Xuất kho thành công!", {
                    autoClose: 3000,
                    style: { backgroundColor: '#4caf50', color: 'white' }
                });
            }

            setTimeout(() => {
                navigate("/admin/warehouse");
            }, 1500);

        } catch (err) {
            console.error(err);
            toast.error("❌ Có lỗi xảy ra! Vui lòng thử lại", {
                style: { backgroundColor: '#f44336', color: 'white' }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="log-page-container">
            <button className="back-btn-text" onClick={() => navigate('/admin/warehouse')}>
                ← Quay lại kho hàng
            </button>
            {/* ===== TOAST NOTIFICATIONS ===== */}
            <ToastContainer 
                position="top-right" 
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                className="warehouse-toast-container"
                toastClassName="warehouse-toast"
                bodyClassName="warehouse-toast-body"
            />

            <h1>{type === "inbound" ? "NHẬP KHO" : "XUẤT KHO"}</h1>

            {/* HEADER */}
            <div className="form-card">
                <label>Loại nghiệp vụ</label>
                <select
                    value={loai}
                    onChange={(e) => setLoai(e.target.value)}
                    className={!loai ? "input-error" : ""}
                >
                    {type === "inbound" ? (
                        <>
                            <option value="">-- Loại nhập --</option>
                            <option value="IMPORT">Nhập NCC</option>
                            <option value="RETURN">Hàng trả</option>
                        </>
                    ) : (
                        <>
                            <option value="">-- Loại xuất --</option>
                            <option value="SUPPLIER_RETURN">Trả NCC</option>
                            <option value="DESTROY">Tiêu hủy</option>
                        </>
                    )}
                </select>

                <label>Ghi chú</label>
                <textarea value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
            </div>

            {/* TABLE */}
            <div className="form-card">
                <h3>Danh sách sản phẩm</h3>

                <table>
                    <thead>
                        <tr>
                            <th>Sản phẩm</th>
                            <th>Số lượng</th>
                            {type === "inbound" && <th>Giá nhập</th>}
                            <th>Tồn kho</th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        {items.map((item, index) => (
                            <tr
                                key={index}
                                className={item.SoLuong > item.stock ? "warning-row" : ""}
                            >
                                <td>
                                            <div className="product-picker">
                                                <input
                                                    type="text"
                                                    value={item.productQuery || ''}
                                                    onFocus={() => setActivePickerIndex(index)}
                                                    onChange={(e) => updateItem(index, "productQuery", e.target.value)}
                                                    placeholder="Nhập tên sản phẩm để tìm..."
                                                    autoComplete="off"
                                                />

                                                {activePickerIndex === index && (
                                                    <div className="product-picker-dropdown">
                                                        {getFilteredProducts(item.productQuery).length > 0 ? (
                                                            getFilteredProducts(item.productQuery)
                                                                .slice(0, 20)
                                                                .map((product) => (
                                                                    <button
                                                                        type="button"
                                                                        key={product.MaBienThe}
                                                                        className="product-picker-option"
                                                                        onClick={() => handleSelectProduct(index, product)}
                                                                    >
                                                                        <span className="product-picker-name">{product.TenSP}</span>
                                                                        <span className="product-picker-variant">{product.TenBienThe}</span>
                                                                    </button>
                                                                ))
                                                        ) : (
                                                            <div className="product-picker-empty">Không tìm thấy sản phẩm phù hợp</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                </td>

                                <td>
                                    <input
                                        type="number"
                                        value={item.SoLuong}
                                        onChange={(e) =>
                                            updateItem(index, "SoLuong", e.target.value)
                                        }
                                    />
                                </td>

                                {type === "inbound" && (
                                    <td>
                                        {(() => {
                                            const product = getProductByVariantId(item.MaBienThe);
                                            const priceValidation = getPriceValidation(item, product);

                                            return (
                                                <div className="price-input-cell">
                                                    <input
                                                        type="number"
                                                        value={item.GiaNhap}
                                                        min="0"
                                                        className={priceValidation.level === "error" ? "input-error" : ""}
                                                        onChange={(e) =>
                                                            updateItem(index, "GiaNhap", e.target.value)
                                                        }
                                                    />

                                                    <div className={`price-validation ${priceValidation.level}`}>
                                                        {priceValidation.message}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                )}

                                <td>{item.stock}</td>

                                <td>
                                    <button onClick={() => removeItem(index)}>X</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <button onClick={addItem}>+ Thêm sản phẩm</button>
            </div>

            {/* SUBMIT */}
            <button
                className={`submit-btn ${type === "outbound" ? "outbound" : ""}`}
                onClick={handleSubmit}
                disabled={loading}
            >
                {loading ? "Đang xử lý..." : "Xác nhận"}
            </button>
        </div>
    );
};

export default WarehouseLog;