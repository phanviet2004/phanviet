import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosClient from "../../../services/axiosClient";
import orderApi from "../../../services/orderApi";
import ProductReview from "../ProductReview/ProductReview";
import { checkReviewHistory } from "../../../services/productreviewApi";
import "./OrderDetails.css";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewingProduct, setReviewingProduct] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Dùng LocalStorage để lưu trạng thái đánh giá (Từ Bản 1)
  const [reviewedProducts, setReviewedProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(`HAMONI_REVIEWED_ORDER_${id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const mountedRef = useRef(true);
  const productIdCacheRef = useRef(new Map());

  const fetchOrder = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!id) return;
      if (!silent) setLoading(true);

      try {
        const data = await axiosClient.get(`/orderdetails/${id}`);
        if (mountedRef.current) {
          setOrder(data);
          if (!silent) setError(null);
        }
      } catch (err) {
        console.error(err);
        if (mountedRef.current && !silent) {
          setError(err?.response?.data?.message || "Lỗi tải đơn hàng");
        }
      } finally {
        if (mountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [id],
  );

  const resolveProductIdFromName = useCallback(async (name) => {
    const normalizedName = String(name || "").trim();
    if (!normalizedName) return null;

    const cached = productIdCacheRef.current.get(normalizedName);
    if (cached) return cached;

    try {
      const response = await axiosClient.get("/products", {
        params: { search: normalizedName, page: 1, limit: 20 },
      });

      const products = Array.isArray(response?.data) ? response.data : [];
      const normalizedLower = normalizedName.toLowerCase();
      const exactMatch = products.find(
        (p) =>
          String(p?.TenSP || "")
            .trim()
            .toLowerCase() === normalizedLower,
      );
      const fallbackMatch = products.find((p) =>
        String(p?.TenSP || "")
          .trim()
          .toLowerCase()
          .includes(normalizedLower),
      );
      const matched = exactMatch || fallbackMatch;
      const foundId = matched?.MaSP ?? null;

      if (foundId) {
        productIdCacheRef.current.set(normalizedName, foundId);
      }

      return foundId;
    } catch (err) {
      console.warn("Không thể dò mã sản phẩm từ tên:", err);
      return null;
    }
  }, []);

  // Quét API đồng loạt để check trạng thái đánh giá (Từ Bản 1)
  useEffect(() => {
    const checkReviewedProducts = async () => {
      if (!order?.chiTiet?.length) return;

      const userData = localStorage.getItem("user")
        ? JSON.parse(localStorage.getItem("user"))
        : {};
      const MaND = userData?.MaND || userData?.id || userData?.MaKhachHang;

      if (!MaND) return;

      const currentLocalKey = `HAMONI_REVIEWED_ORDER_${order.id}`;
      const reviewedMap = {};
      let hasUpdate = false;

      const checkPromises = order.chiTiet.map(async (item) => {
        const tenSP = String(
          item.TenSP || item.tenSP || item.tenSanPham || item.name || "",
        ).trim();
        const MaSPToCallApi =
          item.MaSP ||
          item.maSP ||
          item.id ||
          (await resolveProductIdFromName(tenSP));

        if (MaSPToCallApi) {
          try {
            const response = await checkReviewHistory(
              order.id,
              MaSPToCallApi,
              MaND,
            );
            if (response?.hasReview) {
              reviewedMap[tenSP] = true;
              hasUpdate = true;
            }
          } catch (err) {
            console.warn(`Lỗi check SP: ${tenSP}`, err);
          }
        }
      });

      await Promise.all(checkPromises);

      if (hasUpdate) {
        setReviewedProducts(reviewedMap);
        localStorage.setItem(currentLocalKey, JSON.stringify(reviewedMap));
      }
    };

    checkReviewedProducts();
  }, [order, resolveProductIdFromName]);

  // Xử lý mở Modal đánh giá và logic fix Ảnh (Từ Bản 1)
  const handleReviewProduct = async (product, imageUrl) => {
    const userData = localStorage.getItem("user")
      ? JSON.parse(localStorage.getItem("user"))
      : {};
    const MaND = userData?.MaND || userData?.id || userData?.MaKhachHang;
    const tenSP = String(
      product.TenSP ||
        product.tenSP ||
        product.tenSanPham ||
        product.name ||
        "",
    ).trim();

    const MaSPDirect =
      product.MaSP ||
      product.maSP ||
      product.id ||
      product.productId ||
      product.MaSanPham ||
      product.ma_sp ||
      product.masp;
    const MaSPResolved = MaSPDirect || (await resolveProductIdFromName(tenSP));

    if (!MaSPResolved) {
      alert(
        `Không thể lấy mã sản phẩm.\n\nKeys có sẵn: ${Object.keys(product).join(", ")}\n\nVui lòng liên hệ admin.`,
      );
      return;
    }

    let finalImage =
      product.DuongDanAnh ||
      product.image ||
      product.hinhAnh ||
      product.anh ||
      imageUrl;

    if (typeof finalImage === "string" && finalImage.startsWith("[")) {
      try {
        finalImage = JSON.parse(finalImage)[0];
      } catch (error) {
        console.log(error);
      }
    }

    if (
      !finalImage ||
      finalImage === "/placeholder.png" ||
      finalImage === "null"
    ) {
      finalImage =
        "https://dummyimage.com/400x600/f0f0f0/999999.png&text=No+Image";
    }

    setReviewingProduct({
      MaSP: MaSPResolved,
      tenSP: tenSP || "Sản phẩm",
      DuongDanAnh: finalImage,
      MaND,
      MaDH: order?.id,
      trangThaiDonHang: order?.trangThai,
    });
  };

  const handleReviewClose = () => {
    setReviewingProduct(null);
  };

  // Xử lý Hủy đơn hàng
  const handleCancelOrder = async () => {
    if (!order?.id) return;
    setShowCancelConfirm(true);
  };

  const confirmCancelOrder = async () => {
    setShowCancelConfirm(false);

    try {
      const response = await orderApi.cancelOrder({ orderId: order.id });

      if (response?.data?.newStatus === "DaHuy" || response?.message) {
        if (response?.data?.hasCassoPayment) {
          toast.info(
            <div className="refund-toast-container">
              <div className="refund-toast-icon">ℹ️</div>
              <div className="refund-toast-content">
                <div className="refund-toast-title">
                  Đơn hàng đã được hủy thành công!
                </div>
                <div className="refund-toast-message">
                  Số tiền của bạn sẽ được hoàn lại sau 24 giờ.
                  <br />
                  Nếu chưa nhận được, vui lòng liên hệ.
                </div>
              </div>
            </div>,
            {
              position: "top-right",
              autoClose: false,
              closeButton: true,
              pauseOnHover: false,
              className: "refund-toast",
            },
          );
        } else {
          toast.success("Đơn hàng đã được hủy thành công!", {
            position: "top-right",
            autoClose: 2000,
            closeButton: true,
          });
        }
        setOrder((currentOrder) =>
          currentOrder ? { ...currentOrder, trangThai: "DaHuy" } : currentOrder,
        );
      } else {
        toast.error(response?.message || "Có lỗi xảy ra", {
          position: "top-right",
          autoClose: 2000,
          closeButton: true,
        });
      }
    } catch (err) {
      toast.error("Lỗi kết nối", {
        position: "top-right",
        autoClose: 2000,
        closeButton: true,
      });
      console.error("Lỗi hủy đơn:", err);
    }
  };

  const cancelCancelOrder = () => {
    setShowCancelConfirm(false);
  };

  const canCancelOrder =
    order && ["ChoXacNhan", "DaXacNhan", "DangGiao"].includes(order?.trangThai);

  useEffect(() => {
    mountedRef.current = true;
    fetchOrder();
    const intervalId = setInterval(() => fetchOrder({ silent: true }), 10000);
    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchOrder]);

  if (loading) return <div className="order-page">Đang tải...</div>;
  if (error) return <div className="order-page">{error}</div>;
  if (!order) return <div className="order-page">Không tìm thấy đơn hàng.</div>;

  const {
    recipient = {},
    diaChiGiaoHang: shippingAddress = "",
    chiTiet: items = [],
    lichSu: statusHistory = [],
    tamTinh,
    phiShip,
    giamGia,
    tongTien,
  } = order;

  const parsed = {
    name: recipient.hoTen || "",
    phone: recipient.soDienThoai || recipient.so || "",
    email: recipient.email || "",
  };
  let parsedAddress = "";
  if (!parsed.name || !parsed.phone || !parsed.email) {
    const parts = String(shippingAddress || "")
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    parts.forEach((part) => {
      const low = part.toLowerCase();
      if (
        !parsed.name &&
        (low.startsWith("tên") ||
          low.startsWith("ten") ||
          low.startsWith("name"))
      ) {
        parsed.name = part.split(":").slice(1).join(":").trim();
        return;
      }
      if (
        !parsed.phone &&
        (low.startsWith("sđt") ||
          low.startsWith("sdt") ||
          low.startsWith("đt") ||
          low.startsWith("dt") ||
          low.includes("phone"))
      ) {
        parsed.phone = part.split(":").slice(1).join(":").trim();
        return;
      }
      if (!parsed.email && low.startsWith("email")) {
        parsed.email = part.split(":").slice(1).join(":").trim();
        return;
      }
      parsedAddress = parsedAddress ? parsedAddress + ", " + part : part;
    });
  }
  if (!parsedAddress) parsedAddress = shippingAddress || "";

  const statusOrder = {
    ChoXacNhan: 0,
    DaXacNhan: 1,
    DangGiao: 2,
    HoanThanh: 3,
    DaHuy: 3,
  };
  const currentIndex =
    statusOrder[order.trangThai] ??
    (statusHistory?.length ? Math.max(0, statusHistory.length - 1) : 0);
  const isCompleted =
    (currentIndex >= 3 || order.trangThai === "HoanThanh") &&
    order.trangThai !== "DaHuy";
  const finalStepLabel =
    order.trangThai === "DaHuy" ? "TRẢ HÀNG" : "THÀNH CÔNG";

  return (
    <div className="order-page">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 999999 }}
      />

      {/* MODAL ĐÁNH GIÁ SẢN PHẨM (Từ Bản 1 - Rất đẹp không bị chuyển trang) */}
      {reviewingProduct && (
        <div className="review-modal-overlay">
          <div className="review-modal-content">
            <button
              className="close-modal-btn"
              onClick={handleReviewClose}
              title="Đóng"
            >
              ✕
            </button>
            <ProductReview
              MaSP={reviewingProduct.MaSP}
              MaDH={reviewingProduct.MaDH}
              MaND={reviewingProduct.MaND}
              productName={reviewingProduct.tenSP}
              productImage={reviewingProduct.DuongDanAnh}
              trangThaiDonHang={reviewingProduct.trangThaiDonHang}
              onSuccess={() => {
                setReviewedProducts((prev) => {
                  const newMap = { ...prev, [reviewingProduct.tenSP]: true };
                  localStorage.setItem(
                    `HAMONI_REVIEWED_ORDER_${reviewingProduct.MaDH}`,
                    JSON.stringify(newMap),
                  );
                  return newMap;
                });

                setTimeout(() => handleReviewClose(), 1500);
              }}
            />
          </div>
        </div>
      )}

      <div className="order-details-shell">
        <div className="order-progress-container">
          <div className="order-progress-inner">
            {[
              { key: "ChoXacNhan", label: "CHỜ XÁC NHẬN" },
              { key: "DaXacNhan", label: "ĐÃ XÁC NHẬN" },
              { key: "DangGiao", label: "ĐANG GIAO" },
              { key: "HoanThanh", label: finalStepLabel },
            ].map((step, idx, arr) => {
              const isDone = idx <= currentIndex;
              return (
                <div key={step.key} className="progress-step">
                  <div className={`step-circle ${isDone ? "done" : ""}`}>
                    {isDone ? "✓" : idx + 1}
                  </div>
                  <div className={`step-label ${isDone ? "done" : ""}`}>
                    {step.label}
                  </div>
                  {idx < arr.length - 1 && (
                    <div
                      className={`step-connector ${idx < currentIndex ? "filled" : ""}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="order-header">
          <div>
            <h1 className="order-title">Đơn hàng #{order.id}</h1>
            <div className="order-status-inline">
              Trạng thái đơn hàng:{" "}
              <span>{order.trangThai || "Chờ xác nhận"}</span>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="btn-plain">
            Quay lại
          </button>
        </div>

        {isCompleted && (
          <div className="success-notice">
            <div className="success-notice-icon">✓</div>
            <div className="success-notice-content">
              <div className="success-notice-title">Đơn hàng đã hoàn thành</div>
              <div className="success-notice-text">
                Bạn có thể đánh giá sản phẩm để giúp cửa hàng cải thiện chất
                lượng dịch vụ.
              </div>
            </div>
          </div>
        )}

        <div className="order-grid">
          <div className="order-card-lg">
            <h3 className="section-title">Thông tin nhận hàng</h3>
            <div className="recipient-section">
              <div className="recipient-grid">
                <div className="recipient-field">
                  <div className="field-label">Tên</div>
                  <div className="field-value">{parsed.name || "—"}</div>
                </div>
                <div className="recipient-field">
                  <div className="field-label">SDT</div>
                  <div className="field-value">{parsed.phone || "—"}</div>
                </div>
              </div>
              <div className="recipient-lines">
                <div className="address-line">
                  <span className="addr-label">Email:</span>{" "}
                  <span className="addr-val">{parsed.email || "—"}</span>
                </div>
                <div className="address-line">
                  <span className="addr-label">Địa chỉ:</span>{" "}
                  <span className="addr-val">{parsedAddress || "—"}</span>
                </div>
              </div>
            </div>

            <h3 className="section-title section-gap">Sản phẩm</h3>
            <div className="product-list">
              {items.map((it, i) => {
                const tenSP = String(
                  it.TenSP || it.tenSP || it.tenSanPham || "",
                ).trim();
                const isReviewed = reviewedProducts[tenSP];

                return (
                  <div key={i} className="product-card">
                    <img
                      src={
                        it.DuongDanAnh ||
                        it.image ||
                        it.hinhAnh ||
                        it.HinhAnh ||
                        it.anh ||
                        "https://dummyimage.com/400x400/f0f0f0/9ca3af.png&text=No+Image"
                      }
                      alt={tenSP}
                      className="product-img"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src =
                          "https://dummyimage.com/400x400/f0f0f0/9ca3af.png&text=No+Image";
                      }}
                    />
                    <div className="product-info">
                      <div className="product-name">{tenSP || "Sản phẩm"}</div>

                      {/* 👇 TÍCH HỢP HIỂN THỊ BIẾN THỂ (Từ Bản 2) 👇 */}
                      {(it.TenBienThe ||
                        it.TenPhanLoai ||
                        it.tenPhanLoai ||
                        it.variantName) && (
                        <div className="product-variant">
                          {it.TenBienThe ||
                            it.TenPhanLoai ||
                            it.tenPhanLoai ||
                            it.variantName}
                        </div>
                      )}

                      <div className="product-meta">
                        Số lượng: {it.soLuong || it.SoLuong || 1}
                      </div>
                    </div>
                    <div className="product-price">
                      {formatCurrency(it.giaBan || it.DonGia || 0)}
                    </div>

                    {isCompleted && (
                      <button
                        type="button"
                        className={`btn-review-product ${isReviewed ? "disabled-review-btn" : ""}`}
                        disabled={isReviewed}
                        onClick={() => {
                          if (isReviewed) return;
                          handleReviewProduct(it);
                        }}
                        title={
                          isReviewed
                            ? "Bạn đã đánh giá sản phẩm này"
                            : "Đánh giá sản phẩm"
                        }
                      >
                        {isReviewed ? "🔒 Đã đánh giá" : "⭐ Đánh giá"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="order-summary">
            <h3 className="section-title">Tóm tắt thanh toán</h3>
            <div className="totals-row">
              <span>Tổng tiền hàng</span>
              <span>{formatCurrency(tamTinh)}</span>
            </div>
            <div className="totals-row">
              <span>Phí vận chuyển</span>
              <span>{formatCurrency(phiShip)}</span>
            </div>
            <div className="totals-row">
              <span>Giảm giá</span>
              <span className="small-muted">-{formatCurrency(giamGia)}</span>
            </div>
            <div className="totals-total">
              <span>Tổng cộng</span>
              <span className="product-price">{formatCurrency(tongTien)}</span>
            </div>

            {canCancelOrder && (
              <button className="btn-cancel-order" onClick={handleCancelOrder}>
                {order?.trangThai === "DangGiao" ? "✕ Hủy đơn hàng" : "Hủy đơn"}
              </button>
            )}

            {showCancelConfirm && (
              <div className="cancel-confirm-overlay">
                <div className="cancel-confirm-modal">
                  <div className="cancel-confirm-header">
                    <h3>Xác nhận hủy đơn</h3>
                  </div>
                  <div className="cancel-confirm-body">
                    <p>
                      Bạn có chắc muốn hủy đơn hàng{" "}
                      <strong>#{order?.id}</strong>?
                    </p>
                    <p className="cancel-confirm-warning">
                      Hành động này không thể hoàn tác.
                    </p>
                  </div>
                  <div className="cancel-confirm-footer">
                    <button
                      className="btn-cancel-no"
                      onClick={cancelCancelOrder}
                    >
                      Hủy
                    </button>
                    <button
                      className="btn-cancel-yes"
                      onClick={confirmCancelOrder}
                    >
                      Xác nhận hủy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value) {
  if (value == null) return "0₫";
  try {
    const n = Number(value);
    return n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
  } catch {
    return String(value);
  }
}
