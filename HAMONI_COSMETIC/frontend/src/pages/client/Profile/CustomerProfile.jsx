// src/pages/client/Profile/CustomerProfile.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../services/axiosClient";
import authApi from "../../../services/authApi";
import { User, Mail, Phone, CheckCircle, AlertCircle } from "lucide-react";
import { useStore } from "../../../store/useStore";
import CustomerProfileForm from "./CustomerProfileForm"; // <-- IMPORT COMPONENT FORM VÀO
import "./CustomerProfile.css";

const safeParseStorage = (key, fallback = {}) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const formatDateForInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  // Kiểm tra nếu ngày không hợp lệ
  if (Number.isNaN(date.getTime())) return "";

  // Lấy ngày tháng năm theo múi giờ địa phương (Việt Nam) thay vì chuẩn UTC
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng trong JS bắt đầu từ 0
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const CustomerProfile = () => {
  const [formData, setFormData] = useState({
    MaKH: "",
    HoTen: "",
    Email: "",
    SoDienThoai: "",
    GioiTinh: "",
    NgaySinh: "",
    DiaChi: "",
    AvatarUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({
    show: false,
    type: "",
    message: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const loginSuccess = useStore((state) => state.loginSuccess);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setAlertConfig({
            show: true,
            type: "danger",
            message: "Phiên đăng nhập không tồn tại. Vui lòng đăng nhập lại!",
          });
          setLoading(false);
          return;
        }

        const response = await authApi.getCurrentUser();
        const user = response?.user || {};
        const cachedUser = safeParseStorage("user_info", {});
        const avatarUrl = user.avatarUrl || cachedUser.avatarUrl || "";
        const ngaySinh = formatDateForInput(
          user.ngaySinh || cachedUser.ngaySinh,
        );
        setFormData({
          MaKH: user.id || "",
          HoTen: user.hoTen || "",
          Email: user.email || "",
          SoDienThoai: user.soDienThoai || "",
          GioiTinh: user.gioiTinh || "",
          NgaySinh: ngaySinh,
          DiaChi: user.diaChi || "",
          AvatarUrl: avatarUrl,
        });
        if (avatarUrl) setAvatarPreview(avatarUrl);
        loginSuccess({
          ...safeParseStorage("user", {}),
          id: user.id || "",
          name: user.hoTen || "",
          hoTen: user.hoTen || "",
          email: user.email || "",
          soDienThoai: user.soDienThoai || "",
          gioiTinh: user.gioiTinh || "",
          ngaySinh: ngaySinh,
          diaChi: user.diaChi || "",
          avatarUrl,
        });
        setLoading(false);
      } catch (error) {
        console.error("Lỗi tải profile:", error);
        const status = error?.response?.status;
        const serverMessage = error?.response?.data?.message;

        if (status === 401 || status === 403) {
          setAlertConfig({
            show: true,
            type: "danger",
            message:
              serverMessage ||
              "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!",
          });
          localStorage.removeItem("token");
          setTimeout(() => navigate("/login"), 1200);
        } else {
          setAlertConfig({
            show: true,
            type: "danger",
            message: serverMessage || "Không thể tải hồ sơ cá nhân!",
          });
        }
        setLoading(false);
      }
    };
    fetchProfile();
  }, [loginSuccess, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    // ... (Giữ nguyên logic Avatar của bạn)
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setAlertConfig({
        show: true,
        type: "danger",
        message: "Chỉ chấp nhận ảnh .jpeg, .jpg, .png, .webp",
      });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setAlertConfig({
        show: true,
        type: "danger",
        message: "Kích thước tối đa 1 MB",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axiosClient.post("/upload", fd);
      const url = res?.url || res?.data?.url;
      if (url) {
        setFormData((prev) => ({ ...prev, AvatarUrl: url }));
        setAvatarPreview(url);
      }
    } catch (err) {
      console.error("Upload avatar lỗi", err);
      setAlertConfig({
        show: true,
        type: "danger",
        message: "Không thể upload ảnh",
      });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setAlertConfig({ show: false, type: "", message: "" });

    try {
      if (!formData.HoTen.trim()) {
        setAlertConfig({
          show: true,
          type: "danger",
          message: "Vui lòng nhập họ và tên!",
        });
        return;
      }

      // Validate Email - phải có @ và .com
      if (!formData.Email.trim()) {
        setAlertConfig({
          show: true,
          type: "danger",
          message: "Vui lòng nhập email!",
        });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.(com|vn|org|net|edu)$/i;
      if (!emailRegex.test(formData.Email.trim())) {
        setAlertConfig({
          show: true,
          type: "danger",
          message:
            "Email phải có định dạng hợp lệ (chứa @ và .com/.vn/.org/...)",
        });
        return;
      }

      // Validate Phone - bắt buộc và phải là 10 số
      if (!formData.SoDienThoai || !formData.SoDienThoai.trim()) {
        setAlertConfig({
          show: true,
          type: "danger",
          message: "Vui lòng nhập số điện thoại!",
        });
        return;
      }
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.SoDienThoai.trim())) {
        setAlertConfig({
          show: true,
          type: "danger",
          message: "Số điện thoại phải có đúng 10 chữ số!",
        });
        return;
      }

      // Validate Date of Birth - nếu có thì phải trước ngày hiện tại
      if (formData.NgaySinh && formData.NgaySinh.trim()) {
        const selectedDate = new Date(formData.NgaySinh);
        if (Number.isNaN(selectedDate.getTime())) {
          setAlertConfig({
            show: true,
            type: "danger",
            message: "Ngày sinh không hợp lệ!",
          });
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate >= today) {
          setAlertConfig({
            show: true,
            type: "danger",
            message: "Ngày sinh phải trước ngày hôm nay!",
          });
          return;
        }
      }

      await axiosClient.put("/auth/profile", {
        HoTen: formData.HoTen,
        Email: formData.Email,
        SoDienThoai: formData.SoDienThoai,
        GioiTinh: formData.GioiTinh,
        NgaySinh: formData.NgaySinh || null,
        DiaChi: formData.DiaChi,
        AvatarUrl: formData.AvatarUrl || null,
      });

      const currentUserInfo = safeParseStorage("user_info", {});
      localStorage.setItem(
        "user_info",
        JSON.stringify({
          ...currentUserInfo,
          hoTen: formData.HoTen,
          email: formData.Email,
          soDienThoai: formData.SoDienThoai,
          ngaySinh: formData.NgaySinh,
          diaChi: formData.DiaChi,
          gioiTinh: formData.GioiTinh,
          avatarUrl: formData.AvatarUrl || currentUserInfo.avatarUrl || "",
        }),
      );
      loginSuccess({
        ...safeParseStorage("user", {}),
        ...safeParseStorage("user_info", {}),
        name: formData.HoTen,
        hoTen: formData.HoTen,
        email: formData.Email,
        soDienThoai: formData.SoDienThoai,
        gioiTinh: formData.GioiTinh,
        ngaySinh: formData.NgaySinh,
        diaChi: formData.DiaChi,
        avatarUrl: formData.AvatarUrl || currentUserInfo.avatarUrl || "",
      });

      setAlertConfig({
        show: true,
        type: "success",
        message: "Cập nhật thông tin thành công!",
      });
      setTimeout(
        () => setAlertConfig({ show: false, type: "", message: "" }),
        3000,
      );
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message || "Lỗi! Không thể cập nhật dữ liệu.";
      setAlertConfig({ show: true, type: "danger", message: errorMsg });
    }
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "80vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-profile-container py-5">
      <div className="container">
        <div className="mb-4">
          <h1 className="fw-bold" style={{ fontSize: "28px", color: "#333" }}>
            <User size={32} className="me-2" style={{ marginBottom: "3px" }} />{" "}
            Thông Tin Cá Nhân
          </h1>
          <p className="text-muted">
            Cập nhật và quản lý thông tin tài khoản của bạn
          </p>
        </div>

        {alertConfig.show && (
          <div
            className={`alert alert-${alertConfig.type} d-flex align-items-center shadow-sm mb-4`}
            role="alert"
          >
            {alertConfig.type === "success" ? (
              <CheckCircle className="me-2" size={20} />
            ) : (
              <AlertCircle className="me-2" size={20} />
            )}
            <div className="fw-medium">{alertConfig.message}</div>
          </div>
        )}

        <div className="row g-4">
          {/* CỘT TRÁI: THẺ PROFILE */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 rounded-4 h-100 customer-profile-card">
              <div className="card-body text-center p-5">
                <div className="avatar-circle mx-auto mb-4">
                  {avatarPreview ? (
                    <img
                      className="avatar-image"
                      src={avatarPreview}
                      alt="Avatar"
                    />
                  ) : (
                    <span>
                      {formData.HoTen?.charAt(0).toUpperCase() || "K"}
                    </span>
                  )}
                </div>
                <div className="mb-3">
                  <label
                    htmlFor="avatarInput"
                    className="btn btn-light border d-inline-block avatar-upload-btn"
                  >
                    Chọn Ảnh
                  </label>
                  <input
                    id="avatarInput"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarChange}
                  />
                  <div className="form-text text-muted mt-2">
                    Dung lượng tối đa 1 MB
                  </div>
                </div>
                <h3 className="fw-bold text-dark mb-2">
                  {formData.HoTen || "Khách hàng"}
                </h3>
                <p className="text-muted mb-3">
                  <small>
                    Mã khách hàng: <strong>KH-{formData.MaKH}</strong>
                  </small>
                </p>

                <hr className="my-4 opacity-25" />

                <div className="text-start">
                  <div className="mb-3 d-flex align-items-center gap-2 text-secondary">
                    <Mail size={16} />{" "}
                    <small>{formData.Email || "Chưa cập nhật"}</small>
                  </div>
                  <div className="d-flex align-items-center gap-2 text-secondary">
                    <Phone size={16} />{" "}
                    <small>{formData.SoDienThoai || "Chưa cập nhật"}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: FORM CHỈNH SỬA */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0 rounded-4">
              <div className="card-header bg-white border-bottom-1 pt-4 pb-3 px-5">
                <h4 className="fw-bold text-dark m-0">Cập nhật thông tin</h4>
              </div>

              <div className="card-body px-5 pb-5 mt-3">
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3">
                    Thông tin cơ bản
                  </h6>
                </div>

                {/* CHÍNH XÁC LÀ CHỖ NÀY: 
                                    Ta truyền dữ liệu xuống component con thay vì viết <form> dài ngoằng ở đây 
                                */}
                <CustomerProfileForm
                  formData={formData}
                  handleInputChange={handleInputChange}
                  handleUpdate={handleUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
