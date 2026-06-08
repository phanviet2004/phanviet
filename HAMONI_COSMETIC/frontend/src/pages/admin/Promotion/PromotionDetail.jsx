import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosClient from "../../../services/axiosClient";
import "./PromotionDetail.css";

const PromotionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [promoData, setPromoData] = useState({
    TenCTKM: "",
    LoaiGiamGia: "PhanTram",
    GiaTriGiam: "",
    NgayBatDau: "",
    NgayKetThuc: "",
    Banner: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const productRes = await axiosClient.get("promotions/variants-for-promo");
      setAvailableProducts(productRes || []);

      const detailRes = await axiosClient.get(`promotions/${id}`);

      const formattedData = {
        ...detailRes,
        NgayBatDau: detailRes.NgayBatDau
          ? detailRes.NgayBatDau.substring(0, 16)
          : "",
        NgayKetThuc: detailRes.NgayKetThuc
          ? detailRes.NgayKetThuc.substring(0, 16)
          : "",
      };

      setPromoData(formattedData);
      setSelectedVariants(detailRes.danhSachBienThe || []);
    } catch {
      toast.error("Không thể tải thông tin khuyến mãi!");
      navigate("/admin/promotions");
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      fetchInitialData();
    }
  }, [fetchInitialData, id]);

  const groupedProducts = useMemo(() => {
    const filtered = availableProducts.filter((p) =>
      p.TenSP.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    return filtered.reduce((acc, curr) => {
      if (!acc[curr.TenSP]) acc[curr.TenSP] = [];
      acc[curr.TenSP].push(curr);
      return acc;
    }, {});
  }, [availableProducts, searchTerm]);

  const toggleGroupExpand = (productName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [productName]: !prev[productName],
    }));
  };

  const handleSelectAll = (productName, variants) => {
    const variantIds = variants.map((v) => v.MaBienThe);
    const isAllSelected = variantIds.every((vid) =>
      selectedVariants.includes(vid),
    );
    if (isAllSelected) {
      setSelectedVariants((prev) =>
        prev.filter((vid) => !variantIds.includes(vid)),
      );
    } else {
      setSelectedVariants((prev) =>
        Array.from(new Set([...prev, ...variantIds])),
      );
    }
  };

  // --- HÀM LƯU DỮ LIỆU ---
  const handleSave = async (e) => {
    e.preventDefault();

    // === VALIDATE DỮ LIỆU ===
    if (!promoData.TenCTKM?.trim()) {
      toast.warning("Vui lòng nhập tên chương trình!");
      return;
    }

    if (!["PhanTram", "SoTien"].includes(promoData.LoaiGiamGia)) {
      toast.warning("Loại giảm giá không hợp lệ!");
      return;
    }

    if (!promoData.GiaTriGiam || Number(promoData.GiaTriGiam) <= 0) {
      toast.warning("Mức giảm phải lớn hơn 0!");
      return;
    }

    if (
      promoData.LoaiGiamGia === "PhanTram" &&
      Number(promoData.GiaTriGiam) > 100
    ) {
      toast.warning("Giảm theo % không được vượt quá 100%!");
      return;
    }

    if (!promoData.NgayBatDau || !promoData.NgayKetThuc) {
      toast.warning("Vui lòng chọn ngày bắt đầu và kết thúc!");
      return;
    }

    // === VALIDATE LOGIC NGÀY ===
    const startDate = new Date(promoData.NgayBatDau);
    const endDate = new Date(promoData.NgayKetThuc);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      toast.error("Định dạng ngày không hợp lệ!");
      return;
    }

    if (endDate <= startDate) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }

    // === VALIDATE SẢN PHẨM ===
    if (selectedVariants.length === 0) {
      toast.warning("Vui lòng chọn ít nhất 1 sản phẩm!");
      return;
    }

    try {
      const payload = {
        ...promoData,
        TenCTKM: promoData.TenCTKM.trim(),
        GiaTriGiam: Number(promoData.GiaTriGiam),
        danhSachBienThe: selectedVariants,
      };
      await axiosClient.put(`promotions/${id}`, payload);
      toast.success("Cập nhật thay đổi thành công!");
    } catch (error) {
      console.error("Lỗi Save:", error);
      const errorMsg =
        error?.response?.data?.message || "Lỗi khi cập nhật dữ liệu!";
      toast.error(errorMsg);
    }
  };

  // --- HÀM XÓA DỮ LIỆU TỪ MODAL ---
  const executeDelete = async () => {
    setShowDeleteModal(false); // Đóng Modal ngay lập tức
    try {
      await axiosClient.delete(`promotions/${id}`);
      toast.success("Đã xóa chương trình khuyến mãi vĩnh viễn!");

      // Đợi 2 giây để Toast hiển thị rồi mới chuyển trang
      setTimeout(() => {
        navigate("/admin/promotions");
      }, 2000);
    } catch (error) {
      console.error("Lỗi Delete:", error);
      const serverMessage = error?.response?.data?.message;
      toast.error(serverMessage || "Lỗi khi xóa khuyến mãi!");
    }
  };

  // --- TÍNH TOÁN TRẠNG THÁI THEO NGÀY GIỜ ---
  const getStatusLabel = () => {
    const now = new Date();
    const start = new Date(promoData.NgayBatDau);
    const end = new Date(promoData.NgayKetThuc);

    if (now < start) return <span className="badge upcoming">Sắp diễn ra</span>;
    if (now > end) return <span className="badge ended">Đã kết thúc</span>;
    return <span className="badge active">Đang hoạt động</span>;
  };

  if (isLoading)
    return <div className="loading-screen">Đang tải dữ liệu...</div>;

  return (
    <div className="promo-dashboard">
      <div className="page-header">
        <div className="header-left-group">
          <button
            className="btn-back"
            onClick={() => navigate("/admin/promotions")}
          >
            ←
          </button>
          <h1 className="page-title">CHI TIẾT: {promoData.TenCTKM}</h1>
          {getStatusLabel()}
        </div>
      </div>

      <form onSubmit={handleSave} className="promo-create-layout">
        <div className="left-column">
          <div className="form-card">
            <h3>1. Cấu hình chương trình</h3>
            <div className="form-group">
              <label>Tên chương trình</label>
              <input
                type="text"
                value={promoData.TenCTKM}
                onChange={(e) =>
                  setPromoData({ ...promoData, TenCTKM: e.target.value })
                }
                required
              />
            </div>
            <div className="form-grid-2 mt-3">
              <div className="form-group">
                <label>Loại giảm</label>
                <select
                  value={promoData.LoaiGiamGia}
                  onChange={(e) =>
                    setPromoData({ ...promoData, LoaiGiamGia: e.target.value })
                  }
                >
                  <option value="PhanTram">Phần trăm (%)</option>
                  <option value="SoTien">Số tiền (VNĐ)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Giá trị</label>
                <input
                  type="number"
                  value={promoData.GiaTriGiam}
                  onChange={(e) =>
                    setPromoData({ ...promoData, GiaTriGiam: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="form-grid-2 mt-3">
              <div className="form-group">
                <label>Bắt đầu</label>
                <input
                  type="datetime-local"
                  value={promoData.NgayBatDau}
                  onChange={(e) =>
                    setPromoData({ ...promoData, NgayBatDau: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Kết thúc</label>
                <input
                  type="datetime-local"
                  value={promoData.NgayKetThuc}
                  onChange={(e) =>
                    setPromoData({ ...promoData, NgayKetThuc: e.target.value })
                  }
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-actions-column">
            <button type="submit" className="btn-save-main">
              LƯU THAY ĐỔI
            </button>
            <div className="danger-zone">
              <p>Hành động nguy hiểm</p>
              <button
                type="button"
                className="btn-delete-promo"
                onClick={() => setShowDeleteModal(true)}
              >
                🗑️ Xóa chương trình khuyến mãi
              </button>
            </div>
          </div>
        </div>

        <div className="right-column">
          <div className="form-card product-card-container">
            <div className="product-header-tools">
              <h3>2. Danh sách sản phẩm áp dụng ({selectedVariants.length})</h3>
            </div>
            <div className="product-search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="product-list-vertical custom-scroll">
              {Object.entries(groupedProducts).map(([name, variants]) => {
                const count = variants.filter((v) =>
                  selectedVariants.includes(v.MaBienThe),
                ).length;
                const isExpanded = expandedGroups[name];
                return (
                  <div
                    key={name}
                    className={`product-group-row ${isExpanded ? "expanded" : ""}`}
                  >
                    <div className="product-group-header">
                      <div
                        className="header-left-toggle"
                        onClick={() => toggleGroupExpand(name)}
                      >
                        <span>{isExpanded ? "▼" : "▶"}</span>
                      </div>
                      <label className="header-checkbox-group">
                        <input
                          type="checkbox"
                          checked={
                            count === variants.length && variants.length > 0
                          }
                          onChange={() => handleSelectAll(name, variants)}
                        />
                        <span className="product-name-title">{name}</span>
                      </label>
                      <div className="header-counter">
                        <span
                          className={`counter-badge ${count > 0 ? "has-selected" : ""}`}
                        >
                          {count}/{variants.length}
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="variants-grid-2-col">
                        {variants.map((v) => (
                          <label key={v.MaBienThe} className="variant-item">
                            <input
                              type="checkbox"
                              checked={selectedVariants.includes(v.MaBienThe)}
                              onChange={() =>
                                setSelectedVariants((prev) =>
                                  prev.includes(v.MaBienThe)
                                    ? prev.filter((vid) => vid !== v.MaBienThe)
                                    : [...prev, v.MaBienThe],
                                )
                              }
                            />
                            <span>{v.TenBienThe}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </form>

      {/* MODAL XÁC NHẬN XÓA */}
      {showDeleteModal && (
        <div className="delete-modal-overlay">
          <div className="delete-modal-box">
            <div className="modal-warning-icon">⚠️</div>
            <h3>Xóa chương trình này?</h3>
            <p>
              Bạn đang chuẩn bị xóa <strong>{promoData.TenCTKM}</strong>. Hành
              động này không thể hoàn tác và dữ liệu sẽ bị mất vĩnh viễn khỏi hệ
              thống.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={executeDelete}
              >
                Vâng, Xóa ngay!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Đừng quên di chuyển <ToastContainer /> sang App.jsx nếu muốn tối ưu 100% */}
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

export default PromotionDetail;
