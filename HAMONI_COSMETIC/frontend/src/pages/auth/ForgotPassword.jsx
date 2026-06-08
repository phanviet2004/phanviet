import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  LockKeyhole,
  AlertCircle,
  X,
  Mail,
} from "lucide-react";
import { toast } from "react-toastify";
import { useForm } from "react-hook-form";
import axiosClient from "../../services/axiosClient";

const ForgotPasswordModal = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");

  // ==========================================
  // FORM 1: OTP
  // ==========================================
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
  } = useForm();

  const onRequestOTP = async (data) => {
    setIsLoading(true);
    try {
      const response = await axiosClient.post("/auth/forgot-password", {
        email: data.email,
      });
      toast.success(
        response?.message || "Mã OTP đã được gửi đến email của bạn!",
      );
      setSavedEmail(data.email);
      setStep(2);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Lỗi khi gửi yêu cầu. Có thể email chưa được đăng ký.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // FORM 2: ĐỔI MẬT KHẨU
  // ==========================================
  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    watch,
    formState: { errors: errorsStep2 },
  } = useForm();
  const newPasswordValue = watch("newPassword", "");

  const onResetPassword = async (data) => {
    setIsLoading(true);
    try {
      const response = await axiosClient.post("/auth/reset-password", {
        email: savedEmail,
        otp: data.otp,
        newPassword: data.newPassword,
      });

      toast.success(
        response?.message ||
          "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.",
      );
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        "Mã OTP không chính xác hoặc đã hết hạn.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* LỚP OVERLAY - Đã set z-[999] để luôn nằm trên ảnh */
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-opacity duration-300">
      {/* BOX TRẮNG CHÍNH - Đồng bộ bo góc 30px và shadow giống AuthPage */}
      <div className="w-full max-w-[450px] bg-white rounded-[30px] shadow-[0_20px_50px_rgba(225,29,72,0.1)] p-8 md:p-10 relative border border-rose-50 transform transition-all scale-100">
        {/* NÚT TẮT (X) CÁCH ĐIỆU */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 rounded-full transition-colors"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* ======================= BƯỚC 1 ======================= */}
        {step === 1 && (
          <div className="text-center mt-2">
            <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-5">
              <Mail size={24} strokeWidth={2} />
            </div>

            {/* Font Playfair Display đồng bộ với AuthPage */}
            <h1
              className="text-3xl font-bold text-slate-900 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Quên Mật Khẩu
            </h1>
            <p className="text-sm text-slate-500 mb-8">
              Nhập địa chỉ email để nhận mã xác thực
            </p>

            <form
              onSubmit={handleSubmitStep1(onRequestOTP)}
              className="text-left"
            >
              <div className="mb-8">
                <input
                  type="email"
                  placeholder="Nhập email của bạn..."
                  className={`w-full bg-slate-50 border ${errorsStep1.email ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
                  {...registerStep1("email", {
                    required: "Vui lòng nhập địa chỉ email!",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Email không hợp lệ!",
                    },
                  })}
                />
                {errorsStep1.email && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-2 flex items-center gap-1 pl-2">
                    <AlertCircle size={12} /> {errorsStep1.email.message}
                  </p>
                )}
              </div>

              {/* Nút Submit đổi thành Gradient tone Rose đồng bộ */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 text-white text-[15px] font-bold py-4 transition-all duration-300 hover:from-rose-500 hover:to-rose-600 hover:shadow-[0_8px_20px_rgba(244,63,94,0.35)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                {isLoading ? "Đang gửi OTP..." : "Gửi yêu cầu →"}
              </button>
            </form>
          </div>
        )}

        {/* ======================= BƯỚC 2 ======================= */}
        {step === 2 && (
          <div className="text-center mt-2">
            <div className="mx-auto w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-5">
              <LockKeyhole size={24} strokeWidth={2} />
            </div>

            {/* Font Playfair Display */}
            <h1
              className="text-3xl font-bold text-slate-900 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Đặt Lại Mật Khẩu
            </h1>
            <p className="text-[13px] text-slate-500 mb-8 px-2">
              Vui lòng nhập mã xác thực gồm 6 chữ số vừa được gửi đến{" "}
              <b>{savedEmail}</b>
            </p>

            <form
              onSubmit={handleSubmitStep2(onResetPassword)}
              className="text-left"
            >
              <div className="mb-5 relative">
                <input
                  type="text"
                  placeholder="Mã OTP (6 chữ số)"
                  maxLength={6}
                  className={`w-full bg-slate-50 border ${errorsStep2.otp ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
                  {...registerStep2("otp", {
                    required: "Vui lòng nhập mã OTP!",
                    minLength: { value: 6, message: "Mã OTP phải đủ 6 ký tự!" },
                  })}
                />
                <div className="absolute right-5 top-3.5 text-slate-400">
                  <ShieldCheck size={18} />
                </div>
                {errorsStep2.otp && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-2 flex items-center gap-1 pl-2">
                    <AlertCircle size={12} /> {errorsStep2.otp.message}
                  </p>
                )}
              </div>

              <div className="mb-5 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu mới"
                  className={`w-full bg-slate-50 border ${errorsStep2.newPassword ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none pr-12 text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
                  {...registerStep2("newPassword", {
                    required: "Vui lòng nhập mật khẩu mới!",
                    minLength: {
                      value: 6,
                      message: "Mật khẩu tối thiểu 6 ký tự!",
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-rose-500 transition-colors bg-transparent border-0 outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {errorsStep2.newPassword && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-2 flex items-center gap-1 pl-2">
                    <AlertCircle size={12} /> {errorsStep2.newPassword.message}
                  </p>
                )}
              </div>

              <div className="mb-8 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu mới"
                  className={`w-full bg-slate-50 border ${errorsStep2.confirmPassword ? "border-rose-400" : "border-slate-100"} px-5 py-3.5 rounded-2xl outline-none pr-12 text-sm transition-all duration-300 focus:border-rose-300 focus:bg-white focus:shadow-[0_4px_15px_rgba(251,113,133,0.15)]`}
                  {...registerStep2("confirmPassword", {
                    required: "Vui lòng xác nhận mật khẩu!",
                    validate: (value) =>
                      value === newPasswordValue || "Mật khẩu không khớp!",
                  })}
                />
                {errorsStep2.confirmPassword && (
                  <p className="text-rose-500 text-[11px] font-semibold mt-2 flex items-center gap-1 pl-2">
                    <AlertCircle size={12} />{" "}
                    {errorsStep2.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Nút Submit đổi thành Gradient tone Rose đồng bộ */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 text-white text-[15px] font-bold py-4 transition-all duration-300 hover:from-rose-500 hover:to-rose-600 hover:shadow-[0_8px_20px_rgba(244,63,94,0.35)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-6"
              >
                {isLoading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu →"}
              </button>
            </form>
          </div>
        )}

        {/* NÚT QUAY LẠI CHUNG */}
        <div className="text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-bold text-slate-500 hover:text-rose-500 hover:underline transition-colors bg-transparent border-none outline-none cursor-pointer p-0"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
