import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
// 👉 THÊM IMPORT useNavigate TỪ react-router-dom
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  UserCog,
  MoreHorizontal,
  CheckCircle,
} from "lucide-react";
import io from "socket.io-client";
import { useStore } from "../../store/useStore";

// Kết nối đến Backend
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
});

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isHandoverToHuman, setIsHandoverToHuman] = useState(false);
  const [messages, setMessages] = useState([]);

  // Lưu trữ thông tin phòng chat
  const chatSession = useRef({ maPhien: null, roomName: "" });

  const chatWindowRef = useRef(null);
  const messagesEndRef = useRef(null);
  const wasOpenRef = useRef(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentUser = useStore((state) => state.user);
  const currentUserId =
    currentUser?.id || currentUser?.MaND || currentUser?.maND || null;

  // 👉 THÊM KHỞI TẠO navigate ĐỂ CHUYỂN TRANG
  const navigate = useNavigate();

  // 1. Tự động cuộn xuống
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };
  useLayoutEffect(() => {
    const shouldJumpImmediately = isOpen && !wasOpenRef.current;
    scrollToBottom(shouldJumpImmediately ? "auto" : "smooth");
    wasOpenRef.current = isOpen;
  }, [messages, isAiThinking, isOpen]);

  // 2. Click ra ngoài để đóng
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 3. LOGIC KẾT NỐI SOCKET VÀ LẤY LỊCH SỬ
  useEffect(() => {
    chatSession.current = { maPhien: null, roomName: "" };
    Promise.resolve().then(() => {
      setMessages([]);
      setIsHandoverToHuman(false);
    });

    let sessionID = localStorage.getItem("guest_session");
    if (!sessionID) {
      sessionID = "GUEST_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("guest_session", sessionID);
    }

    const maND = currentUserId;

    // Gửi tín hiệu bắt đầu
    socket.emit("join_chat", { maND, sessionID });

    // Nhận mã phòng, lịch sử VÀ TRẠNG THÁI HIỆN TẠI
    socket.on("chat_ready", ({ maPhien, roomName, history, status }) => {
      chatSession.current = { maPhien, roomName };

      if (status === "human" || status === "pending") {
        setIsHandoverToHuman(true);
      } else {
        setIsHandoverToHuman(false);
      }

      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([
          {
            id: Date.now(),
            senderType: "AI",
            text: "Chào bạn! Mình là trợ lý AI của Hamoni. Mình có thể giúp gì cho việc tìm kiếm mỹ phẩm của bạn hôm nay?",
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          },
        ]);
      }
    });

    // Nhận tin nhắn mới
    socket.on("receive_message", (incomingMsg) => {
      setMessages((prev) => [...prev, incomingMsg]);
      setIsAiThinking(false);
      if (incomingMsg.senderType === "STAFF") {
        setIsHandoverToHuman(true);
      }
    });

    // Lắng nghe sự kiện kết thúc từ Admin
    socket.on("chat_closed_by_admin", () => {
      setIsHandoverToHuman(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          senderType: "AI",
          text: "Nhân viên đã kết thúc phiên hỗ trợ. Mình là Hamoni AI đã quay trở lại, bạn có cần giúp gì thêm không ạ? ✨",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        },
      ]);
    });

    return () => {
      socket.off("chat_ready");
      socket.off("receive_message");
      socket.off("chat_closed_by_admin");
    };
  }, [currentUserId]);

  // 4. Kéo thả
  const handleMouseDown = (e) => {
    if (isOpen) return;
    setIsDragging(true);
    setHasDragged(false);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };
  const handleMouseMove = useCallback(
    (e) => {
      if (isDragging) {
        setHasDragged(true);
        setPosition({
          x: e.clientX - dragStartPos.current.x,
          y: e.clientY - dragStartPos.current.y,
        });
      }
    },
    [isDragging],
  );
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleTouchStart = (e) => {
    if (isOpen) return;
    setIsDragging(true);
    setHasDragged(false);
    dragStartPos.current = {
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    };
  };
  const handleTouchMove = useCallback(
    (e) => {
      if (isDragging) {
        setHasDragged(true);
        setPosition({
          x: e.touches[0].clientX - dragStartPos.current.x,
          y: e.touches[0].clientY - dragStartPos.current.y,
        });
      }
    },
    [isDragging],
  );
  const handleTouchEnd = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  const handleClickBubble = () => {
    if (!hasDragged) setIsOpen(true);
  };

  // 5. Gửi tin nhắn
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const timeNow = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const newUserMsg = {
      id: Date.now(),
      senderType: "USER",
      text: inputText,
      time: timeNow,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText("");

    if (!isHandoverToHuman) {
      setIsAiThinking(true);
    }

    socket.emit("send_message", {
      maPhien: chatSession.current.maPhien,
      roomName: chatSession.current.roomName,
      text: newUserMsg.text,
      isHandoverToHuman: isHandoverToHuman,
    });
  };

  // Xử lý nút bấm yêu cầu gặp nhân viên
  const handleRequestHuman = () => {
    setIsHandoverToHuman(true);
    socket.emit("send_message", {
      maPhien: chatSession.current.maPhien,
      roomName: chatSession.current.roomName,
      text: "Tôi muốn gặp nhân viên tư vấn.",
      isHandoverToHuman: true,
    });
  };

  // 👉 THÊM HÀM RENDER ĐỂ NHẬN DIỆN VÀ BIẾN TEXT THÀNH NÚT BẤM (CÁCH 2)
  const renderMessageWithLink = (content) => {
    if (!content) return null;

    // Tách chuỗi dựa trên cú pháp [XEM_NGAY|MaSP]
    const parts = content.split(/(\[XEM_NGAY\|[^\]]+\])/g);

    return parts.map((part, index) => {
      if (part.startsWith("[XEM_NGAY|")) {
        // Trích xuất mã sản phẩm từ chuỗi
        const productId = part.replace("[XEM_NGAY|", "").replace("]", "");

        return (
          <button
            key={index}
            onClick={() => navigate(`/product/${productId}`)}
            className="ml-1 inline-flex items-center text-[12px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Xem ngay ➔
          </button>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div
      className="fixed z-[100] font-sans flex flex-col items-end"
      style={{
        bottom: "30px",
        right: "30px",
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isDragging ? "none" : "transform 0.1s ease-out",
      }}
    >
      {isOpen && (
        <div
          ref={chatWindowRef}
          className="w-[360px] h-[540px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden mb-4 animate-fade-in-up relative"
        >
          <div
            className={`p-4 text-white flex justify-between items-center shadow-sm ${isHandoverToHuman ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gradient-to-r from-rose-500 to-rose-600"}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                {isHandoverToHuman ? <UserCog size={24} /> : <Bot size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-sm m-0">Hamoni Support</h3>
                <p className="text-xs text-white/90 m-0 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {isHandoverToHuman ? "Nhân viên CSKH" : "AI Assistant"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors outline-none"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === "USER" ? "justify-end" : "justify-start"}`}
              >
                {msg.senderType !== "USER" && (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1 ${msg.senderType === "AI" || msg.senderType === "BOT" ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"}`}
                  >
                    {msg.senderType === "AI" || msg.senderType === "BOT" ? (
                      <Bot size={16} />
                    ) : (
                      <UserCog size={16} />
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[75%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.senderType === "USER"
                      ? "bg-rose-500 text-white rounded-tr-sm"
                      : msg.senderType === "AI" || msg.senderType === "BOT"
                        ? "bg-white border border-slate-100 text-slate-700 rounded-tl-sm"
                        : "bg-emerald-50 text-slate-800 border border-emerald-100 rounded-tl-sm"
                  }`}
                >
                  {msg.senderType !== "USER" && (
                    <div
                      className={`text-[10px] font-bold mb-1 ${msg.senderType === "AI" || msg.senderType === "BOT" ? "text-indigo-600" : "text-emerald-600"}`}
                    >
                      {msg.senderType === "AI" || msg.senderType === "BOT"
                        ? "Hamoni AI"
                        : "Nhân viên tư vấn"}
                    </div>
                  )}

                  {/* 👉 THAY THẾ {msg.text} BẰNG HÀM RENDER CÓ NÚT */}
                  <div className="leading-relaxed whitespace-pre-wrap">
                    {renderMessageWithLink(msg.text)}
                  </div>

                  <div
                    className={`text-[10px] mt-1 text-right ${msg.senderType === "USER" ? "text-rose-200" : "text-slate-400"}`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {isAiThinking && (
              <div className="flex justify-start">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${isHandoverToHuman ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-indigo-600"}`}
                >
                  {isHandoverToHuman ? (
                    <UserCog size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-sm flex items-center gap-1 text-slate-400">
                  <MoreHorizontal size={20} className="animate-pulse" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-slate-100">
            <div className="mb-2 text-center">
              {!isHandoverToHuman ? (
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  className="text-[11px] text-slate-400 hover:text-rose-500 underline transition-colors outline-none"
                >
                  Chuyển sang gặp nhân viên CSKH
                </button>
              ) : (
                <span className="text-[11px] font-medium text-emerald-500 flex items-center justify-center gap-1">
                  <CheckCircle size={12} /> Đang chờ nhân viên phản hồi...
                </span>
              )}
            </div>
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-slate-100 text-sm rounded-full py-2.5 px-4 outline-none focus:ring-2 focus:ring-rose-200"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-rose-600 transition-colors outline-none"
              >
                <Send size={16} className="ml-1" />
              </button>
            </form>
          </div>
        </div>
      )}

      {!isOpen && (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={handleClickBubble}
          className="relative w-16 h-16 bg-gradient-to-tr from-rose-500 to-rose-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(225,29,72,0.4)] cursor-grab active:cursor-grabbing transition-transform hover:scale-105"
          style={{ touchAction: "none" }}
        >
          <MessageCircle size={32} strokeWidth={2.5} />
          <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-bounce"></span>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;
