import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import authApi from "../../services/authApi";
import { useStore } from "../../store/useStore";
import "react-toastify/dist/ReactToastify.css";

// Nhúng Component Modal Quên mật khẩu vào đây
// import ForgotPasswordModal from "../ForgotPasswordModal";
import ForgotPasswordModal from "./ForgotPassword";

// ==========================================
// CẤU HÌNH ẢNH NỀN CHO ĐĂNG NHẬP VÀ ĐĂNG KÝ
// ==========================================
const loginOverlayImage =
  "https://htmediagroup.vn/wp-content/uploads/2022/10/Anh-my-pham-5.jpg";
const signUpOverlayImage =
  "https://images.unsplash.com/photo-1561920723-e0c68a4fe723?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1000&q=80";

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginSuccess = useStore((state) => state.loginSuccess);

  const [isSignUp, setIsSignUp] = useState(location.pathname === "/register");
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State quản lý việc bật/tắt Modal Quên Mật Khẩu
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // ==========================================
  // LOGIC ĐĂNG NHẬP
  // ==========================================
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setLoginData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
    setIsSignUp(location.pathname === "/register");
  }, [location.pathname]);

  const isLoginValid =
    loginData.email.trim() !== "" && loginData.password.trim() !== "";

  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError("");
    if (!isLoginValid)
      return toast.warning("Vui lòng nhập đủ Email và Mật khẩu!");

    const payload = {
      email: loginData.email.trim(),
      password: loginData.password.trim(),
      rememberMe: rememberMe,
    };

    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      if (rememberMe) localStorage.setItem("rememberedEmail", payload.email);
      else localStorage.removeItem("rememberedEmail");
      localStorage.setItem("token", response.token);

      let enrichedUser = {
        ...response.user,
        name: response.user?.name || response.user?.hoTen || "",
      };
      try {
        const meRes = await authApi.getCurrentUser();
        enrichedUser = {
          ...enrichedUser,
          ...(meRes?.user || {}),
          name: enrichedUser.name || meRes?.user?.hoTen || "",
          avatarUrl: meRes?.user?.avatarUrl || enrichedUser.avatarUrl || "",
        };
      } catch {
        // Nếu lỗi khi fetch current user, vẫn dùng dữ liệu ban đầu
      }

      localStorage.setItem("user", JSON.stringify(enrichedUser));
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

      if (["ADMIN", "STAFF", "KHO"].includes(roleCode))
        navigate("/admin/dashboard");
      else navigate("/");
    } catch (err) {
      setApiError(
        err.response?.data?.message || "Email hoặc mật khẩu không chính xác!",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // LOGIC ĐĂNG KÝ
  // ==========================================
  const [regData, setRegData] = useState({
    hoTen: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [regTouched, setRegTouched] = useState({});

  const validateReg = () => {
    const errors = {};
    if (!regData.hoTen.trim()) errors.hoTen = "Họ và tên không để trống!";
    if (!regData.email.trim()) errors.email = "Email không để trống!";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regData.email))
      errors.email = "Email không hợp lệ!";
    if (!regData.password) errors.password = "Mật khẩu không để trống!";
    else if (regData.password.length < 6)
      errors.password = "Tối thiểu 6 ký tự!";
    if (!regData.confirmPassword) errors.confirmPassword = "Xác nhận mật khẩu!";
    else if (regData.password !== regData.confirmPassword)
      errors.confirmPassword = "Mật khẩu không khớp!";
    return errors;
  };

  const regErrors = validateReg();
  const isRegValid =
    Object.keys(regErrors).length === 0 &&
    regData.hoTen &&
    regData.email &&
    regData.password &&
    regData.confirmPassword;

  const handleRegChange = (e) => {
    setRegData({ ...regData, [e.target.name]: e.target.value });
    setRegTouched({ ...regTouched, [e.target.name]: true });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setApiError("");
    setRegTouched({
      hoTen: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isRegValid) return toast.warning("Vui lòng sửa các lỗi màu đỏ!");

    const dataToSend = {
      hoTen: regData.hoTen.trim(),
      email: regData.email.trim(),
      password: regData.password,
    };
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        dataToSend,
      );
      toast.success(response.data.message || "Mã OTP đã được gửi!");
      setTimeout(() => navigate("/otp", { state: dataToSend }), 1500);
    } catch (err) {
      setApiError(
        err.response?.data?.message || "Lỗi đăng ký (Email có thể đã tồn tại)!",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePanel = (toSignUp) => {
    setIsSignUp(toSignUp);
    setApiError("");
    if (toSignUp) navigate("/register", { replace: true });
    else navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center items-center flex-col p-4 md:p-8 font-sans text-slate-800">
      <style>{`
        @keyframes showSignUp {
            0%, 49.99% { opacity: 0; z-index: 10; }
            50%, 100% { opacity: 1; z-index: 50; }
        }
        .animate-show-panel { animation: showSignUp 0.6s ease-in-out forwards; }
      `}</style>

      {/* CONTAINER CHÍNH */}
      <div className="relative w-full max-w-[1000px] min-h-[660px] bg-white rounded-[30px] shadow-[0_20px_50px_rgba(225,29,72,0.08)] overflow-hidden border border-rose-50">
        {/* ========================================== */}
        {/* FORM ĐĂNG KÝ */}
        {/* ========================================== */}
        <div
          className={`absolute top-0 h-full left-0 w-full md:w-1/2 transition-all duration-700 ease-in-out ${isSignUp ? "md:translate-x-full opacity-100 z-50 animate-show-panel" : "opacity-0 z-10 pointer-events-none"}`}
        >
          <form
            onSubmit={handleRegister}
            className="bg-white flex flex-col items-center justify-center px-10 md:px-14 h-full text-center"
          >
            <h1
              className="font-bold text-3xl mb-1 text-slate-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Tạo Tài Khoản
            </h1>
            <p className="text-sm text-slate-500 mb-2">
              Điền thông tin để trải nghiệm Hamoni decor
            </p>

            {/* Vùng chứa API Error cố định chiều cao */}
            <div className="h-[44px] w-full flex items-center justify-center mb-1">
              <div
                className={`w-full p-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[13px] transition-opacity duration-300 ${apiError && isSignUp ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                {apiError || "Lỗi"}
              </div>
            </div>

            {/* CÁC Ô INPUT ĐĂNG KÝ */}
            <div className="w-full text-left relative mb-6">
              <input
                type="text"
                name="hoTen"
                placeholder="Họ và Tên"
                value={regData.hoTen}
                onChange={handleRegChange}
                onBlur={() => setRegTouched({ ...regTouched, hoTen: true })}
                className={`w-full bg-slate-50 border ${regTouched.hoTen && regErrors.hoTen ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
              />
              <span
                className={`absolute left-3 -bottom-[18px] text-rose-500 text-[11px] font-semibold transition-opacity duration-200 ${regTouched.hoTen && regErrors.hoTen ? "opacity-100" : "opacity-0"}`}
              >
                {regErrors.hoTen}
              </span>
            </div>

            <div className="w-full text-left relative mb-6">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={regData.email}
                onChange={handleRegChange}
                onBlur={() => setRegTouched({ ...regTouched, email: true })}
                className={`w-full bg-slate-50 border ${regTouched.email && regErrors.email ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
              />
              <span
                className={`absolute left-3 -bottom-[18px] text-rose-500 text-[11px] font-semibold transition-opacity duration-200 ${regTouched.email && regErrors.email ? "opacity-100" : "opacity-0"}`}
              >
                {regErrors.email}
              </span>
            </div>

            <div className="w-full text-left relative mb-6">
              <input
                type="password"
                name="password"
                placeholder="Mật khẩu"
                value={regData.password}
                onChange={handleRegChange}
                onBlur={() => setRegTouched({ ...regTouched, password: true })}
                className={`w-full bg-slate-50 border ${regTouched.password && regErrors.password ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
              />
              <span
                className={`absolute left-3 -bottom-[18px] text-rose-500 text-[11px] font-semibold transition-opacity duration-200 ${regTouched.password && regErrors.password ? "opacity-100" : "opacity-0"}`}
              >
                {regErrors.password}
              </span>
            </div>

            <div className="w-full text-left relative mb-8">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Xác nhận mật khẩu"
                value={regData.confirmPassword}
                onChange={handleRegChange}
                onBlur={() =>
                  setRegTouched({ ...regTouched, confirmPassword: true })
                }
                className={`w-full bg-slate-50 border ${regTouched.confirmPassword && regErrors.confirmPassword ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
              />
              <span
                className={`absolute left-3 -bottom-[18px] text-rose-500 text-[11px] font-semibold transition-opacity duration-200 ${regTouched.confirmPassword && regErrors.confirmPassword ? "opacity-100" : "opacity-0"}`}
              >
                {regErrors.confirmPassword}
              </span>
            </div>

            {/* NÚT SUBMIT BO GÓC TRÒN */}
            <button
              type="submit"
              disabled={!isRegValid || isLoading}
              className="w-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 text-white text-[15px] font-bold py-4 transition-all duration-300 hover:from-rose-500 hover:to-rose-600 hover:shadow-[0_8px_20px_rgba(244,63,94,0.35)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {isLoading ? "Đang xử lý..." : "Đăng Ký →"}
            </button>

            {/* LINK CHUYỂN TRANG */}
            <p className="mt-6 text-[13px] text-slate-500 text-center">
              Đã có tài khoản?{" "}
              <span
                onClick={() => togglePanel(false)}
                className="text-rose-500 font-bold cursor-pointer hover:underline"
              >
                Đăng nhập ngay
              </span>
            </p>
          </form>
        </div>

        {/* ========================================== */}
        {/* FORM ĐĂNG NHẬP */}
        {/* ========================================== */}
        <div
          className={`absolute top-0 h-full left-0 w-full md:w-1/2 transition-all duration-700 ease-in-out ${isSignUp ? "md:translate-x-full opacity-0 z-10 pointer-events-none" : "opacity-100 z-20"}`}
        >
          <form
            onSubmit={handleLogin}
            className="bg-white flex flex-col items-center justify-center px-10 md:px-14 h-full text-center"
          >
            <h1
              className="font-bold text-3xl mb-1 text-slate-900"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Chào Mừng Trở Lại
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Đăng nhập để tiếp tục mua sắm Hamoni decor
            </p>

            <div className="h-[44px] w-full flex items-center justify-center mb-1">
              <div
                className={`w-full p-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[13px] transition-opacity duration-300 ${apiError && !isSignUp ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                {apiError || "Lỗi"}
              </div>
            </div>

            <div className="w-full text-left relative mb-6">
              <input
                type="email"
                placeholder="Email"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]"
              />
            </div>

            <div className="w-full text-left relative mb-4">
              <input
                type="password"
                placeholder="Mật khẩu"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                className="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]"
              />
            </div>

            <div className="w-full flex justify-between items-center mb-8 px-1">
              <div className="flex items-center gap-2 text-[13px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-rose-500 w-4 h-4 cursor-pointer rounded"
                />
                <label
                  htmlFor="remember"
                  className="cursor-pointer select-none"
                >
                  Nhớ mật khẩu
                </label>
              </div>

              {/* ĐÃ THAY ĐỔI: Sử dụng button để bật Modal thay vì Link */}
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[12px] text-slate-700 font-semibold transition-colors hover:text-rose-500 bg-transparent border-none outline-none cursor-pointer p-0"
              >
                Quên mật khẩu?
              </button>
            </div>

            <button
              type="submit"
              disabled={!isLoginValid || isLoading}
              className="w-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 text-white text-[15px] font-bold py-4 transition-all duration-300 hover:from-rose-500 hover:to-rose-600 hover:shadow-[0_8px_20px_rgba(244,63,94,0.35)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              {isLoading ? "Đang đăng nhập..." : "Đăng Nhập →"}
            </button>

            <p className="mt-8 text-[13px] text-slate-500 text-center">
              Chưa có tài khoản?{" "}
              <span
                onClick={() => togglePanel(true)}
                className="text-rose-500 font-bold cursor-pointer hover:underline"
              >
                Tạo tài khoản mới
              </span>
            </p>
          </form>
        </div>

        {/* ========================================== */}
        {/* KHỐI OVERLAY HÌNH ẢNH */}
        {/* ========================================== */}
        <div
          className={`hidden md:block absolute top-0 left-0 w-1/2 h-full bg-white transition-transform duration-700 ease-in-out z-[100] pointer-events-none ${isSignUp ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="relative w-full h-full">
            <img
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${isSignUp ? "opacity-100" : "opacity-0"}`}
              src={signUpOverlayImage}
              alt="Hamoni decor sign up"
            />
            <img
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${isSignUp ? "opacity-0" : "opacity-100"}`}
              src={loginOverlayImage}
              alt="Hamoni decor sign in"
            />
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL QUÊN MẬT KHẨU */}
      {/* ========================================== */}
      {isForgotModalOpen && (
        <ForgotPasswordModal onClose={() => setIsForgotModalOpen(false)} />
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
}
