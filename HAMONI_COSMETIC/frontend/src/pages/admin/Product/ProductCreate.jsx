import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  UploadCloud,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import axiosClient from "../../../services/axiosClient";
import "./ProductCreate.css";

const ProductCreate = () => {
  const navigate = useNavigate();

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [product, setProduct] = useState({
    TenSP: "",
    MaDM: "",
    LoaiDaPhuHop: "",
    MoTa: "",
    ThanhPhan: "",
    CachSuDung: "",
  });

  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [newVariant, setNewVariant] = useState({ TenBienThe: "", Gia: "" });

  // --- STATE CHO BOOTSTRAP TOAST ---
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const catRes = await axiosClient.get("/categories");
        const catData = catRes.data || catRes || [];
        setCategories(catData);
        if (catData.length > 0) {
          setProduct((prev) => ({ ...prev, MaDM: catData[0].MaDM }));
        }
      } catch (error) {
        console.error("Lỗi tải danh mục:", error);
      }
    };
    loadCategories();
  }, []);

  const handleInfoChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  // CẬP NHẬT: Hàm xử lý upload nhiều ảnh cùng lúc
  const handleUploadImage = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("image", file);

        const uploadRes = await axiosClient.post("/upload", formData);

        return {
          MaHinhAnh: Date.now() + index + Math.random(),
          DuongDanAnh: uploadRes.url || uploadRes.data?.url,
        };
      });

      const newUploadedImages = await Promise.all(uploadPromises);

      setImages((prevImages) => [...prevImages, ...newUploadedImages]);
      showToast(`Đã tải lên thành công ${newUploadedImages.length} ảnh!`);
    } catch (error) {
      showToast("Lỗi tải ảnh lên hệ thống!", "danger");
      console.error(error);
    } finally {
      setIsUploading(false);
      e.target.value = null; // Reset lại input file
    }
  };

  const handleDeleteImage = (imageId) => {
    setImages(images.filter((img) => img.MaHinhAnh !== imageId));
    showToast("Đã xóa ảnh tạm thời", "success");
  };

  const handleAddVariant = () => {
    if (!newVariant.TenBienThe || !newVariant.Gia) {
      return showToast("Vui lòng nhập đầy đủ tên và giá!", "danger");
    }
    const tempId = Date.now();
    setVariants([...variants, { MaBienThe: tempId, ...newVariant }]);
    setNewVariant({ TenBienThe: "", Gia: "" });
    showToast("Đã thêm phân loại tạm thời");
  };

  const handleDeleteVariant = (variantId) => {
    setVariants(variants.filter((v) => v.MaBienThe !== variantId));
    showToast("Đã xóa phân loại");
  };

  const handleSaveNewProduct = async () => {
    if (!product.TenSP || !product.MaDM) {
      return showToast("Vui lòng nhập Tên SP và chọn Danh mục!", "danger");
    }
    setIsSaving(true);
    try {
      const payload = {
        productInfo: product,
        images: images.map((img) => img.DuongDanAnh),
        variants: variants.map((v) => ({
          TenBienThe: v.TenBienThe,
          Gia: v.Gia,
        })),
      };
      await axiosClient.post("/products", payload);
      showToast("Tạo sản phẩm mới thành công!");
      setTimeout(() => navigate("/admin/products"), 1500);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Lỗi khi lưu sản phẩm mới!";
      showToast(errorMessage, "danger");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="product-create-container">
      {/* THÔNG BÁO TOAST BOOTSTRAP */}
      {toast.show && (
        <div
          className="toast-container position-fixed top-0 end-0 p-4"
          style={{ zIndex: 9999 }}
        >
          <div
            className="toast show border-0 shadow-lg"
            style={{
              borderRadius: "12px",
              minWidth: "320px",
              overflow: "hidden",
              backgroundColor: toast.type === "success" ? "#aee6bd" : "#e49289",
              borderLeft: `6px solid ${toast.type === "success" ? "#28a745" : "#df1a2d"}`,
            }}
          >
            <div className="d-flex align-items-center p-3">
              <div
                className={`me-3 text-${toast.type === "success" ? "success" : "danger"}`}
              >
                {toast.type === "success" ? (
                  <CheckCircle size={28} />
                ) : (
                  <AlertCircle size={28} />
                )}
              </div>
              <div className="flex-grow-1">
                <span
                  className="fw-bold"
                  style={{
                    fontSize: "15px",
                    color: toast.type === "success" ? "#1e4620" : "#be291e",
                  }}
                >
                  {toast.message}
                </span>
              </div>
              <button
                type="button"
                className="btn-close ms-2"
                onClick={() => setToast({ ...toast, show: false })}
              ></button>
            </div>
          </div>
        </div>
      )}

      <div className="create-header">
        <div className="d-flex align-items-center gap-3">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="m-0 fw-bold text-success">THÊM SẢN PHẨM MỚI</h2>
        </div>
      </div>

      <div className="create-layout">
        <div className="create-left-col">
          <div className="create-card">
            <h5 className="card-title">Thông tin cơ bản</h5>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>
                  Tên sản phẩm mỹ phẩm <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="TenSP"
                  value={product.TenSP}
                  onChange={handleInfoChange}
                  placeholder="Nhập tên sản phẩm..."
                />
              </div>
              <div className="form-group">
                <label>
                  Danh mục <span className="text-danger">*</span>
                </label>
                <select
                  name="MaDM"
                  value={product.MaDM}
                  onChange={handleInfoChange}
                >
                  <option value="" disabled>
                    -- Chọn danh mục --
                  </option>
                  {categories.map((c) => (
                    <option key={c.MaDM} value={c.MaDM}>
                      {c.TenDM}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Loại da phù hợp</label>
                <input
                  type="text"
                  name="LoaiDaPhuHop"
                  value={product.LoaiDaPhuHop}
                  onChange={handleInfoChange}
                  placeholder="VD: Mọi loại da..."
                />
              </div>
              <div className="form-group full-width">
                <label>Mô tả chi tiết</label>
                <textarea
                  name="MoTa"
                  rows="6"
                  value={product.MoTa}
                  onChange={handleInfoChange}
                  placeholder="Nhập mô tả sản phẩm..."
                ></textarea>
              </div>
              <div className="form-group full-width">
                <label>Thành phần chính</label>
                <textarea
                  name="ThanhPhan"
                  rows="4"
                  value={product.ThanhPhan}
                  onChange={handleInfoChange}
                  placeholder="VD: ZinC, Vitamin C..."
                ></textarea>
              </div>
              <div className="form-group full-width">
                <label>Cách sử dụng</label>
                <textarea
                  name="CachSuDung"
                  rows="4"
                  value={product.CachSuDung}
                  onChange={handleInfoChange}
                  placeholder="Hướng dẫn sử dụng..."
                ></textarea>
              </div>
            </div>

            <div className="save-action-bar">
              <button
                className="btn-save-primary"
                onClick={handleSaveNewProduct}
                disabled={isSaving}
              >
                <Save size={18} />{" "}
                {isSaving ? "Đang tạo..." : "Lưu sản phẩm mới"}
              </button>
            </div>
          </div>
        </div>

        <div className="create-right-col d-flex flex-column gap-4">
          <div className="create-card">
            <h5 className="card-title mb-3">Thư viện ảnh</h5>
            <div className="image-gallery-grid">
              <label className={`upload-card ${isUploading ? "loading" : ""}`}>
                {isUploading ? (
                  <div
                    className="spinner-border spinner-border-sm text-secondary"
                    role="status"
                  ></div>
                ) : (
                  <>
                    <UploadCloud size={24} className="mb-2 text-muted" />
                    <span>Thêm ảnh</span>
                  </>
                )}
                {/* CẬP NHẬT: Thêm multiple */}
                <input
                  type="file"
                  multiple
                  hidden
                  accept="image/*"
                  onChange={handleUploadImage}
                  disabled={isUploading}
                />
              </label>

              {images.map((img) => (
                <div key={img.MaHinhAnh} className="image-item">
                  <img src={img.DuongDanAnh} alt="product" />
                  <button
                    className="btn-delete-img"
                    onClick={() => handleDeleteImage(img.MaHinhAnh)}
                    title="Xóa ảnh này"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="create-card">
            <h5 className="card-title mb-3">Phân loại & Giá bán</h5>
            <div className="add-variant-compact">
              <input
                type="text"
                className="variant-name-input"
                placeholder="Tên phân loại..."
                value={newVariant.TenBienThe}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, TenBienThe: e.target.value })
                }
              />
              <input
                type="number"
                className="variant-price-input"
                placeholder="Giá bán (VNĐ)"
                value={newVariant.Gia}
                onChange={(e) =>
                  setNewVariant({ ...newVariant, Gia: e.target.value })
                }
              />
              <button className="btn-add-variant" onClick={handleAddVariant}>
                <Plus size={16} /> Thêm
              </button>
            </div>

            <div className="table-responsive mt-3">
              <table className="variant-table w-100">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>PHÂN LOẠI</th>
                    <th style={{ textAlign: "left" }}>GIÁ BÁN</th>
                    <th style={{ textAlign: "right" }}>XÓA</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-4 text-muted">
                        Chưa có phân loại.
                      </td>
                    </tr>
                  ) : (
                    variants.map((v) => (
                      <tr key={v.MaBienThe}>
                        <td className="fw-medium text-start">{v.TenBienThe}</td>
                        <td className="fw-bold text-danger text-nowrap text-start">
                          {Number(v.Gia).toLocaleString("vi-VN")}đ
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn-delete-variant-mini"
                            onClick={() => handleDeleteVariant(v.MaBienThe)}
                            title="Xóa phân loại"
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCreate;
