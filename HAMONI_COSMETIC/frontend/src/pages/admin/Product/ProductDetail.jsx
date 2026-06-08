import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  UploadCloud,
  Trash2,
  Plus,
  Edit2,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";
import axiosClient from "../../../services/axiosClient";
import "./ProductDetail.css";

// CẤU HÌNH SWEETALERT CHO GIAO DIỆN SANG TRỌNG
const swalCustom = Swal.mixin({
  customClass: {
    popup: "!bg-white !rounded-[24px] !shadow-2xl !border !border-slate-100",
    title: "!text-xl !font-black !text-slate-800 !mt-2",
    htmlContainer: "!text-sm !text-slate-500 !mt-1",
    actions: "!gap-3 !w-full !mt-6",
    confirmButton:
      "!bg-rose-500 hover:!bg-rose-600 !text-white !rounded-xl !px-6 !py-2.5 !font-semibold !transition-all !border-0 !shadow-sm !outline-none !m-0",
    cancelButton:
      "!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !px-6 !py-2.5 !font-semibold !transition-all !border-0 !outline-none !m-0",
    backdrop: "backdrop-blur-sm !bg-slate-900/30",
  },
  buttonsStyling: false,
});

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // PHÂN QUYỀN
  const userPermissions = JSON.parse(
    localStorage.getItem("userPermissions") || "[]",
  );
  const userInfo = JSON.parse(localStorage.getItem("user") || "{}");
  const canDeleteProduct =
    userInfo?.maQuyen === "ADMIN" ||
    userPermissions.includes("ALL") ||
    userPermissions.includes("DELETE_PRODUCT");

  // STATE CHUNG
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [categories, setCategories] = useState([]);

  // STATE DỮ LIỆU SẢN PHẨM
  const [product, setProduct] = useState({});
  const [originalProduct, setOriginalProduct] = useState({});
  const [images, setImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [variants, setVariants] = useState([]);

  // STATE THÊM / SỬA BIẾN THỂ
  const [newVariant, setNewVariant] = useState({ TenBienThe: "", Gia: "" });
  const [editingVariant, setEditingVariant] = useState(null);

  // ===== TẢI DỮ LIỆU =====
  const loadData = useCallback(async () => {
    try {
      const catRes = await axiosClient.get("/categories");
      setCategories(catRes.data || catRes || []);

      const res = await axiosClient.get(`/products/${id}`);
      const fetchedInfo = res.info || res.data?.info || {};

      setProduct(fetchedInfo);
      setOriginalProduct(fetchedInfo);
      const fetchedImages = res.images || res.data?.images || [];
      setImages(fetchedImages);
      setOriginalImages(fetchedImages);
      setVariants(res.variants || res.data?.variants || []);
    } catch (error) {
      console.error("Lỗi tải chi tiết:", error);
      toast.error("Không thể tải thông tin sản phẩm!");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== XỬ LÝ THAY ĐỔI INFO =====
  const handleInfoChange = (e) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSaveInfo = async () => {
    // Hàm kiểm tra cho các trường dữ liệu dạng chuỗi (text)
    const isDifferent = (val1, val2) =>
      String(val1 || "").trim() !== String(val2 || "").trim();

    // 1. Kiểm tra các trường text cơ bản
    const hasTextChanged =
      isDifferent(product.TenSP, originalProduct.TenSP) ||
      isDifferent(product.MaDM, originalProduct.MaDM) ||
      isDifferent(product.LoaiDaPhuHop, originalProduct.LoaiDaPhuHop) ||
      isDifferent(product.MoTa, originalProduct.MoTa) ||
      isDifferent(product.ThanhPhan, originalProduct.ThanhPhan) ||
      isDifferent(product.CachSuDung, originalProduct.CachSuDung);

    // 2. Kiểm tra thay đổi ảnh
    // TRƯỜNG HỢP A: Nếu ảnh lưu dạng URL/chuỗi trong object product (VD: product.DuongDanAnh hoặc product.image)
    const hasImageStringChanged = isDifferent(
      product.DuongDanAnh,
      originalProduct.DuongDanAnh,
    );
    const hasImagesChanged =
      images.length !== originalImages.length ||
      images.some(
        (img, index) =>
          img.MaHinhAnh !== originalImages[index]?.MaHinhAnh ||
          img.DuongDanAnh !== originalImages[index]?.DuongDanAnh,
      );
    /* (Lưu ý: Thay 'DuongDanAnh' bằng key thực tế bạn đang dùng, ví dụ: product.image) */

    // TRƯỜNG HỢP B: Nếu bạn có một state riêng biệt chứa File ảnh khi người dùng upload lên (VD: const [imageFile, setImageFile] = useState(null))
    // const hasNewFileUpload = imageFile !== null;

    // Tổng hợp điều kiện: Có thay đổi text HOẶC có thay đổi URL ảnh HOẶC có file ảnh mới
    const hasChanged =
      hasTextChanged || hasImageStringChanged || hasImagesChanged;
    // Nếu có dùng state file rời thì đổi thành: const hasChanged = hasTextChanged || hasImageStringChanged || hasNewFileUpload;

    if (!hasChanged) {
      return toast.warning("Chưa có thay đổi nào để lưu!");
    }

    setIsSaving(true);
    try {
      // Nếu có gửi file ảnh lên server, thường bạn sẽ phải dùng FormData thay vì gửi trực tiếp JSON object
      // Nhưng nếu chỉ gửi URL dạng chuỗi thì giữ nguyên như cũ:
      await axiosClient.put(`/products/${id}`, product);

      toast.success("Đã lưu thông tin sản phẩm thành công!");

      // Cập nhật lại bản gốc sau khi lưu thành công
      setOriginalProduct(product);

      // Nếu có dùng state file rời (Trường hợp B), nhớ reset nó sau khi lưu:
      // setImageFile(null);
    } catch (error) {
      const message =
        error?.response?.data?.message || "Lỗi khi lưu thông tin!";
      toast.error(message);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // ===== QUẢN LÝ ẢNH =====
  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);
    setIsUploading(true);

    try {
      const uploadRes = await axiosClient.post("/upload", formData);

      const dbRes = await axiosClient.post(`/products/${id}/images`, {
        DuongDanAnh: uploadRes.url,
      });

      const newImageId = dbRes.MaHinhAnh || dbRes.data?.MaHinhAnh;
      setImages([
        ...images,
        { MaHinhAnh: newImageId, DuongDanAnh: uploadRes.url },
      ]);
      toast.success("Đã thêm ảnh mới thành công!");
    } catch (error) {
      toast.error("Không thể tải ảnh lên hệ thống!");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    const result = await swalCustom.fire({
      title: "Xóa ảnh này?",
      text: "Bạn có chắc chắn muốn xóa ảnh này khỏi thư viện sản phẩm?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đồng ý, xóa!",
      cancelButtonText: "Quay lại",
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.delete(`/products/images/${imageId}`);
      setImages(images.filter((img) => img.MaHinhAnh !== imageId));
      toast.success("Đã xóa ảnh thành công!");
    } catch {
      toast.error("Không thể xóa ảnh!");
    }
  };

  // ===== QUẢN LÝ BIẾN THỂ (PHÂN LOẠI) =====
  const handleAddVariant = async () => {
    if (!newVariant.TenBienThe || !newVariant.Gia) {
      return toast.warning("Vui lòng nhập tên phân loại và giá bán!");
    }

    try {
      const res = await axiosClient.post(
        `/products/${id}/variants`,
        newVariant,
      );
      const newVariantId = res.MaBienThe || res.data?.MaBienThe;
      setVariants([...variants, { MaBienThe: newVariantId, ...newVariant }]);
      setNewVariant({ TenBienThe: "", Gia: "" });
      toast.success("Đã thêm phân loại mới!");
    } catch (error) {
      toast.error("Không thể thêm phân loại mới!");
      console.error(error);
    }
  };

  const handleDeleteVariant = async (variant) => {
    const result = await swalCustom.fire({
      title: "Cảnh báo xóa phân loại!",
      text: `Bạn có chắc muốn xóa phân loại "${variant.TenBienThe}"? Việc này có thể ảnh hưởng đến đơn hàng cũ.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Tiếp tục xóa",
      cancelButtonText: "Hủy bỏ",
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.delete(`/products/variants/${variant.MaBienThe}`);
      setVariants(variants.filter((v) => v.MaBienThe !== variant.MaBienThe));
      toast.success("Đã xóa phân loại thành công!");
    } catch (error) {
      toast.error(
        "Không thể xóa phân loại. Có thể đang vướng dữ liệu đơn hàng.",
      );
      console.error(error);
    }
  };

  // Tính năng sửa biến thể inline
  const startEditVariant = (variant) => {
    setEditingVariant({ ...variant });
  };
  const cancelEditVariant = () => {
    setEditingVariant(null);
  };
  const handleUpdateVariant = async (variantId) => {
    if (!editingVariant.TenBienThe || !editingVariant.Gia) {
      return toast.warning("Vui lòng nhập tên phân loại và giá bán!");
    }
    try {
      await axiosClient.put(`/products/variants/${variantId}`, {
        TenBienThe: editingVariant.TenBienThe,
        Gia: editingVariant.Gia,
      });
      setVariants(
        variants.map((v) => (v.MaBienThe === variantId ? editingVariant : v)),
      );
      setEditingVariant(null);
      toast.success("Đã cập nhật phân loại thành công!");
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không thể cập nhật phân loại!",
      );
    }
  };

  // ===== XÓA TOÀN BỘ SẢN PHẨM =====
  const handleDeleteProduct = async () => {
    if (!canDeleteProduct) {
      toast.warning("Bạn không có quyền xóa sản phẩm!");
      return;
    }

    const result = await swalCustom.fire({
      title: "Xóa sản phẩm?",
      text: `Hành động này không thể hoàn tác. Toàn bộ dữ liệu về "${product.TenSP}" sẽ bị xóa sạch!`,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Vâng, xóa vĩnh viễn!",
      cancelButtonText: "Quay lại",
    });

    if (!result.isConfirmed) return;

    try {
      await axiosClient.delete(`/products/${id}`);
      await swalCustom.fire({
        title: "Thành công!",
        text: "Sản phẩm đã được xóa khỏi hệ thống.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false,
      });
      navigate("/admin/products");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể xóa sản phẩm!");
    }
  };

  if (loading)
    return (
      <div className="p-5 text-center fw-bold text-muted mt-5">
        Đang tải dữ liệu sản phẩm...
      </div>
    );

  return (
    <div className="product-detail-container">
      {/* HEADER */}
      <div className="detail-header">
        <div className="d-flex align-items-center gap-3">
          <button className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h2 className="m-0 fw-bold"> {String(product.TenSP || "")}</h2>
        </div>
        {canDeleteProduct && (
          <button
            className="btn btn-danger d-flex align-items-center gap-2"
            onClick={handleDeleteProduct}
          >
            <Trash2 size={16} /> Xóa sản phẩm
          </button>
        )}
      </div>

      <div className="detail-layout">
        {/* COLUMN TRÁI: THÔNG TIN CƠ BẢN */}
        <div className="left-col">
          <div className="detail-card">
            <h5 className="card-title">Thông tin cơ bản</h5>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Tên sản phẩm mỹ phẩm</label>
                <input
                  type="text"
                  name="TenSP"
                  value={product.TenSP || ""}
                  onChange={handleInfoChange}
                />
              </div>
              <div className="form-group">
                <label>Danh mục</label>
                <select
                  name="MaDM"
                  value={product.MaDM || ""}
                  onChange={handleInfoChange}
                >
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
                  value={product.LoaiDaPhuHop || ""}
                  onChange={handleInfoChange}
                />
              </div>
              <div className="form-group full-width">
                <label>Mô tả chi tiết</label>
                <textarea
                  name="MoTa"
                  rows="6"
                  value={product.MoTa || ""}
                  onChange={handleInfoChange}
                ></textarea>
              </div>
              <div className="form-group full-width">
                <label>Thành phần chính</label>
                <textarea
                  name="ThanhPhan"
                  rows="4"
                  value={product.ThanhPhan || ""}
                  onChange={handleInfoChange}
                />
              </div>
              <div className="form-group full-width">
                <label>Cách sử dụng</label>
                <textarea
                  name="CachSuDung"
                  rows="4"
                  value={product.CachSuDung || ""}
                  onChange={handleInfoChange}
                />
              </div>
            </div>
            <div className="save-action-bar">
              <button
                className="btn-save-primary"
                onClick={handleSaveInfo}
                disabled={isSaving}
              >
                <Save size={18} />{" "}
                {isSaving ? "Đang lưu..." : "Lưu thay đổi thông tin"}
              </button>
            </div>
          </div>
        </div>

        {/* COLUMN PHẢI: ẢNH VÀ BIẾN THỂ */}
        <div className="right-col">
          {/* QUẢN LÝ ẢNH */}
          <div className="detail-card">
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
                <input
                  type="file"
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
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* QUẢN LÝ PHÂN LOẠI / BIẾN THỂ */}
          <div className="detail-card mt-4">
            <h5 className="card-title mb-3">Phân loại & Giá bán</h5>

            {/* THÊM BIẾN THỂ */}
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

            {/* BẢNG BIẾN THỂ */}
            <div className="table-responsive mt-3">
              <table className="variant-table w-100">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>PHÂN LOẠI</th>
                    <th style={{ textAlign: "left" }}>GIÁ BÁN</th>
                    <th style={{ textAlign: "right" }}>THAO TÁC</th>
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
                        {editingVariant?.MaBienThe === v.MaBienThe ? (
                          // ===== CHẾ ĐỘ SỬA =====
                          <>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={editingVariant.TenBienThe}
                                onChange={(e) =>
                                  setEditingVariant({
                                    ...editingVariant,
                                    TenBienThe: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                value={editingVariant.Gia}
                                onChange={(e) =>
                                  setEditingVariant({
                                    ...editingVariant,
                                    Gia: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td
                              style={{ textAlign: "right" }}
                              className="d-flex justify-content-end gap-1"
                            >
                              <button
                                className="btn btn-sm btn-success p-1"
                                onClick={() => handleUpdateVariant(v.MaBienThe)}
                                title="Lưu"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="btn btn-sm btn-secondary p-1"
                                onClick={cancelEditVariant}
                                title="Hủy"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </>
                        ) : (
                          // ===== CHẾ ĐỘ XEM =====
                          <>
                            <td className="fw-medium text-start">
                              {v.TenBienThe}
                            </td>
                            <td className="fw-bold text-danger text-nowrap text-start">
                              {Number(v.Gia).toLocaleString("vi-VN")}đ
                            </td>
                            <td
                              style={{ textAlign: "right" }}
                              className="d-flex justify-content-end gap-2"
                            >
                              <button
                                className="btn-delete-variant-mini text-primary bg-transparent border-0"
                                onClick={() => startEditVariant(v)}
                                title="Sửa"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="btn-delete-variant-mini text-danger bg-transparent border-0"
                                onClick={() => handleDeleteVariant(v)}
                                title="Xóa"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

export default ProductDetail;
