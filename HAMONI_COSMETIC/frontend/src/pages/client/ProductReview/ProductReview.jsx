import React, { useEffect, useState } from "react";
import "./ProductReview.css";
import "react-toastify/dist/ReactToastify.css";
import {
  createReview,
  checkReviewHistory,
} from "../../../services/productreviewApi";
import { toast } from "react-toastify";

const ProductReview = ({
  MaSP,
  MaDH,
  MaND,
  productName,
  productImage,
  trangThaiDonHang,
  alreadyReviewed = false,
  onSuccess,
}) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState("idle");

  useEffect(() => {
    if (alreadyReviewed) {
      if (onSuccess) onSuccess(); // Đóng form ngay lập tức
      return;
    }

    const getCurrentMaND = () => {
      if (MaND) return MaND;
      const userDataString =
        localStorage.getItem("user") || localStorage.getItem("userInfo");
      if (!userDataString) return null;
      try {
        const userData = JSON.parse(userDataString);
        return userData.MaND || userData.id || userData.MaKhachHang || null;
      } catch {
        return null;
      }
    };

    const checkReviewExists = async () => {
      const currentMaND = getCurrentMaND();
      if (!MaSP || !MaDH || !currentMaND) return;

      try {
        const response = await checkReviewHistory(MaDH, MaSP, currentMaND);

        if (response && response.hasReview) {
          // 👉 ĐÃ SỬA THÀNH TOAST ĐỎ (ERROR)
          toast.error("Sản phẩm này bạn đã đánh giá rồi!");
          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error) {
        console.warn("Không thể kiểm tra review đã tồn tại:", error);
      }
    };

    checkReviewExists();

    // 👉 ĐÃ SỬA: BỎ 'onSuccess' KHỎI DẤU NGOẶC VUÔNG ĐỂ CẮT ĐỨT VÒNG LẶP VÔ TẬN (SPAM TOAST)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MaSP, MaDH, MaND, alreadyReviewed]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    let currentImagesCount = selectedFiles.filter((f) =>
      f.type.startsWith("image/"),
    ).length;
    let currentVideosCount = selectedFiles.filter((f) =>
      f.type.startsWith("video/"),
    ).length;

    const allowedFiles = [];
    const allowedPreviews = [];
    let imageLimitExceeded = false;
    let videoLimitExceeded = false;

    newFiles.forEach((file) => {
      if (file.type.startsWith("image/")) {
        if (currentImagesCount < 5) {
          allowedFiles.push(file);
          allowedPreviews.push({
            url: URL.createObjectURL(file),
            type: file.type,
          });
          currentImagesCount++;
        } else {
          imageLimitExceeded = true;
        }
      } else if (file.type.startsWith("video/")) {
        if (currentVideosCount < 5) {
          allowedFiles.push(file);
          allowedPreviews.push({
            url: URL.createObjectURL(file),
            type: file.type,
          });
          currentVideosCount++;
        } else {
          videoLimitExceeded = true;
        }
      }
    });

    if (imageLimitExceeded) toast.error("Bạn chỉ được tải lên tối đa 5 ảnh!");
    if (videoLimitExceeded) toast.error("Bạn chỉ được tải lên tối đa 5 video!");

    if (allowedFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...allowedFiles]);
      setPreviews((prev) => [...prev, ...allowedPreviews]);
    }
    e.target.value = null;
  };

  const removeFile = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (trangThaiDonHang && trangThaiDonHang !== "HoanThanh") {
      toast.error("Bạn chỉ có thể đánh giá sau khi nhận hàng thành công!");
      return;
    }

    if (rating === 0) {
      toast.error("Vui lòng chọn số sao đánh giá!");
      return;
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].size > 5 * 1024 * 1024) {
        toast.error(`File "${selectedFiles[i].name}" quá lớn. Tối đa 5MB!`);
        return;
      }
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Đang gửi đánh giá...");

    let realMaND = MaND;
    if (!realMaND) {
      const userDataString =
        localStorage.getItem("user") || localStorage.getItem("userInfo");
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          realMaND = userData.MaND || userData.id || userData.MaKhachHang;
        } catch (error) {
          console.error("Lỗi đọc dữ liệu user từ Local Storage:", error);
        }
      }
    }

    if (!realMaND || !MaSP || !MaDH) {
      toast.dismiss(loadingToast);
      toast.error("Thiếu thông tin đánh giá (MaSP/MaDH).");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("MaND", realMaND);
    formData.append("MaSP", MaSP);
    formData.append("MaDH", MaDH);
    formData.append("SoSao", rating);
    formData.append("BinhLuan", comment);

    if (selectedFiles.length > 0) {
      selectedFiles.forEach((file) => {
        formData.append("HinhAnh", file);
      });
    }

    try {
      const response = await createReview(formData);
      toast.dismiss(loadingToast);

      if (response && (response.success || response.status === 201)) {
        toast.success("Đánh giá thành công! Cảm ơn bạn.");
        setFormStatus("success");

        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response?.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage =
        error?.response?.data?.message || "Lỗi kết nối đến máy chủ.";
      if (
        errorMessage.includes("đã được bạn đánh giá") ||
        errorMessage.includes("đã đánh giá")
      ) {
        toast.error("Bạn đã đánh giá sản phẩm này rồi!"); // Báo lỗi đỏ
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (formStatus === "success") {
    return (
      <div className="product-review-wrapper">
        <div
          className="review-card"
          style={{
            textAlign: "center",
            padding: "50px 20px",
            boxShadow: "none",
          }}
        >
          <h2 style={{ color: "#4CAF50", marginBottom: "10px" }}>
            Cảm ơn bạn! ❤️
          </h2>
          <p style={{ color: "#666" }}>Đánh giá của bạn đã được ghi nhận.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="product-review-wrapper">
      <div className="review-header">
        <div className="product-thumbnail">
          {productImage ? (
            <img src={productImage} alt="Product" />
          ) : (
            <div className="thumb-placeholder"></div>
          )}
        </div>
        <div className="product-title-group">
          <span className="review-label">ĐÁNH GIÁ SẢN PHẨM</span>
          <h2 className="review-product-name">
            {productName || "Sản phẩm HAMONI"}
          </h2>
        </div>
      </div>

      <div className="review-card" style={{ boxShadow: "none" }}>
        <div className="form-section">
          <label className="section-label">Mức độ hài lòng của bạn</label>
          <div className="star-rating-group">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`star-item ${star <= (hover || rating) ? "active" : ""}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="section-label">Nội dung đánh giá</label>
          <textarea
            className="review-textarea"
            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          ></textarea>
        </div>

        <div className="form-section">
          <label className="section-label">
            Hình ảnh & Video thực tế (Tối đa 5 Ảnh & 5 Video)
          </label>
          <div className="image-upload-container">
            {previews.map((file, index) => (
              <div key={index} className="preview-item">
                {file.type.includes("video") ? (
                  <video src={file.url} className="mock-img" />
                ) : (
                  <img src={file.url} alt="preview" className="mock-img" />
                )}
                <button
                  className="remove-btn"
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </div>
            ))}

            {selectedFiles.length < 10 && (
              <label className="upload-trigger">
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <div className="trigger-content">
                  <span className="plus-icon">+</span>
                  <span className="trigger-text">THÊM ẢNH/VIDEO</span>
                </div>
              </label>
            )}
          </div>
        </div>

        <button
          className="btn-submit-green"
          onClick={handleSubmit}
          disabled={isSubmitting}
          style={{
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Đang xử lý..." : "Gửi đánh giá"}
        </button>
      </div>
    </div>
  );
};

export default ProductReview;
