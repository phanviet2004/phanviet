// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import authApi from "../../services/authApi";
import { useStore } from "../../store/useStore";
import "./Login.css";

export default function Login() {
  // Lấy email đã lưu (nếu có) ngay khi khởi tạo state để tránh setState trong useEffect
  const savedEmail =
    typeof window !== "undefined"
      ? localStorage.getItem("rememberedEmail")
      : "";
  const [formData, setFormData] = useState(() => ({
    email: savedEmail || "",
    password: "",
  }));
  const [errorMessage, setErrorMessage] = useState("");
  // State quản lý checkbox Ghi nhớ đăng nhập
  const [rememberMe, setRememberMe] = useState(() => !!savedEmail);

  const navigate = useNavigate();
  const loginSuccess = useStore((state) => state.loginSuccess);

  // Không cần useEffect để setState từ localStorage — đã khởi tạo ở trên

  const isFormValid =
    formData.email.trim() !== "" && formData.password.trim() !== "";

  // Thay đổi: Nhận event (e) để chặn form reload trang
  const handleLogin = async (e) => {
    if (e) e.preventDefault(); // Chặn hành vi mặc định của form khi bấm Enter

    setErrorMessage("");
    const payload = {
      email: formData.email.trim(),
      password: formData.password.trim(),
      rememberMe: rememberMe, // Gửi trạng thái lên Backend để set hạn Token
    };

    if (!payload.email || !payload.password) {
      alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    try {
      const response = await authApi.login(payload);

      // XỬ LÝ GHI NHỚ ĐĂNG NHẬP Ở FRONTEND
      if (rememberMe) {
        // Lưu email vào máy để lần sau tự điền
        localStorage.setItem("rememberedEmail", payload.email);
      } else {
        // Xóa email khỏi máy nếu không check
        localStorage.removeItem("rememberedEmail");
      }

      // Vẫn lưu token vào localStorage vì dự án của bạn đang dùng cơ chế này để check Auth
      localStorage.setItem("token", response.token);

      const normalizedUser = {
        ...response.user,
        name:
          response.user?.name ||
          response.user?.hoTen ||
          response.user?.HoTen ||
          "",
      };

      let enrichedUser = normalizedUser;
      try {
        const meRes = await authApi.getCurrentUser();
        enrichedUser = {
          ...normalizedUser,
          ...(meRes?.user || {}),
          name:
            normalizedUser.name ||
            meRes?.user?.hoTen ||
            meRes?.user?.name ||
            "",
          avatarUrl: meRes?.user?.avatarUrl || normalizedUser.avatarUrl || "",
        };
      } catch {
        enrichedUser = normalizedUser;
      }

      localStorage.setItem("user", JSON.stringify(enrichedUser));
      const cachedUserInfo =
        JSON.parse(localStorage.getItem("user_info")) || {};
      const cachedAvatarUrl = cachedUserInfo.avatarUrl || "";
      localStorage.setItem(
        "user_info",
        JSON.stringify({
          ...cachedUserInfo,
          ...enrichedUser,
          avatarUrl: enrichedUser.avatarUrl || cachedAvatarUrl || "",
        }),
      );
      loginSuccess(enrichedUser);

      toast.success(`Chào mừng ${enrichedUser.name} quay trở lại!`);

      const roleCode = enrichedUser.maQuyen;

      if (roleCode === "ADMIN") {
        localStorage.setItem("userPermissions", JSON.stringify(["ALL"]));
      } else {
        try {
          const meRes = await authApi.getCurrentUser();
          localStorage.setItem(
            "userPermissions",
            JSON.stringify(meRes?.user?.permissions || []),
          );
        } catch {
          localStorage.setItem("userPermissions", JSON.stringify([]));
        }
      }

      if (roleCode === "ADMIN" || roleCode === "STAFF" || roleCode === "KHO") {
        navigate("/admin/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data ||
        "Email hoặc mật khẩu không chính xác!";
      setErrorMessage(errorMsg);
      console.error("Lỗi đăng nhập:", err);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <img
            src="https://images.unsplash.com/photo-1631730486784-02981683bda3?auto=format&fit=crop&q=80&w=1000"
            alt="Hamoni Cosmetic"
          />
          <div className="brand-tag">HAMONI COSMETIC — ATELIER DE BEAUTÉ</div>
        </div>

        <div className="auth-right">
          <h2 className="brand-title">HAMONI COSMETIC</h2>
          <p className="subtitle">Chào mừng trở lại. Đăng nhập để tiếp tục.</p>

          {errorMessage && (
            <div
              className="alert alert-danger"
              role="alert"
              style={{
                padding: "10px 15px",
                marginBottom: "15px",
                borderRadius: "4px",
                backgroundColor: "#f8d7da",
                color: "#721c24",
                border: "1px solid #f5c6cb",
                fontSize: "14px",
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Bọc toàn bộ các input và button trong thẻ form */}
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>EMAIL</label>
              <input
                type="email"
                placeholder="example@hamoni.vn"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="input-group">
              <label>MẬT KHẨU</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>

            <div
              className="checkbox-group"
              style={{ justifyContent: "space-between" }}
            >
              <div>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  htmlFor="remember"
                  style={{
                    textTransform: "none",
                    color: "#888",
                    marginLeft: "5px",
                    cursor: "pointer",
                  }}
                >
                  Ghi nhớ đăng nhập
                </label>
              </div>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: "11px",
                  color: "#1a1a1a",
                  cursor: "pointer",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit" // Đổi type thành submit để bắt sự kiện Enter
              className="auth-btn"
              disabled={!isFormValid}
              style={{
                opacity: isFormValid ? 1 : 0.5,
                cursor: isFormValid ? "pointer" : "not-allowed",
                transition: "all 0.3s ease",
              }}
            >
              ĐĂNG NHẬP →
            </button>
          </form>

          <p className="footer-text">
            Chưa có tài khoản?{" "}
            <span
              style={{ cursor: "pointer", color: "#8b9d83" }}
              onClick={() => navigate("/register")}
            >
              Tạo tài khoản mới
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
