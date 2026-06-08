import React, { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Home,
  Save,
  Key,
  Lock,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import authApi from "../../../services/authApi";

const CustomerProfileForm = ({ formData, handleInputChange, handleUpdate }) => {
  // State quản lý việc đóng/mở modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pwdData, setPwdData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // State quản lý thông báo Toast
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Hàm hiển thị thông báo
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    // Tự động ẩn sau 3 giây
    setTimeout(() => {
      setToast({ show: false, message: "", type: "success" });
    }, 3000);
  };

  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    setPwdData((prev) => ({ ...prev, [name]: value }));
  };

  const submitChangePassword = async (e) => {
    e.preventDefault();
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      showToast("Mật khẩu mới không khớp!", "danger");
      return;
    }

    try {
      await authApi.changePassword({
        oldPassword: pwdData.oldPassword,
        newPassword: pwdData.newPassword,
      });

      showToast("Đổi mật khẩu thành công!", "success");
      setIsModalOpen(false);
      setPwdData({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message || "Không thể đổi mật khẩu!";
      showToast(errorMsg, "danger");
    }
  };

  return (
    <>
      {/* --- THÔNG BÁO TOAST BOOTSTRAP --- */}
      {toast.show && (
        <div
          className="position-fixed top-0 end-0 p-4"
          style={{ zIndex: 9999 }}
        >
          <div
            className={`toast show align-items-center text-white bg-${toast.type} border-0 shadow-lg rounded-3`}
            role="alert"
          >
            <div className="d-flex">
              <div className="toast-body d-flex align-items-center gap-2 fw-medium fs-6 py-3">
                {toast.type === "success" ? (
                  <CheckCircle2 size={24} />
                ) : (
                  <AlertCircle size={24} />
                )}
                {toast.message}
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-3 m-auto shadow-none"
                onClick={() => setToast({ ...toast, show: false })}
                aria-label="Close"
              ></button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORM THÔNG TIN CÁ NHÂN --- */}
      <form onSubmit={handleUpdate}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
              <User size={18} /> Họ và Tên
            </label>
            <input
              type="text"
              name="HoTen"
              className="form-control form-control-lg bg-light"
              value={formData?.HoTen || ""}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
              <Mail size={18} /> Email <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              name="Email"
              className="form-control form-control-lg bg-light"
              value={formData?.Email || ""}
              onChange={handleInputChange}
              placeholder="example@gmail.com"
              required
            />
            <small className="form-text text-muted">
              Phải chứa @ và đuôi .com (hoặc .vn, .org, ...)
            </small>
          </div>

          <div className="col-md-6">
            <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
              <Phone size={18} /> Số điện thoại
            </label>
            <input
              type="text"
              name="SoDienThoai"
              className="form-control form-control-lg bg-light"
              value={formData?.SoDienThoai || ""}
              onChange={handleInputChange}
              placeholder="0912345678"
              pattern="[0-9]*"
              maxLength="10"
              required
            />
            <small className="form-text text-muted">
              Bắt buộc, phải là 10 chữ số
            </small>
          </div>

          <div className="col-md-6">
            <label className="form-label text-secondary fw-semibold">
              Giới tính
            </label>
            <select
              className="form-control form-control-lg bg-light"
              name="GioiTinh"
              value={formData?.GioiTinh || ""}
              onChange={handleInputChange}
            >
              <option value="">-- Chọn giới tính --</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label text-secondary fw-semibold">
              Ngày sinh
            </label>
            <input
              type="date"
              name="NgaySinh"
              className="form-control form-control-lg bg-light"
              value={formData?.NgaySinh || ""}
              onChange={handleInputChange}
              max={new Date().toISOString().split("T")[0]}
            />
            <small className="form-text text-muted">
              Không bắt buộc. Nếu có, chọn ngày sinh hợp lệ.
            </small>
          </div>

          <div className="col-md-6">
            <label className="form-label text-secondary fw-semibold d-flex align-items-center gap-2">
              <Home size={18} /> Địa chỉ
            </label>
            <input
              type="text"
              name="DiaChi"
              className="form-control form-control-lg bg-light"
              value={formData?.DiaChi || ""}
              onChange={handleInputChange}
              placeholder="VD: 123 Đường ABC..."
            />
          </div>
        </div>

        <hr className="my-5 opacity-25" />

        <div className="d-flex justify-content-between align-items-center gap-3">
          <button
            type="button"
            className="btn btn-outline-secondary fw-semibold d-flex align-items-center gap-2 px-4 py-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Key size={18} /> Đổi mật khẩu
          </button>

          <button
            type="submit"
            className="btn btn-success fw-bold d-flex align-items-center gap-2 px-4 py-2"
          >
            <Save size={18} /> Lưu thay đổi
          </button>
        </div>
      </form>

      {/* --- MODAL ĐỔI MẬT KHẨU --- */}
      {isModalOpen && (
        <div
          className="fixed-top w-100 h-100 d-flex justify-content-center align-items-center"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 1060,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="bg-white rounded-4 shadow-lg overflow-hidden border-0"
            style={{ width: "400px" }}
          >
            <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-light">
              <h5 className="m-0 fw-bold d-flex align-items-center gap-2 text-dark">
                <KeyRound size={20} className="text-primary" /> Đổi mật khẩu
              </h5>
              <button
                type="button"
                className="btn-close shadow-none"
                onClick={() => setIsModalOpen(false)}
              ></button>
            </div>

            <form onSubmit={submitChangePassword} className="p-4">
              <div className="mb-3 text-start">
                <label className="form-label small fw-bold text-secondary d-flex align-items-center gap-2">
                  <Lock size={14} /> MẬT KHẨU CŨ
                </label>
                <input
                  type="password"
                  name="oldPassword"
                  required
                  className="form-control bg-light border-0 py-2 shadow-none"
                  value={pwdData.oldPassword}
                  onChange={handlePwdChange}
                />
              </div>

              <div className="mb-3 text-start">
                <label className="form-label small fw-bold text-secondary d-flex align-items-center gap-2">
                  <ShieldCheck size={14} /> MẬT KHẨU MỚI
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  className="form-control bg-light border-0 py-2 shadow-none"
                  value={pwdData.newPassword}
                  onChange={handlePwdChange}
                />
              </div>

              <div className="mb-4 text-start">
                <label className="form-label small fw-bold text-secondary d-flex align-items-center gap-2">
                  <ShieldCheck size={14} /> XÁC NHẬN LẠI
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  className="form-control bg-light border-0 py-2 shadow-none"
                  value={pwdData.confirmPassword}
                  onChange={handlePwdChange}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold rounded-3 shadow-sm"
              >
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerProfileForm;
