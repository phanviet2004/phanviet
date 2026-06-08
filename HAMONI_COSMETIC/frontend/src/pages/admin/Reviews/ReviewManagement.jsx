import React, { useState, useEffect, useCallback } from "react";
import "./ReviewManagement.css";
import reviewApi from "../../../services/reviewApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ReviewManagement = () => {
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("ALL");
  const [rating, setRating] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedReview, setSelectedReview] = useState(null);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  // STATE CHO SIDEBAR
  const [sidebarProducts, setSidebarProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("ALL");

  // STATE CHỈ DÀNH CHO Ô TÌM KIẾM SIDEBAR
  const [searchProductTerm, setSearchProductTerm] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      let startDate = dateRange.start;
      let endDate = dateRange.end;

      if (startDate) startDate = `${startDate} 00:00:00`;
      if (endDate) endDate = `${endDate} 23:59:59`;

      const [statsData, reviewsData, sidebarData] = await Promise.all([
        reviewApi.getStats(),
        reviewApi.getAll({
          status: filter,
          rating: rating,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          MaSP: selectedProductId,
        }),
        reviewApi.getSidebarProducts(),
      ]);

      setStats(statsData || { total: 0, pending: 0 });
      setReviews(reviewsData || []);
      setSidebarProducts(sidebarData || []);
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, rating, dateRange.start, dateRange.end, selectedProductId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, rating, dateRange.start, dateRange.end, selectedProductId]);

  const getStatusConfig = (status) => {
    const configs = {
      DA_PHAN_HOI: { text: "ĐÃ PHẢN HỒI", className: "status-replied" },
      CHUA_PHAN_HOI: { text: "CHƯA PHẢN HỒI", className: "status-pending" },
    };
    return configs[status] || { text: status, className: "" };
  };

  const handleResetFilters = () => {
    setSearchProductTerm("");
    setDateRange({ start: "", end: "" });
    setFilter("ALL");
    setRating("ALL");
    setSelectedProductId("ALL");
    setCurrentPage(1);
  };

  const filteredReviews = reviews;

  // LOGIC LỌC SẢN PHẨM TRONG SIDEBAR DỰA VÀO Ô TÌM KIẾM MỚI
  const filteredSidebarProducts = sidebarProducts.filter((sp) =>
    sp.TenSP.toLowerCase().includes(searchProductTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredReviews.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        newestOnTop
        closeOnClick
        pauseOnHover
        className="hamoni-toast-container"
      />

      {loading ? (
        <div className="loading-hamoni">Đang tải dữ liệu...</div>
      ) : (
        <div className="review-management-container">
          <h1 className="page-title">QUẢN LÝ ĐÁNH GIÁ</h1>

          <section className="review-stats-section">
            <div className="review-stat-card">
              <span className="review-stat-label">TỔNG ĐÁNH GIÁ</span>
              <h2 className="review-stat-number">
                {stats.total?.toLocaleString() || 0}
              </h2>
            </div>

            <div className="review-stat-card review-highlight-card">
              <div className="review-stat-card-header">
                <span className="review-stat-label">CHƯA PHẢN HỒI</span>
                <h2 className="review-stat-number">{stats.pending || 0}</h2>
              </div>

              <button
                className="review-stat-action-link"
                onClick={() => setFilter("CHUA_PHAN_HOI")}
              >
                Xem ngay danh sách
              </button>
            </div>
          </section>

          <div className="review-main-layout">
            {/* CỘT TRÁI: SIDEBAR SẢN PHẨM & TÌM KIẾM */}
            <aside className="sidebar-container">
              <h3 className="sidebar-title">Lọc và Tìm kiếm Sản Phẩm</h3>

              <hr className="sidebar-divider" />

              {/* Ô TÌM KIẾM */}
              <input
                type="text"
                placeholder="🔍 Nhập tên sản phẩm..."
                value={searchProductTerm}
                onChange={(e) => setSearchProductTerm(e.target.value)}
                className="sidebar-search-input"
              />

              <div
                className={`sidebar-product-item header-item ${selectedProductId === "ALL" ? "active" : "inactive"}`}
                onClick={() => setSelectedProductId("ALL")}
              >
                Tất cả sản phẩm
              </div>

              <div className="sidebar-product-list">
                {filteredSidebarProducts.map((sp) => (
                  <div
                    key={sp.MaSP}
                    className={`sidebar-product-item ${selectedProductId === sp.MaSP ? "active" : "inactive"}`}
                    onClick={() => setSelectedProductId(sp.MaSP)}
                  >
                    <span className="sidebar-product-name">{sp.TenSP}</span>

                    {sp.PendingReviews > 0 ? (
                      <span className="sidebar-badge-pending">
                        {sp.PendingReviews}
                      </span>
                    ) : (
                      <span className="sidebar-badge-total">
                        {sp.TotalReviews}
                      </span>
                    )}
                  </div>
                ))}
                {filteredSidebarProducts.length === 0 && (
                  <p className="sidebar-no-product">Không có sản phẩm này.</p>
                )}
              </div>
            </aside>

            <main className="table-wrapper">
              <div className="table-controls">
                <div className="filter-controls-right">
                  <span className="filter-label">Lọc theo ngày:</span>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value,
                      }))
                    }
                    className="date-input"
                  />
                  <span className="date-separator">-</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({ ...prev, end: e.target.value }))
                    }
                    className="date-input"
                  />

                  <select
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="rating-select"
                  >
                    <option value="ALL">Tất cả sao</option>
                    <option value="5">5 sao</option>
                    <option value="4">4 sao</option>
                    <option value="3">3 sao</option>
                    <option value="2">2 sao</option>
                    <option value="1">1 sao</option>
                  </select>

                  <button
                    onClick={handleResetFilters}
                    className="btn-reset-filters"
                  >
                    🔄 Làm mới
                  </button>
                </div>
              </div>

              <table className="hamoni-table">
                <thead>
                  <tr>
                    <th>KHÁCH HÀNG</th>
                    <th>SẢN PHẨM</th>
                    <th>ĐÁNH GIÁ</th>
                    <th>NHẬN XÉT</th>
                    <th>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData.length > 0 ? (
                    currentData.map((item) => {
                      const status = getStatusConfig(item.TrangThai);
                      return (
                        <tr
                          key={item.MaDG}
                          className="review-row"
                          onClick={() => setSelectedReview(item)}
                        >
                          <td>
                            <div className="customer-info">
                              <img
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${item.HoTen}`}
                                alt="avatar"
                                className="customer-avatar"
                              />
                              <div className="customer-text">
                                <p className="customer-name">{item.HoTen}</p>
                                <p className="review-date">
                                  {new Date(
                                    item.NgayDanhGia,
                                  ).toLocaleDateString("vi-VN")}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="product-cell">{item.TenSP}</td>
                          <td>
                            <div className="stars">
                              {[...Array(5)].map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    i < item.SoSao
                                      ? "star-icon filled"
                                      : "star-icon"
                                  }
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="comment-cell">
                            <div className="chat user">
                              {
                                item.BinhLuan?.split(
                                  "--- Phản hồi từ shop ---",
                                )[0]
                              }
                            </div>
                            {item.replies &&
                              item.replies.map((rep) => (
                                <div key={rep.MaPH} className="chat admin">
                                  --- Phản hồi từ{" "}
                                  {rep.MaQuyen === "CUST" ? "khách" : "shop"}{" "}
                                  --- {rep.NoiDung}
                                </div>
                              ))}
                          </td>
                          <td>
                            <span
                              className={`status-badge ${status.className}`}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="no-data">
                        Không tìm thấy đánh giá nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <footer className="table-footer">
                <span className="pagination-info">
                  Hiển thị {filteredReviews.length === 0 ? 0 : startIndex + 1} -{" "}
                  {Math.min(startIndex + itemsPerPage, filteredReviews.length)}{" "}
                  trong tổng số {filteredReviews.length} đánh giá
                </span>

                <div
                  className="pagination-wrapper"
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}
                >
                  {/* Nút lùi */}
                  <button
                    className="page-arrow"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    ‹
                  </button>

                  {/* Danh sách các trang có dấu ba chấm */}
                  <div className="pagination-controls">
                    {(() => {
                      const pages = [];
                      if (totalPages <= 5) {
                        for (let i = 1; i <= totalPages; i++) pages.push(i);
                      } else {
                        if (currentPage <= 3) {
                          pages.push(1, 2, 3, 4, "...", totalPages);
                        } else if (currentPage >= totalPages - 2) {
                          pages.push(
                            1,
                            "...",
                            totalPages - 3,
                            totalPages - 2,
                            totalPages - 1,
                            totalPages,
                          );
                        } else {
                          pages.push(
                            1,
                            "...",
                            currentPage - 1,
                            currentPage,
                            currentPage + 1,
                            "...",
                            totalPages,
                          );
                        }
                      }

                      return pages.map((page, index) =>
                        page === "..." ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="page-ellipsis"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            className={`page-btn ${currentPage === page ? "active" : ""}`}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        ),
                      );
                    })()}
                  </div>

                  {/* Nút tới */}
                  <button
                    className="page-arrow"
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    ›
                  </button>
                </div>
              </footer>
            </main>
          </div>

          {/* 🔥 MODAL CHI TIẾT */}
          {selectedReview && (
            <div
              className="modal-overlay"
              onClick={() => setSelectedReview(null)}
            >
              <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h2>Chi tiết đánh giá</h2>

                <p>
                  <b>Khách hàng:</b> {selectedReview.HoTen}
                </p>
                <p>
                  <b>Sản phẩm:</b> {selectedReview.TenSP}
                </p>

                <p>
                  <b>Số sao:</b>{" "}
                  <span className="stars">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < selectedReview.SoSao
                            ? "star-icon filled"
                            : "star-icon"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </span>
                </p>

                {/* ========================================== */}
                {/* 🔥 ĐÃ CHUYỂN HÌNH ẢNH/VIDEO LÊN TRÊN CHATBOX  */}
                {/* ========================================== */}
                {selectedReview?.HinhAnh && (
                  <div style={{ marginTop: "15px", marginBottom: "15px" }}>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "14px",
                        color: "#333",
                      }}
                    >
                      Hình ảnh & Video đính kèm:
                    </span>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "8px",
                      }}
                    >
                      {(() => {
                        try {
                          const mediaUrls = JSON.parse(selectedReview.HinhAnh);
                          return mediaUrls.map((url, index) => {
                            if (url.includes(".mp4") || url.includes(".mov")) {
                              return (
                                <video
                                  key={index}
                                  src={url}
                                  controls
                                  width="90"
                                  height="90"
                                  style={{
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    border: "1px solid #eee",
                                  }}
                                />
                              );
                            }
                            return (
                              <img
                                key={index}
                                src={url}
                                alt="review-media"
                                width="90"
                                height="90"
                                style={{
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                  border: "1px solid #eee",
                                }}
                              />
                            );
                          });
                        } catch (error) {
                          console.error("Lỗi đọc mảng hình ảnh:", error);
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                )}
                {/* ========================================== */}

                {/* KHU VỰC CHAT BOX HIỂN THỊ BÊN DƯỚI ẢNH */}
                <div className="chat-box">
                  <div className="chat user">
                    <b>Khách:</b>{" "}
                    {
                      selectedReview.BinhLuan?.split(
                        "--- Phản hồi từ shop ---",
                      )[0]
                    }
                  </div>

                  {selectedReview.replies &&
                    selectedReview.replies.map((rep) => (
                      <div
                        key={rep.MaPH}
                        className={`chat ${rep.MaQuyen === "CUST" ? "user" : "admin"}`}
                      >
                        <b>{rep.MaQuyen === "CUST" ? "Khách" : "Shop"}:</b>{" "}
                        {rep.NoiDung}
                      </div>
                    ))}
                </div>

                <p>
                  <b>Thời gian:</b>{" "}
                  {new Date(selectedReview.NgayDanhGia).toLocaleString("vi-VN")}
                </p>

                <div className="modal-actions">
                  <button
                    className="btn-modal-close"
                    onClick={() => setSelectedReview(null)}
                  >
                    {" "}
                    Đóng{" "}
                  </button>
                  <button
                    className="btn-modal-reply-trigger"
                    onClick={() => {
                      setReplyText("");
                      setShowReplyBox(true);
                    }}
                  >
                    Phản hồi
                  </button>
                </div>
              </div>
            </div>
          )}

          {showReplyBox && (
            <div
              className="modal-overlay"
              onClick={() => setShowReplyBox(false)}
            >
              <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <h3>Phản hồi khách hàng</h3>

                <textarea
                  placeholder="Nhập nội dung phản hồi..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="reply-textarea"
                />

                <div className="modal-reply-actions">
                  <button
                    disabled={sending}
                    className="btn-send-reply"
                    onClick={async () => {
                      if (!replyText.trim()) {
                        toast.warning("Vui lòng nhập nội dung!");
                        return;
                      }

                      try {
                        setSending(true);
                        await reviewApi.replyReview(
                          selectedReview.MaDG,
                          replyText,
                        );
                        toast.success("Đã phản hồi!");
                        setShowReplyBox(false);
                        setSelectedReview(null);
                        setReplyText("");
                        fetchData();
                      } catch (err) {
                        console.error(err);
                        toast.error("Có lỗi xảy ra!");
                      } finally {
                        setSending(false);
                      }
                    }}
                  >
                    {sending ? "Đang gửi..." : "Gửi"}
                  </button>

                  <button
                    className="btn-cancel-reply"
                    onClick={() => setShowReplyBox(false)}
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ReviewManagement;
