import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import authApi from "../../../services/authApi";
import Swal from "sweetalert2"; // <-- Import SweetAlert2
import { useStore } from "../../../store/useStore";

// CẤU HÌNH SWEETALERT CHO GIAO DIỆN SANG TRỌNG
const swalCustom = Swal.mixin({
  customClass: {
    popup: "!bg-white !rounded-[24px] !shadow-2xl !border !border-slate-100",
    title: "!text-xl !font-black !text-slate-800 !mt-2",
    htmlContainer: "!text-sm !text-slate-500 !mt-1",
    actions: "!gap-3 !w-full !mt-6",
    confirmButton:
      "!bg-rose-500 hover:!bg-rose-600 !text-white !rounded-xl !px-6 !py-2.5 !font-semibold !transition-all !border-0 !shadow-sm !outline-none !m-0",
    cancelButton:
      "!bg-slate-100 hover:!bg-slate-200 !text-slate-700 !rounded-xl !px-6 !py-2.5 !font-semibold !transition-all !border-0 !outline-none !m-0",
    backdrop: "backdrop-blur-sm !bg-slate-900/30",
  },
  buttonsStyling: false,
});

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const navigate = useNavigate();
  const logout = useStore((state) => state.logout);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const [userInfo, setUserInfo] = useState({
    name: "Đang tải...",
    role: "...",
    avatar: "",
    permissions: [],
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await authApi.getCurrentUser();
        const userData = response.user;

        // If backend doesn't return permissions, keep any cached permissions in localStorage
        const cachedPermissions = JSON.parse(
          localStorage.getItem("userPermissions") || "[]",
        );
        const apiPermissions = userData.permissions || cachedPermissions || [];

        setUserInfo({
          name: userData.hoTen,
          role: userData.role,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${userData.hoTen}&backgroundColor=635F40`,
          permissions: apiPermissions,
        });
        localStorage.setItem("userPermissions", JSON.stringify(apiPermissions));
      } catch (error) {
        console.error("Lỗi tải dữ liệu cá nhân:", error);
        // Fall back to cached permissions if available
        const cachedPermissions = JSON.parse(
          localStorage.getItem("userPermissions") || "[]",
        );
        setUserInfo({
          name: "Khách",
          role: "Phiên hết hạn",
          avatar: "",
          permissions: cachedPermissions || [],
        });
      }
    };

    fetchUserInfo();
  }, []);

  // ĐÃ SỬA: Thay thế window.confirm bằng SweetAlert2
  const handleLogout = async () => {
    const result = await swalCustom.fire({
      title: "Đăng xuất?",
      text: "Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc này không?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Vâng, đăng xuất",
      cancelButtonText: "Hủy bỏ",
    });

    if (result.isConfirmed) {
      logout();
      localStorage.removeItem("user");
      localStorage.removeItem("user_info");
      localStorage.removeItem("userPermissions");
      localStorage.removeItem("token");
      navigate("/login");
    }
  };

  const handleToggleSidebar = () => {
    if (isOpen && showUserMenu) setShowUserMenu(false);
    toggleSidebar();
  };

  const handleNavigate = (path) => {
    setShowUserMenu(false);
    navigate(path);
  };

  const canViewModule = (hideCode) => {
    if (userInfo.permissions.includes("ALL")) return true;
    return !userInfo.permissions.includes(hideCode);
  };

  const isAdmin = userInfo.permissions.includes("ALL");

  return (
    <aside className={`admin-sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <button
          type="button"
          className="toggle-btn"
          onClick={handleToggleSidebar}
        >
          ☰
        </button>
        {isOpen && <h2 className="sidebar-brand">Hamoni</h2>}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {canViewModule("HIDE_MODULE_DASHBOARD") && (
            <li className="menu-item-group">
              <div
                className="nav-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                {/* CLICK = CHUYỂN TRANG */}
                <div
                  onClick={() => navigate("/admin/dashboard")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    flex: 1,
                    cursor: "pointer",
                  }}
                >
                  <span className="icon">📊</span>
                  {isOpen && <span className="text">Dashboard</span>}
                </div>

                {/* CLICK = MỞ MENU */}
                {isOpen && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDashboardOpen(!isDashboardOpen);
                    }}
                    style={{
                      fontSize: "10px",
                      opacity: 0.6,
                      cursor: "pointer",
                    }}
                  >
                    {isDashboardOpen ? "▼" : "▶"}
                  </span>
                )}
              </div>

              {/* MENU CON */}
              {isDashboardOpen && isOpen && (
                <ul
                  style={{
                    listStyle: "none",
                    paddingLeft: "35px",
                    marginTop: "5px",
                    marginBottom: "10px",
                  }}
                >
                  <li>
                    <NavLink
                      to="/admin/inventory-report"
                      className={({ isActive }) =>
                        isActive ? "nav-item active" : "nav-item"
                      }
                      style={{ padding: "8px 10px", fontSize: "14px" }}
                    >
                      <span className="icon">📋</span>
                      <span className="text">Báo cáo SP & Tồn kho</span>
                    </NavLink>
                  </li>

                  {/* ✅ XOÁ: Xuất báo cáo Excel */}
                </ul>
              )}
            </li>
          )}

          {canViewModule("HIDE_MODULE_CUSTOMER") && (
            <li>
              <NavLink
                to="/admin/customers"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">👥</span>
                <span className="text">Khách hàng</span>
              </NavLink>
            </li>
          )}

          {canViewModule("HIDE_MODULE_PRODUCT") && (
            <li>
              <NavLink
                to="/admin/products"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">📦</span>
                <span className="text">Sản phẩm</span>
              </NavLink>
            </li>
          )}

          {canViewModule("HIDE_MODULE_BANNER") && (
            <li>
              <NavLink
                to="/admin/banners"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">🖼️</span>
                <span className="text">Quản lý Banner</span>
              </NavLink>
            </li>
          )}

          {canViewModule("HIDE_MODULE_CATEGORY") && (
            <li>
              <NavLink
                to="/admin/categories"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">🏷️</span>
                <span className="text">Danh mục</span>
              </NavLink>
            </li>
          )}
          {canViewModule("HIDE_MODULE_ORDER") && (
            <li>
              <NavLink
                to="/admin/orders"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">📦</span>
                <span className="text">Đơn hàng</span>
              </NavLink>
            </li>
          )}
          {canViewModule("HIDE_MODULE_WAREHOUSE") && (
            <li>
              <NavLink
                to="/admin/warehouse"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">📦</span>
                <span className="text">Kho Hàng</span>
              </NavLink>
            </li>
          )}
          {/* Thêm Quản lý đánh giá vào đây */}
          {canViewModule("HIDE_MODULE_REVIEW") && (
            <li>
              <NavLink
                to="/admin/reviews"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">⭐</span>
                <span className="text">Quản lý Đánh giá</span>
              </NavLink>
            </li>
          )}
          {canViewModule("HIDE_MODULE_VOUCHER") && (
            <li>
              <NavLink
                to="/admin/vouchers"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">🎟️</span>
                <span className="text">Mã giảm giá</span>
              </NavLink>
            </li>
          )}
          {canViewModule("HIDE_MODULE_PROMOTION") && (
            <li>
              <NavLink
                to="/admin/promotions"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">🎉</span>
                <span className="text">Khuyến mãi</span>
              </NavLink>
            </li>
          )}
          {canViewModule("HIDE_MODULE_AI_CONFIG") && (
            <li>
              <NavLink
                to="/admin/ai-config"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">🤖</span>
                <span className="text">Cấu hình AI</span>
              </NavLink>
            </li>
          )}
          {canViewModule("HIDE_MODULE_ADMIN_CHAT") && (
            <li>
              <NavLink
                to="/admin/chats"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">💬</span>
                <span className="text">Chat Admin</span>
              </NavLink>
            </li>
          )}

          {isAdmin && (
            <li>
              <NavLink
                to="/admin/roles"
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <span className="icon">🔑</span>
                <span className="text">Quản lý Phân quyền</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {/* MENU POPUP HỒ SƠ & ĐĂNG XUẤT */}
        {showUserMenu && (
          <div className="user-dropdown-menu">
            {/* Đổi class thành dropdown-action-btn */}
            <button
              type="button"
              className="dropdown-action-btn"
              onClick={() => handleNavigate("/admin/profile")}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Hồ sơ cá nhân</span>
            </button>

            <div className="dropdown-divider"></div>

            {/* Đổi class thành dropdown-action-btn logout-btn */}
            <button
              type="button"
              className="dropdown-action-btn logout-btn"
              onClick={handleLogout}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className={`user-card-btn ${showUserMenu ? "active" : ""}`}
          aria-haspopup="menu"
          aria-expanded={showUserMenu}
          onClick={() => setShowUserMenu((prev) => !prev)}
        >
          <div className="user-avatar">
            {userInfo.avatar ? (
              <img src={userInfo.avatar} alt="Avatar" />
            ) : (
              <span>{userInfo.name.charAt(0)}</span>
            )}
          </div>
          {isOpen && (
            <div className="user-info-text">
              <span className="user-name">{userInfo.name}</span>
              <span className="user-role">{userInfo.role}</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
