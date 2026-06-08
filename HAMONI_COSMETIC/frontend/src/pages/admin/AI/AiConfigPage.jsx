import React, { useEffect, useState } from "react";
import {
  Bot,
  Save,
  FileText,
  UploadCloud,
  FileType,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import aiConfigApi from "../../../services/aiConfigApi";

const AiConfigPage = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // 👉 SỬA CHỖ 1: Để trống state khởi tạo hoàn toàn để ưu tiên Placeholder
  const [config, setConfig] = useState({
    basePrompt: "",
    trainingText: "",
  });

  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await aiConfigApi.getConfig();
        const backendConfig = response?.config || response;

        if (backendConfig) {
          setConfig({
            // 👉 SỬA CHỖ 2: Dùng toán tử ?? "" để tôn trọng chuỗi rỗng từ DB
            basePrompt: backendConfig.promptCoBan ?? "",
            trainingText: backendConfig.duLieuHuanLuyen ?? "",
          });
        }
      } catch {
        setLoadError("Không tải được cấu hình AI từ máy chủ.");
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
    // Chỉ tải một lần khi vào trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Xử lý chọn file
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Xử lý lưu cấu hình (Sẽ gọi API ở đây)
  const handleSaveConfig = async () => {
    setIsSaving(true);
    setLoadError("");

    try {
      const formData = new FormData();
      formData.append("promptCoBan", config.basePrompt);

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await aiConfigApi.train(formData);

      if (response?.config) {
        setConfig({
          // 👉 SỬA CHỖ 3: Dùng toán tử ?? ""
          basePrompt: response.config.promptCoBan ?? "",
          trainingText: response.config.duLieuHuanLuyen ?? "",
        });
      }

      setSelectedFile(null);
      toast.success(
        'Cập nhật "Não bộ" cho Hamoni AI thành công! AI đã ghi nhớ tài liệu mới.',
      );
    } catch {
      setLoadError(
        "Không lưu được cấu hình AI. Vui lòng kiểm tra backend và thử lại.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans text-slate-800">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 m-0 text-slate-900">
            <Bot className="text-rose-500" size={28} />
            Huấn luyện Hamoni AI
          </h1>
          {loadError && (
            <p className="text-sm text-rose-600 mt-2">{loadError}</p>
          )}
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={isSaving || isLoading}
          className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
          {isSaving ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {isLoading
            ? "Đang tải..."
            : isSaving
              ? "Đang đồng bộ..."
              : "Lưu cấu hình"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI: NHẬP LIỆU & UPLOAD */}
        <div className="lg:col-span-5 space-y-6">
          {/* Block 1: Định hình tính cách (Prompt) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UserCog className="text-indigo-500" size={20} />
              <h2 className="text-base font-bold m-0">Định hình tính cách</h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Chỉ định cách AI xưng hô, quy tắc trả lời và thái độ phục vụ khách
              hàng.
            </p>
            <textarea
              className="w-full h-48 p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-100 focus:border-rose-300 outline-none transition-all leading-relaxed"
              value={config.basePrompt}
              onChange={(e) =>
                setConfig({ ...config, basePrompt: e.target.value })
              }
              placeholder='Ví dụ: Bạn là "Hamoni AI" - Chuyên viên tư vấn chăm sóc sắc đẹp ảo...'
            />
          </div>

          {/* Block 2: Upload Tài liệu */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-500" size={20} />
                <h2 className="text-base font-bold m-0">
                  Nạp tài liệu kiến thức
                </h2>
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Tải lên danh sách sản phẩm, bảng giá, hoặc chính sách đổi trả. AI
              sẽ đọc và dùng dữ liệu này để tư vấn khách.
            </p>

            {/* Vùng Upload Kéo Thả */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-rose-400 transition-colors cursor-pointer relative group">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2 pointer-events-none">
                <UploadCloud
                  className="text-slate-400 group-hover:text-rose-500 transition-colors"
                  size={40}
                />
                <p className="text-sm font-medium text-slate-700 m-0">
                  Kéo thả file hoặc Click để chọn
                </p>
                <p className="text-xs text-slate-400 m-0">
                  Hỗ trợ định dạng: PDF, DOC, DOCX, XLS, XLSX (Tối đa 5MB)
                </p>
              </div>
            </div>

            {/* Hiển thị file đang chọn */}
            {selectedFile && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileType className="text-emerald-500" size={24} />
                  <div>
                    <p className="text-sm font-semibold text-slate-700 m-0 line-clamp-1">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-emerald-600 m-0">
                      Sẵn sàng tải lên
                    </p>
                  </div>
                </div>
                <CheckCircle className="text-emerald-500" size={20} />
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: PREVIEW DỮ LIỆU ĐÃ BÓC TÁCH */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 h-full flex flex-col overflow-hidden">
            <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200">
                <Bot size={18} />
                <span className="text-sm font-semibold">Cửa sổ ngữ cảnh</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                <AlertCircle size={14} />
                Trạng thái đọc text
              </div>
            </div>

            <div className="p-5 flex-1 relative group">
              {/* Nút copy (trang trí) */}
              <button className="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                <FileText size={16} />
              </button>

              <textarea
                readOnly
                className="w-full h-full min-h-125 bg-transparent text-slate-300 text-[13px] font-mono leading-relaxed outline-none resize-none custom-scrollbar"
                value={`=== SYSTEM PROMPT ===\n${config.basePrompt || "[Trống - Đang sử dụng cấu hình AI mặc định của hệ thống]"}\n\n\n=== TÀI LIỆU CỬA HÀNG (KNOWLEDGE BASE) ===\n${selectedFile ? `File đang chọn: ${selectedFile.name}\n\n` : ""}${config.trainingText || "[Trống - Chưa có tài liệu nào được nạp]"}`}
              />
            </div>

            <div className="bg-slate-800 p-3 text-xs text-slate-400 border-t border-slate-700 flex justify-between">
              {/* <span>Mô phỏng dữ liệu gửi tới Gemini API</span> */}
              <span>Số lượng Token dự kiến: ~1,240</span>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </div>
  );
};

// Cần component giả cho Icon UserCog do import lucide-react thiếu
const UserCog = ({ size, className }) => (
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
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" y1="8" x2="19" y2="14"></line>
    <line x1="22" y1="11" x2="16" y2="11"></line>
  </svg>
);

export default AiConfigPage;
