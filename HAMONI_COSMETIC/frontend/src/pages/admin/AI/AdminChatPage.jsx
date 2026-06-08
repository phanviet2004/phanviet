import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Send,
  User,
  Bot,
  UserCog,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import io from "socket.io-client";
import { useStore } from "../../../store/useStore";

// Use environment variables when available. Fallback to localhost for development.
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_URL = `${API_BASE.replace(/\/$/, "")}/admin`;
const SOCKET_BASE =
  import.meta.env.VITE_SOCKET_URL ||
  API_BASE.replace(/\/api\/?$/, "") ||
  "http://localhost:5000";
const socket = io(SOCKET_BASE, {
  transports: ["websocket"], // Ép dùng WebSocket ngay lập tức, bỏ qua quá trình Polling dài dòng
});
const AdminChatPage = () => {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const activeSessionRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const seenMessageIds = useRef(new Set());
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);
  const isFirstLoad = useRef(true);
  const currentUser = useStore((state) => state.user);
  const staffInfo = currentUser ||
    JSON.parse(localStorage.getItem("user")) || { id: 1, name: "Admin Hamoni" };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    activeSessionRef.current = activeSession;
  }, [activeSession]);

  // SỬA LẠI HOÀN TOÀN USEEFFECT NÀY
  useEffect(() => {
    if (messages.length > 0) {
      if (isFirstLoad.current) {
        // Nếu là lần đầu mở đoạn chat: Nhảy ngay lập tức xuống đáy
        scrollToBottom("auto");
        isFirstLoad.current = false;
      } else {
        // Nếu đang mở sẵn và có tin nhắn mới tới: Cuộn mượt mà
        scrollToBottom("smooth");
      }
    }
  }, [messages]);

  // 1. KẾT NỐI SOCKET VÀ LẤY DANH SÁCH PHIÊN CHAT
  useEffect(() => {
    socket.emit("join_staff_room");

    const fetchSessions = async () => {
      try {
        const response = await fetch(`${API_URL}/chats`);
        if (response.ok) {
          const data = await response.json();
          const withUnread = data.map((s) => ({
            ...s,
            unreadCount: s.unreadCount || 0,
          }));
          setSessions(withUnread);
        }
      } catch (error) {
        console.error("Lỗi khi tải danh sách chat:", error);
      }
    };

    fetchSessions();

    // KHI KHÁCH BẤM YÊU CẦU GẶP NHÂN VIÊN
    socket.on("customer_waiting", (data) => {
      const { maPhien, roomName, text } = data;

      // 1. Cập nhật danh sách cột trái
      setSessions((prev) => {
        const existing = prev.find((s) => s.maPhien === maPhien);
        if (existing) {
          return prev.map((s) =>
            s.maPhien === maPhien
              ? { ...s, status: "pending", lastMessage: text }
              : s,
          );
        }
        return [
          {
            maPhien,
            roomName,
            customerName: "Khách mới",
            status: "pending",
            lastMessage: text,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          },
          ...prev,
        ];
      });

      // 2. CẬP NHẬT TRỰC TIẾP KHUNG BÊN PHẢI (Sửa lỗi phải click lại mới hiện)
      setActiveSession((currentActive) => {
        if (currentActive && currentActive.maPhien === maPhien) {
          return { ...currentActive, status: "pending" };
        }
        return currentActive;
      });
    });

    // KHI CÓ TIN NHẮN BẤT KỲ QUA HỆ THỐNG
    socket.on("monitor_message", (data) => {
      // 1. Cập nhật danh sách cột trái
      setSessions((prev) => {
        let found = false;
        const updated = prev.map((s) => {
          if (s.maPhien === data.maPhien) {
            found = true;
            const isActive =
              activeSessionRef.current &&
              activeSessionRef.current.maPhien === data.maPhien;
            return {
              ...s,
              lastMessage: data.text,
              time: data.time,
              status: data.status || s.status,
              unreadCount: isActive ? 0 : (s.unreadCount || 0) + 1,
            };
          }
          return s;
        });
        if (!found) {
          return [
            {
              maPhien: data.maPhien,
              roomName: data.roomName || `GUEST_${data.maPhien}`,
              customerName: "Khách mới",
              status: data.status || "pending",
              lastMessage: data.text,
              time: data.time,
              unreadCount: 1,
            },
            ...prev,
          ];
        }
        return updated;
      });

      // 2. Cập nhật khung chat bên phải
      setActiveSession((currentActive) => {
        if (currentActive && currentActive.maPhien === data.maPhien) {
          // Chống đúp tin nhắn
          if (!data.id || !seenMessageIds.current.has(data.id)) {
            if (data.id) seenMessageIds.current.add(data.id);
            if (data.senderType) {
              setMessages((prev) => [...prev, data]);
            }
          }

          // ĐỒNG BỘ TRẠNG THÁI (Nếu server báo trạng thái mới thì đổi luôn)
          if (data.status && data.status !== currentActive.status) {
            return { ...currentActive, status: data.status };
          }

          // Nếu đang mở khung chat thì reset số tin nhắn chưa đọc
          setSessions((prev) =>
            prev.map((s) =>
              s.maPhien === data.maPhien ? { ...s, unreadCount: 0 } : s,
            ),
          );
        }
        return currentActive;
      });
    });

    return () => {
      socket.off("customer_waiting");
      socket.off("monitor_message");
    };
  }, []);

  // 2. KHI ADMIN CLICK VÀO 1 KHÁCH HÀNG -> CALL API LẤY CHI TIẾT TIN NHẮN
  const handleSelectSession = async (session) => {
    isFirstLoad.current = true;
    setActiveSession(session);
    setMessages([]);
    seenMessageIds.current.clear();
    setSessions((prev) =>
      prev.map((s) =>
        s.maPhien === session.maPhien ? { ...s, unreadCount: 0 } : s,
      ),
    );

    try {
      const response = await fetch(`${API_URL}/chats/${session.maPhien}`);
      if (response.ok) {
        const data = await response.json();
        const visible = Array.isArray(data) ? data.slice(-50) : [];
        setMessages(visible);
        visible.forEach((m) => {
          if (m.id) seenMessageIds.current.add(m.id);
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải chi tiết tin nhắn:", error);
    }
  };
  // 3. ADMIN BẤM "TIẾP NHẬN HỖ TRỢ"
  // 3. ADMIN BẤM "TIẾP NHẬN HỖ TRỢ"
  const handleTakeover = () => {
    const updatedSession = { ...activeSession, status: "human" };
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) =>
        s.maPhien === activeSession.maPhien ? updatedSession : s,
      ),
    );

    const msgId = Date.now();
    seenMessageIds.current.add(msgId);

    const welcomeText = `Chào bạn, mình là ${staffInfo.name} từ đội ngũ chăm sóc khách hàng. Mình đã tiếp nhận cuộc trò chuyện, mình có thể hỗ trợ gì cho bạn ạ?`;

    // SỬA DÒNG NÀY: Ép định dạng en-US và hour12: true
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        senderType: "STAFF",
        text: welcomeText,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      },
    ]);

    socket.emit("staff_send_message", {
      id: msgId,
      maPhien: activeSession.maPhien,
      maNhanVien: staffInfo.id,
      roomName: activeSession.roomName,
      text: welcomeText,
    });
  };

  // 4. ADMIN GỬI TIN NHẮN
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeSession) return;

    const newMsg = {
      id: Date.now(),
      senderType: "STAFF",
      text: inputText,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (newMsg.id) seenMessageIds.current.add(newMsg.id);
    setInputText("");

    socket.emit("staff_send_message", {
      id: newMsg.id,
      maPhien: activeSession.maPhien,
      maNhanVien: staffInfo.id,
      roomName: activeSession.roomName,
      text: newMsg.text,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });
  };

  // 5. ADMIN KẾT THÚC CUỘC TRÒ CHUYỆN
  const handleEndChat = () => {
    if (!activeSession) return;

    const updatedSession = { ...activeSession, status: "bot" };
    setActiveSession(updatedSession);
    setSessions((prev) =>
      prev.map((s) =>
        s.maPhien === activeSession.maPhien ? updatedSession : s,
      ),
    );

    socket.emit("end_chat", {
      maPhien: activeSession.maPhien,
      roomName: activeSession.roomName,
    });
  };

  // CHỈNH SỬA LẠI BADGE: Thêm shrink-0, rút gọn chữ để luôn đồng đều
  const getStatusBadge = (status) => {
    const baseClass =
      "flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap";
    switch (status) {
      case "pending":
        return (
          <span className={`${baseClass} text-rose-600 bg-rose-100`}>
            <AlertCircle size={10} className="animate-pulse" /> Đang chờ
          </span>
        );
      case "human":
        return (
          <span className={`${baseClass} text-emerald-600 bg-emerald-100`}>
            <UserCog size={10} /> Nhân viên
          </span>
        );
      case "bot":
        return (
          <span className={`${baseClass} text-indigo-600 bg-indigo-100`}>
            <Bot size={10} /> AI
          </span>
        );
      case "closed":
        return (
          <span className={`${baseClass} text-slate-500 bg-slate-100`}>
            <CheckCircle size={10} /> Đã xong
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] p-6 font-sans text-slate-800">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex h-full overflow-hidden">
        {/* CỘT TRÁI: DANH SÁCH CHAT ĐÃ ĐƯỢC NÂNG CẤP UI */}
        <div className="w-[340px] shrink-0 border-r border-slate-200 flex flex-col bg-slate-50/50">
          <div className="p-4 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-bold m-0 mb-3 text-slate-800">
              Quản lý Inbox
            </h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm kiếm khách hàng..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-rose-200 outline-none transition-all"
              />
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={16}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-center p-6 text-sm text-slate-400">
                Không có đoạn chat nào trong cơ sở dữ liệu.
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.maPhien}
                  onClick={() => handleSelectSession(session)}
                  className={`p-4 border-b border-slate-100 cursor-pointer transition-all flex gap-3 items-center ${activeSession?.maPhien === session.maPhien ? "bg-rose-50 border-l-4 border-l-rose-500" : "hover:bg-white border-l-4 border-l-transparent"}`}
                >
                  {/* Avatar Khách Hàng */}
                  <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br from-slate-300 to-slate-400 shadow-sm relative">
                    {session.customerName.charAt(0).toUpperCase()}
                    {/* Chấm Online giả lập cho sinh động */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>

                  {/* Nội dung List Item */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-sm text-slate-800 m-0 truncate pr-2">
                        {session.customerName}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {session.unreadCount > 0 && (
                          <span className="text-[10px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none shadow-sm">
                            {session.unreadCount}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          {session.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-xs text-slate-500 m-0 truncate flex-1 leading-relaxed">
                        {session.lastMessage}
                      </p>
                      {/* Gọi hàm Badge mới, sẽ không bao giờ bị méo */}
                      {getStatusBadge(session.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT CHAT */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          {activeSession ? (
            <>
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-300 to-slate-400 text-white rounded-full flex items-center justify-center font-bold shadow-sm">
                    {activeSession.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold text-base m-0 text-slate-800">
                      {activeSession.customerName}
                    </h2>
                    <p className="text-xs text-slate-500 m-0 flex items-center gap-1 mt-0.5">
                      Phòng: {activeSession.roomName} •{" "}
                      {getStatusBadge(activeSession.status)}
                    </p>
                  </div>
                </div>

                <div>
                  {activeSession.status === "pending" && (
                    <button
                      onClick={handleTakeover}
                      className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-md shadow-rose-500/20 animate-bounce"
                    >
                      Tiếp nhận hỗ trợ ngay
                    </button>
                  )}
                  {activeSession.status === "human" && (
                    <button
                      onClick={handleEndChat}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Kết thúc hội thoại
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-5 custom-scrollbar">
                {activeSession.status === "bot" && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-600 text-center flex items-center justify-center gap-2 mb-4 mx-auto max-w-md shadow-sm">
                    <Bot size={14} /> Bạn đang ở chế độ xem. AI đang tự động tư
                    vấn cho khách hàng này.
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderType === "USER" ? "justify-start" : "justify-end"}`}
                  >
                    {msg.senderType === "USER" && (
                      <div className="w-8 h-8 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mr-3 mt-1 shrink-0">
                        <User size={14} />
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] p-3 rounded-2xl text-[13px] shadow-sm ${
                        msg.senderType === "USER"
                          ? "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                          : msg.senderType === "BOT"
                            ? "bg-indigo-50 border border-indigo-100 text-slate-800 rounded-tr-sm"
                            : "bg-rose-500 text-white rounded-tr-sm"
                      }`}
                    >
                      {msg.senderType !== "USER" && (
                        <div
                          className={`text-[10px] font-bold mb-1 ${msg.senderType === "BOT" ? "text-indigo-600" : "text-rose-100"}`}
                        >
                          {msg.senderType === "BOT"
                            ? "Hamoni AI"
                            : staffInfo.name}
                        </div>
                      )}
                      <div className="leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </div>
                      <div
                        className={`text-[10px] mt-1.5 text-right ${msg.senderType === "STAFF" ? "text-rose-200" : "text-slate-400"}`}
                      >
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-white border-t border-slate-200">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      activeSession.status === "human"
                        ? "Nhập tin nhắn hỗ trợ khách hàng..."
                        : "Hãy bấm 'Tiếp nhận' để bắt đầu chat"
                    }
                    disabled={activeSession.status !== "human"}
                    className="flex-1 bg-slate-100 text-sm rounded-xl py-3.5 px-4 outline-none focus:bg-white focus:ring-2 focus:ring-rose-200 border border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                  <button
                    type="submit"
                    disabled={
                      !inputText.trim() || activeSession.status !== "human"
                    }
                    className="w-12 h-12 bg-rose-500 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 active:scale-95"
                  >
                    <Send size={18} className="ml-1" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                <MessageCircle size={40} className="text-slate-300" />
              </div>
              <h3 className="font-bold text-xl text-slate-600 m-0 mb-2">
                Hộp thư hỗ trợ Hamoni
              </h3>
              <p className="text-sm">
                Chọn một cuộc hội thoại bên trái để bắt đầu hỗ trợ khách hàng
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageCircle = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path>
  </svg>
);

export default AdminChatPage;
