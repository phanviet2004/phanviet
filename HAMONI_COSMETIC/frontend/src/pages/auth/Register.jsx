import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Register.css";

export default function Register() {
  const [formData, setFormData] = useState({
    hoTen: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // State theo dõi xem ô input nào đã được người dùng click vào/gõ
  const [touched, setTouched] = useState({});
  // State lưu lỗi trả về từ Backend
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  // ==========================================
  // HÀM VALIDATE DỮ LIỆU (Chạy real-time)
  // ==========================================
  const validate = () => {
    const errors = {};

    if (!formData.hoTen.trim()) {
      errors.hoTen = "Họ và tên không được để trống!";
    }

    if (!formData.email.trim()) {
      errors.email = "Email không được để trống!";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email không đúng định dạng!";
    }

    if (!formData.password) {
      errors.password = "Mật khẩu không được để trống!";
    } else if (formData.password.length < 6) {
      errors.password = "Mật khẩu phải có ít nhất 6 ký tự!";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Vui lòng xác nhận mật khẩu!";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Mật khẩu xác nhận không khớp!";
    }

    return errors;
  };

  // Tính toán lỗi hiện tại
  const errors = validate();
  // Form chỉ hợp lệ khi không có lỗi nào và các trường bắt buộc đã được điền
  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.hoTen &&
    formData.email &&
    formData.password &&
    formData.confirmPassword;

  // Xử lý khi gõ phím
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Đánh dấu là người dùng đã bắt đầu gõ vào trường này
    setTouched({ ...touched, [name]: true });
  };

  // Xử lý khi click chuột ra khỏi ô input
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched({ ...touched, [name]: true });
  };

  // ==========================================
  // XỬ LÝ GỬI FORM
  // ==========================================
  const handleRegister = async (e) => {
    e.preventDefault(); // Chặn hành vi reload trang khi bấm Enter
    setApiError("");

    // Đánh dấu đỏ toàn bộ nếu cố tình bấm submit
    setTouched({
      hoTen: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) {
      return toast.warning("Vui lòng kiểm tra và sửa các lỗi màu đỏ!");
    }

    const dataToSend = {
      hoTen: formData.hoTen.trim(),
      email: formData.email.trim(),
      password: formData.password,
    };

    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        dataToSend,
      );
      toast.success(response.data.message || "Mã OTP đã được gửi!");

      // Delay 1.5s để người dùng kịp đọc thông báo toast màu xanh
      setTimeout(() => {
        navigate("/otp", {
          state: {
            email: dataToSend.email,
            hoTen: dataToSend.hoTen,
            password: dataToSend.password,
          },
        });
      }, 1500);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Lỗi đăng ký (Email có thể đã tồn tại hoặc lỗi server)";
      setApiError(errorMsg);
      console.error("Lỗi đăng ký:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-left">
          <img
            src="https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&q=80&w=1000"
            alt="Hamoni Cosmetic"
          />
          <div className="brand-tag">HAMONI COSMETIC — ATELIER DE BEAUTÉ</div>
        </div>

        <div className="auth-right">
          <h2 className="brand-title">HAMONI COSMETIC</h2>
          <p className="subtitle">Tạo tài khoản mới để trải nghiệm.</p>

          {/* HIỂN THỊ LỖI TỪ BACKEND (GIỐNG TRANG LOGIN) */}
          {apiError && (
            <div
              className="alert alert-danger"
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
              {apiError}
            </div>
          )}

          {/* BỌC TOÀN BỘ VÀO FORM ĐỂ BẮT SỰ KIỆN ENTER */}
          <form onSubmit={handleRegister}>
            {/* HỌ TÊN */}
            <div className="input-group">
              <label>HỌ VÀ TÊN</label>
              <input
                type="text"
                name="hoTen"
                placeholder="Nguyễn Văn A"
                value={formData.hoTen}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  borderColor: touched.hoTen && errors.hoTen ? "#e11d48" : "",
                }}
              />
              {touched.hoTen && errors.hoTen && (
                <span
                  style={{
                    color: "#e11d48",
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {errors.hoTen}
                </span>
              )}
            </div>

            {/* EMAIL */}
            <div className="input-group">
              <label>EMAIL XÁC THỰC</label>
              <input
                type="email"
                name="email"
                placeholder="example@hamoni.vn"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  borderColor: touched.email && errors.email ? "#e11d48" : "",
                }}
              />
              {touched.email && errors.email && (
                <span
                  style={{
                    color: "#e11d48",
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {errors.email}
                </span>
              )}
            </div>

            {/* MẬT KHẨU */}
            <div className="input-group">
              <label>MẬT KHẨU</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  borderColor:
                    touched.password && errors.password ? "#e11d48" : "",
                }}
              />
              {touched.password && errors.password && (
                <span
                  style={{
                    color: "#e11d48",
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {errors.password}
                </span>
              )}
            </div>

            {/* XÁC NHẬN MẬT KHẨU */}
            <div className="input-group">
              <label>XÁC NHẬN MẬT KHẨU</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  borderColor:
                    touched.confirmPassword && errors.confirmPassword
                      ? "#e11d48"
                      : "",
                }}
              />
              {touched.confirmPassword && errors.confirmPassword && (
                <span
                  style={{
                    color: "#e11d48",
                    fontSize: "11px",
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="terms" defaultChecked />
              <label
                htmlFor="terms"
                style={{ textTransform: "none", cursor: "pointer" }}
              >
                Tôi đồng ý với các điều khoản bảo mật
              </label>
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={!isFormValid || isLoading}
              style={{
                opacity: !isFormValid || isLoading ? 0.5 : 1,
                cursor: !isFormValid || isLoading ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                marginTop: "10px",
              }}
            >
              {isLoading ? "ĐANG XỬ LÝ..." : "ĐĂNG KÝ TÀI KHOẢN →"}
            </button>
          </form>

          <p className="footer-text">
            Đã có tài khoản?{" "}
            <span
              onClick={() => navigate("/login")}
              style={{ cursor: "pointer", color: "#8b9d83" }}
            >
              Đăng nhập ngay
            </span>
          </p>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}
