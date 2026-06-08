import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  Bell,
  FileText,
  Settings,
  LogOut,
  Check,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useStore } from "../../store/useStore";
import ChatWidget from "./ChatWidget";
import io from "socket.io-client";
import "./ClientLayout.css";

// CẤU HÌNH API VÀ SOCKET
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SOCKET_BASE =
  import.meta.env.VITE_SOCKET_URL ||
  API_BASE.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";
const socket = io(SOCKET_BASE, { transports: ["websocket"] });

const getStoredUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem("user_info")) || {};
  } catch {
    return {};
  }
};

// ===============================================
// LOGIC ĐIỀU HƯỚNG THÔNG BÁO THÔNG MINH
// ===============================================
const getNotificationTarget = (notif) => {
  const title = String(notif?.title || "");
  const content = String(notif?.content || "");
  const combinedText = `${title} ${content}`.toLowerCase();

  const orderIdMatch =
    combinedText.match(/#(\d+)/) || combinedText.match(/đơn hàng (\d+)/);
  const orderId = orderIdMatch ? Number(orderIdMatch[1]) : null;

  if (
    orderId &&
    /(thanh toán|trạng thái|giao hàng|hủy|thành công|đơn hàng)/.test(
      combinedText,
    )
  ) {
    return `/order/${orderId}`;
  }

  if (
    /(khuyến mãi|khuyen mai|voucher|giảm giá|giam gia|ưu đãi)/.test(
      combinedText,
    )
  ) {
    return "/khuyen-mai";
  }

  return "/profile";
};

const ClientLayout = () => {
  const SEARCH_HISTORY_KEY = "hamoni_search_history";
  const MAX_HISTORY_ITEMS = 8;

  // --- 1. GLOBAL STATE & ROUTER ---
  const { user, logout, cartVariantCount } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  // --- 2. LOCAL STATE ---
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSearchSuggest, setShowSearchSuggest] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // State Search
  const [searchKeyword, setSearchKeyword] = useState(
    () => new URLSearchParams(location.search).get("search") || "",
  );
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter(Boolean).slice(0, MAX_HISTORY_ITEMS)
        : [];
    } catch {
      return [];
    }
  });

  // State Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- 3. REFS & VARIABLES ---
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  const storedUserInfo = getStoredUserInfo();
  const displayUser = user || storedUserInfo;
  const displayUserName =
    displayUser?.name ||
    displayUser?.hoTen ||
    storedUserInfo?.hoTen ||
    storedUserInfo?.name ||
    "";
  const displayAvatar =
    displayUser?.avatarUrl || storedUserInfo?.avatarUrl || "";

  // --- 4. EFFECTS ---
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // ĐÃ FIX: Hàm đảm bảo Socket luôn join đúng phòng dù mạng chậm
    const joinRoom = () => {
      socket.emit("join_notification_room", user.id);
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_BASE}/notifications/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.isRead).length);
        }
      } catch (error) {
        console.error("Lỗi lấy thông báo:", error);
      }
    };

    fetchNotifications();

    // Lắng nghe sự kiện connect để đảm bảo join thành công
    if (socket.connected) {
      joinRoom();
    }
    socket.on("connect", joinRoom);

    socket.on("new_notification", (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.off("new_notification");
    };
  }, [user?.id]);

  // --- 5. HANDLERS ---
  const handleSearchSubmit = () => {
    const keyword = searchKeyword.trim();
    if (!keyword) {
      navigate("/products");
      return;
    }

    setSearchHistory((prev) => {
      const normalizedKeyword = keyword.toLowerCase();
      const next = [
        keyword,
        ...prev.filter((item) => item.toLowerCase() !== normalizedKeyword),
      ].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });

    navigate(`/products?search=${encodeURIComponent(keyword)}`);
    setShowSearchSuggest(false);
  };

  const handleHistoryClick = (keyword) => {
    setSearchKeyword(keyword);
    navigate(`/products?search=${encodeURIComponent(keyword)}`);
    setShowSearchSuggest(false);
  };

  const handleMarkAsRead = async (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Lỗi đánh dấu đã đọc:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_BASE}/notifications/user/${user.id}/read-all`, {
        method: "PUT",
      });
    } catch (error) {
      console.error("Lỗi đánh dấu đọc tất cả:", error);
    }
  };

  const handleNotificationClick = (notif) => {
    setIsNotifOpen(false);
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    navigate(getNotificationTarget(notif));
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    localStorage.removeItem("user");
    localStorage.removeItem("user_info");
    localStorage.removeItem("userPermissions");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ĐÃ FIX: Bổ sung lại hàm fomat thời gian chuẩn Việt Nam
  const formatTime = (timeString) => {
    if (!timeString) return "Gần đây";
    try {
      const date = new Date(timeString);
      return (
        date.toLocaleDateString("vi-VN") +
        " " +
        date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return timeString;
    }
  };

  // --- 6. RENDER GIAO DIỆN ---
  return (
    <div className="client-theme min-h-screen flex flex-col bg-gray-50 text-slate-800">
      <header
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 ${isScrolled ? "bg-white shadow-md" : "bg-white/95 backdrop-blur-sm border-b border-gray-100"}`}
      >
        <h1 className="hidden">
          Hamoni Cosmetic - Mỹ phẩm thiên nhiên cao cấp
        </h1>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 md:h-20 flex flex-row items-center justify-between gap-8">
          {/* Logo & Mobile Menu */}
          <div className="flex flex-row items-center gap-4">
            <button className="lg:hidden text-slate-600 hover:text-rose-500 transition-colors bg-transparent border-0">
              <Menu size={24} />
            </button>
            <Link
              to="/"
              className="text-2xl font-black tracking-tight text-slate-900 text-decoration:none flex flex-row items-center gap-1"
            >
              HAMONI<span className="text-rose-500"></span>
            </Link>
          </div>

          {/* Main Menu (Desktop) */}
          <ul className="hidden lg:flex flex-row items-center gap-8 font-medium text-sm text-slate-600 mb-0 pl-0">
            <li>
              <Link
                to="/"
                className="hover:text-rose-500 transition-colors text-decoration:none"
              >
                Trang chủ
              </Link>
            </li>
            <li>
              <Link
                to="/products"
                className="hover:text-rose-500 transition-colors text-decoration:none"
              >
                Sản phẩm
              </Link>
            </li>
            <li>
              <Link
                to="/khuyen-mai"
                className="hover:text-rose-500 transition-colors text-decoration:none text-rose-500 font-semibold"
              >
                Khuyến mãi
              </Link>
            </li>
            <li>
              <Link
                to="/lien-he"
                className="hover:text-rose-500 transition-colors text-decoration:none"
              >
                Liên hệ
              </Link>
            </li>
          </ul>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-md relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm kem dưỡng, serum..."
                className="w-full bg-slate-100 text-sm rounded-full py-2.5 pl-5 pr-12 border border-transparent focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-100 outline-none transition-all"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onFocus={() => setShowSearchSuggest(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchSuggest(false), 200)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
              />
              <button
                onClick={handleSearchSubmit}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-colors border-0"
              >
                <Search size={14} />
              </button>
            </div>

            {showSearchSuggest && (
              <div className="absolute top-full mt-2 w-full bg-white shadow-xl rounded-xl border border-gray-100 p-4 z-50">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase">
                  Lịch sử tìm kiếm
                </p>
                <div className="flex flex-row flex-wrap gap-2">
                  {searchHistory.length > 0 ? (
                    searchHistory.map((item) => (
                      <button
                        key={item}
                        className="text-xs bg-slate-100 px-3 py-1.5 rounded-full cursor-pointer hover:bg-slate-200 border-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleHistoryClick(item)}
                      >
                        {item}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      Chưa có lịch sử tìm kiếm
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Icons Right */}
          <div className="flex flex-row items-center gap-6">
            {/* THÔNG BÁO */}
            <div className="relative flex items-center" ref={notifRef}>
              <button
                onClick={() => {
                  if (user) setIsNotifOpen(!isNotifOpen);
                  else navigate("/login");
                }}
                className="relative text-slate-600 hover:text-rose-500 transition-colors py-2 outline-none group bg-transparent border-0"
              >
                <Bell
                  size={22}
                  className={unreadCount > 0 ? "animate-bounce" : ""}
                />
                {unreadCount > 0 && (
                  <span className="absolute top-1 -right-1.5 bg-rose-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {!isNotifOpen && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Thông báo
                  </span>
                )}
              </button>

              {isNotifOpen && user && (
                <div className="absolute top-full right-[-50px] sm:right-0 mt-3 w-80 bg-white shadow-xl rounded-xl border border-gray-100 overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100 flex flex-row justify-between items-center bg-slate-50/80">
                    <h3 className="font-bold text-sm text-slate-800 m-0">
                      Thông báo
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[11px] text-rose-500 hover:text-rose-600 font-medium flex flex-row items-center gap-1 border-0 bg-transparent"
                      >
                        <Check size={12} /> Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        Bạn chưa có thông báo nào.
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-slate-50 flex flex-row gap-3 ${!notif.isRead ? "bg-rose-50/50" : ""}`}
                        >
                          <div
                            className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!notif.isRead ? "bg-rose-500" : "bg-transparent"}`}
                          ></div>
                          <div className="flex-1">
                            <p
                              className={`text-sm m-0 ${!notif.isRead ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}
                            >
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {notif.content}
                            </p>
                            <div className="flex flex-row items-center gap-1 text-[10px] text-slate-400 mt-2">
                              {/* ĐÃ FIX: Gọi hàm formatTime để in ra giờ đẹp */}
                              <Clock size={10} /> {formatTime(notif.time)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100 text-center bg-slate-50/80">
                    <Link
                      to="/profile"
                      onClick={() => setIsNotifOpen(false)}
                      className="text-xs text-slate-500 hover:text-rose-500 font-medium block w-full py-1 text-decoration:none transition-colors"
                    >
                      Xem tất cả thông báo
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* GIỎ HÀNG */}
            <div className="relative group flex items-center">
              <Link
                to="/cart"
                className="relative text-slate-600 hover:text-rose-500 transition-colors py-2"
              >
                <ShoppingCart size={22} />
                {cartVariantCount > 0 && (
                  <span className="absolute top-1 -right-1.5 bg-rose-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full border-2 border-white">
                    {cartVariantCount > 99 ? "99+" : cartVariantCount}
                  </span>
                )}
              </Link>
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Giỏ hàng
              </span>
            </div>

            {/* USER MENU */}
            <div className="hidden sm:block relative py-2" ref={userMenuRef}>
              {user ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="flex flex-row items-center gap-3 text-left outline-none group border-0 bg-transparent"
                  >
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 via-pink-400 to-purple-400 p-[2px] transition-transform duration-300 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-rose-600 font-black text-sm overflow-hidden">
                        {displayAvatar ? (
                          <img
                            src={displayAvatar}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : displayUserName ? (
                          displayUserName.charAt(0).toUpperCase()
                        ) : (
                          "U"
                        )}
                      </div>
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-[-2px]">
                        Xin chào,
                      </span>
                      <span className="text-sm font-bold text-slate-800 group-hover:text-rose-500 transition-colors duration-300 max-w-[120px] truncate">
                        {displayUserName || "Khách hàng"}
                      </span>
                    </div>
                  </button>

                  <div
                    className={`absolute top-full right-0 mt-3 w-64 bg-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] rounded-2xl border border-slate-100 z-50 transition-all duration-300 origin-top-right overflow-hidden ${isUserMenuOpen ? "opacity-100 scale-100 visible translate-y-0" : "opacity-0 scale-95 invisible -translate-y-2"}`}
                  >
                    <div className="m-2 p-3 bg-gradient-to-br from-rose-50 to-slate-50 rounded-xl border border-slate-100/50 flex flex-row items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 text-white flex items-center justify-center text-base font-black shadow-inner flex-shrink-0 overflow-hidden">
                        {displayAvatar ? (
                          <img
                            src={displayAvatar}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : displayUserName ? (
                          displayUserName.charAt(0).toUpperCase()
                        ) : (
                          "U"
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="text-sm font-extrabold text-slate-800 truncate m-0 leading-tight">
                          {displayUserName || "Người dùng"}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate m-0 mt-0.5">
                          {user.email || "Thành viên VIP"}
                        </p>
                      </div>
                    </div>

                    <div className="px-2 pb-2 flex flex-col gap-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="group relative flex flex-row items-center justify-between px-3 py-2 rounded-xl overflow-hidden text-decoration:none bg-white"
                      >
                        <div className="absolute inset-0 bg-rose-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>

                        {/* Wrapper bọc Icon và Text đảm bảo nằm ngang */}
                        <div className="relative z-10 flex flex-row items-center gap-2.5">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-rose-500 group-hover:shadow-sm transition-all duration-300 flex-shrink-0">
                            <Settings
                              size={16}
                              className="group-hover:rotate-90 transition-transform duration-500"
                            />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-600 group-hover:text-rose-600 transition-colors whitespace-nowrap leading-none mt-0.5">
                            Tài khoản của tôi
                          </span>
                        </div>

                        <ChevronRight
                          size={14}
                          className="relative z-10 ml-auto text-rose-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0"
                        />
                      </Link>

                      <Link
                        to="/orderhistory"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="group relative flex flex-row items-center justify-between px-3 py-2 rounded-xl overflow-hidden text-decoration:none bg-white"
                      >
                        <div className="absolute inset-0 bg-rose-50 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-0"></div>

                        <div className="relative z-10 flex flex-row items-center gap-2.5">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-rose-500 group-hover:shadow-sm transition-all duration-300 flex-shrink-0">
                            <FileText
                              size={16}
                              className="group-hover:-translate-y-0.5 transition-transform duration-300"
                            />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-600 group-hover:text-rose-600 transition-colors whitespace-nowrap leading-none mt-0.5">
                            Lịch sử đơn hàng
                          </span>
                        </div>

                        <ChevronRight
                          size={14}
                          className="relative z-10 ml-auto text-rose-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 flex-shrink-0"
                        />
                      </Link>
                    </div>

                    <div className="p-2 bg-slate-50 mt-0 border-t border-slate-100">
                      <button
                        onClick={handleLogout}
                        className="group w-full flex flex-row items-center justify-center gap-2 py-2 rounded-xl bg-white border border-rose-100 text-[13px] font-bold text-rose-500 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all duration-300 outline-none shadow-sm"
                      >
                        <LogOut
                          size={16}
                          className="group-hover:-translate-x-1 transition-transform duration-300"
                        />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-row items-center group relative">
                  <Link
                    to="/login"
                    className="relative flex flex-row items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-all duration-300 text-decoration:none shadow-sm"
                  >
                    <User size={18} />
                    <span className="text-[13px] font-semibold hidden lg:block">
                      Đăng nhập
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full pt-16 md:pt-20">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-200 pt-10 pb-8">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div>
              <Link
                to="/"
                className="text-2xl font-black tracking-tight text-slate-900 text-decoration:none mb-4 inline-block"
              >
                HAMONI<span className="text-rose-500"></span>
              </Link>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Đánh thức vẻ đẹp nguyên bản của bạn bằng tinh túy từ thiên
                nhiên. Sản phẩm an toàn, lành tính và hiệu quả.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Liên kết nhanh</h4>
              <ul className="space-y-3 pl-0 mb-0 text-sm text-slate-500">
                <li>
                  <Link
                    to="/about"
                    className="hover:text-rose-500 text-decoration:none transition-colors"
                  >
                    Về chúng tôi
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="hover:text-rose-500 text-decoration:none transition-colors"
                  >
                    Chính sách bảo mật
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="hover:text-rose-500 text-decoration:none transition-colors"
                  >
                    Điều khoản dịch vụ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">
                Hỗ trợ khách hàng
              </h4>
              <ul className="space-y-3 pl-0 mb-0 text-sm text-slate-500">
                <li>
                  <Link
                    to="/help"
                    className="hover:text-rose-500 text-decoration:none transition-colors"
                  >
                    Trung tâm trợ giúp
                  </Link>
                </li>
                <li>
                  <Link
                    to="/guide"
                    className="hover:text-rose-500 text-decoration:none transition-colors"
                  >
                    Hướng dẫn mua hàng
                  </Link>
                </li>
                <li>
                  <Link
                    to="/return-policy"
                    className="hover:text-rose-500 text-decoration:none transition-colors"
                  >
                    Chính sách đổi trả
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">
                Đăng ký nhận tin
              </h4>
              <p className="text-sm text-slate-500 mb-4">
                Nhận ngay voucher 50K cho đơn hàng đầu tiên khi đăng ký email.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email của bạn..."
                  className="w-full bg-slate-50 border border-gray-200 rounded-lg px-4 py-2 text-sm outline-none focus:border-rose-300"
                />
                <button className="bg-slate-900 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors border-0">
                  Gửi
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 text-center text-sm text-slate-400">
            © 2026 Hamoni Cosmetic. Khóa luận tốt nghiệp nhóm 96.
          </div>
        </div>
      </footer>
      <ChatWidget />
    </div>
  );
};

export default ClientLayout;
