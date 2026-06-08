const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require("../config/db");

// Khởi tạo Gemini AI - thử cả hai cách khởi tạo và log rõ ràng
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    try {
      // Một số phiên bản/ứng dụng khởi tạo bằng object
      genAI = new GoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
      console.log('[Gemini] Khởi tạo GoogleGenerativeAI bằng object { apiKey }');
    } catch (errObj) {
      try {
        // Thử khởi tạo bằng chuỗi (cách cũ/khác)
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('[Gemini] Khởi tạo GoogleGenerativeAI bằng chuỗi API key');
      } catch (errStr) {
        console.error('[Gemini] Không thể khởi tạo GoogleGenerativeAI với API key:', errObj || errStr);
        genAI = null;
      }
    }
  } else {
    console.warn('[Gemini] Biến môi trường GEMINI_API_KEY chưa được đặt.');
  }
} catch (err) {
  console.error('[Gemini] Lỗi khi kiểm tra/khởi tạo GoogleGenerativeAI:', err);
  genAI = null;
}

const DEFAULT_MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter(Boolean);

const FALLBACK_AI_MESSAGE =
  "Mình đang gặp chút khó khăn khi kết nối AI. Bạn thử nhắn lại sau ít phút nhé.";

const truncateText = (text, maxLength) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[...đã rút gọn để tối ưu truy vấn AI...]`;
};

const normalizeText = (text) =>
  (text || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const extractSearchTerms = (text) => {
  const rawTerms = normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3);

  return [...new Set(rawTerms)].slice(0, 5);
};

const buildLocalAssistantReply = (text, productSnippet) => {
  const normalized = normalizeText(text);

  if (/^(hi|hello|chao|xin chao|hey)\b/.test(normalized)) {
    return "Chào bạn, mình là Hamoni AI. Bạn đang cần tư vấn sản phẩm nào: dưỡng da, chống nắng, son môi hay chăm sóc cơ thể?";
  }

  if (/(gia|bao nhieu|price|sản phẩm|san pham|kem|serum|son|chong nang|chống nắng)/.test(normalized)) {
    if (productSnippet) {
      return `Mình tạm thời chưa gọi được AI đám mây, nhưng mình có thể gợi ý nhanh theo dữ liệu cửa hàng:\n\n${productSnippet}\n\nBạn cho mình biết thêm loại da hoặc mức giá để mình lọc tiếp nhé.`;
    }

    return "Mình chưa có đủ dữ liệu sản phẩm liên quan ngay lúc này. Bạn cho mình biết tên sản phẩm, loại da hoặc khoảng giá để mình tư vấn sát hơn nhé.";
  }

  return "Mình đang hỗ trợ tạm thời. Bạn mô tả rõ hơn nhu cầu, ví dụ loại da, vấn đề da hoặc tên sản phẩm, để mình tư vấn đúng hơn nhé.";
};

const buildProductLinkMap = (products) => {
  return (products || [])
    .filter((product) => product && product.id && product.name)
    .map((product) => ({
      ...product,
      normalizedName: normalizeText(product.name),
    }))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length);
};

const injectProductLinks = (text, products) => {
  if (!text || !Array.isArray(products) || products.length === 0) {
    return text;
  }

  let output = text;
  products.forEach((product) => {
    const productName = product.name?.trim();
    if (!productName) return;

    const linkToken = `[XEM_NGAY|${product.id}]`;
    const alreadyLinked = output.includes(linkToken);
    if (alreadyLinked) return;

    const pattern = new RegExp(`\\b(${productName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`, "i");
    if (pattern.test(output)) {
      output = output.replace(pattern, `${productName} ${linkToken}`);
    }
  });

  return output;
};

const appendSuggestedProducts = (text, products) => {
  if (!text || !Array.isArray(products) || products.length === 0) {
    return text;
  }

  if (/\[XEM_NGAY\|\d+\]/.test(text)) {
    return text;
  }

  const lines = products
    .slice(0, 3)
    .map((product) => `- ${product.name} [XEM_NGAY|${product.id}]`)
    .join("\n");

  return `${text}\n\nSản phẩm gợi ý phù hợp:\n${lines}`;
};

const buildModelCandidates = () => {
  const uniqueModels = [];
  DEFAULT_MODEL_CANDIDATES.forEach((modelName) => {
    if (modelName && !uniqueModels.includes(modelName)) {
      uniqueModels.push(modelName);
    }
  });
  return uniqueModels;
};

const generateAiReply = async (prompt, systemInstruction) => {
  if (!genAI) {
    throw new Error("Thiếu GEMINI_API_KEY trong biến môi trường.");
  }

  let lastError = null;
  for (const modelName of buildModelCandidates()) {
    try {
      console.log(`[Gemini] Thử gọi model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      });
      const result = await model.generateContent(prompt);
      console.debug(`[Gemini] Raw result for ${modelName}:`, result);
      // Một số SDK trả về cấu trúc khác, cố gắng extract nhiều cách
      let responseText = null;
      try {
        if (typeof result?.response?.text === 'function') {
          responseText = result.response.text();
        } else if (typeof result?.response === 'string') {
          responseText = result.response;
        } else if (Array.isArray(result?.candidates) && result.candidates[0]) {
          responseText = result.candidates[0].content?.text || result.candidates[0].text;
        }
      } catch (extractErr) {
        console.error('[Gemini] Lỗi khi extract text từ result:', extractErr);
      }
      console.log(`[Gemini] Extracted response for ${modelName}:`, responseText ? responseText.slice(0,200) : '<empty>');

      if (responseText && responseText.trim()) {
        return responseText.trim();
      }

      throw new Error(`Gemini trả về phản hồi rỗng với model ${modelName}.`);
    } catch (error) {
      lastError = error;
      console.error(`Lỗi khi gọi Gemini model ${modelName}:`, error && error.message ? error.message : error);
    }
  }

  throw lastError || new Error("Không thể tạo phản hồi AI.");
};

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log(`🔌 Kết nối mới: ${socket.id}`);

    socket.on("join_notification_room", (userId) => {
      const recipientId = Number(userId);
      if (Number.isInteger(recipientId) && recipientId > 0) {
        socket.join(`NOTIF_${recipientId}`);
      }
    });

    socket.on("join_staff_room", () => {
      socket.join("STAFF_ROOM");
      console.log(`Nhân viên đã tham gia trực chat.`);
    });

    // 1. KHÁCH HÀNG BẮT ĐẦU HOẶC TIẾP TỤC CHAT
    socket.on("join_chat", async (data) => {
      const { maND, sessionID } = data;
      const roomName = maND ? `CUST_${maND}` : `GUEST_${sessionID}`;
      socket.join(roomName);

      try {
        let rows = [];

        if (maND) {
          [rows] = await db.query(
            `SELECT MaPhien, TrangThai FROM PhienChat 
             WHERE MaND = ? AND TrangThai != 'closed' 
             ORDER BY MaPhien DESC LIMIT 1`,
            [maND],
          );
        } else {
          [rows] = await db.query(
            `SELECT MaPhien, TrangThai FROM PhienChat 
             WHERE SessionID = ? AND TrangThai != 'closed' 
             ORDER BY MaPhien DESC LIMIT 1`,
            [sessionID || null],
          );
        }

        let maPhien;
        let currentStatus = "bot";
        if (rows.length === 0 || (!maND && rows[0].TrangThai !== "bot")) {
          const [result] = await db.query(
            `INSERT INTO PhienChat (MaND, SessionID, TrangThai) VALUES (?, ?, 'bot')`,
            [maND || null, sessionID || null],
          );
          maPhien = result.insertId;
        } else {
          maPhien = rows[0].MaPhien;
          currentStatus = rows[0].TrangThai;
        }

        const [historyRows] = await db.query(
          `SELECT MaTinNhan, VaiTro, NoiDung, NgayGui 
           FROM ChiTietChat WHERE MaPhien = ? ORDER BY NgayGui ASC`,
          [maPhien],
        );

        const chatHistory = historyRows.map((msg) => ({
          id: msg.MaTinNhan,
          senderType:
            msg.VaiTro === "CUST"
              ? "USER"
              : msg.VaiTro === "BOT"
                ? "AI"
                : "ADMIN",
          text: msg.NoiDung,
          time: new Date(msg.NgayGui).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        }));

        socket.emit("chat_ready", {
          maPhien,
          roomName,
          history: chatHistory,
          status: currentStatus,
        });
      } catch (error) {
        console.error("Lỗi khởi tạo phiên chat:", error);
      }
    });

    // 2. XỬ LÝ KHI KHÁCH HÀNG GỬI TIN NHẮN
    socket.on("send_message", async (data) => {
      const { maPhien, roomName, text, isHandoverToHuman } = data;

      try {
        console.log("[ChatSocket] send_message received:", {
          maPhien,
          roomName,
          textPreview: typeof text === 'string' ? text.slice(0, 120) : text,
          isHandoverToHuman,
        });

        await db.query(
          `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'CUST', ?)`,
          [maPhien, text],
        );

        const custMessageId = Date.now();
        const messageTime = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        if (isHandoverToHuman) {
          try {
            const [current] = await db.query(
              `SELECT TrangThai FROM PhienChat WHERE MaPhien = ?`,
              [maPhien],
            );
            const currentStatus =
              current && current[0] ? current[0].TrangThai : null;

            if (currentStatus !== "human") {
              await db.query(
                `UPDATE PhienChat SET TrangThai = 'pending' WHERE MaPhien = ?`,
                [maPhien],
              );
              io.to("STAFF_ROOM").emit("customer_waiting", {
                maPhien,
                roomName,
                text,
                time: messageTime,
              });
              io.to("STAFF_ROOM").emit("monitor_message", {
                id: custMessageId,
                senderType: "USER",
                text,
                maPhien,
                time: messageTime,
                status: "pending",
              });
            } else {
              io.to("STAFF_ROOM").emit("monitor_message", {
                id: custMessageId,
                senderType: "USER",
                text,
                maPhien,
                time: messageTime,
                status: "human",
              });
            }
          } catch (err) {
            console.error("Lỗi khi kiểm tra trạng thái Handover:", err);
          }
          return;
        }

        io.to("STAFF_ROOM").emit("monitor_message", {
          id: custMessageId,
          senderType: "USER",
          text,
          maPhien,
          time: messageTime,
          status: "bot",
        });

        const [phien] = await db.query(
          `SELECT TrangThai FROM PhienChat WHERE MaPhien = ?`,
          [maPhien],
        );

        console.log("[ChatSocket] Current session status:", phien?.[0]?.TrangThai, "for MaPhien=", maPhien);

        if (phien[0].TrangThai === "bot") {
          // =========================================================
          // TÍCH HỢP RAG: LẤY CẤU HÌNH AI ĐỘNG TỪ DATABASE
          // =========================================================
          let promptCoBan =
            "Bạn là trợ lý AI của Hamoni Cosmetic. Hãy trả lời ngắn gọn, lịch sự.";
          let duLieuHuanLuyen = "";

          try {
            const [configRows] = await db.query(
              "SELECT PromptCoBan, DuLieuHuanLuyen FROM CauHinhAI LIMIT 1",
            );
            if (configRows.length > 0) {
              promptCoBan = configRows[0].PromptCoBan || promptCoBan;
              duLieuHuanLuyen = configRows[0].DuLieuHuanLuyen || "";
            }
          } catch (err) {
            console.error("Lỗi lấy cấu hình AI, dùng prompt mặc định.");
          }

          // 👉 Chỉ lấy các sản phẩm liên quan để giữ prompt nhỏ và ổn định
          let dsSanPham = "";
          let suggestedProducts = [];
          try {
            const searchTerms = extractSearchTerms(text);
            const queryBase = `
              SELECT sp.MaSP, sp.TenSP, bt.MaBienThe, bt.TenBienThe, bt.Gia
              FROM SanPham sp
              JOIN BienTheSanPham bt ON sp.MaSP = bt.MaSP
            `;

            let rows = [];
            if (searchTerms.length > 0) {
              const conditions = searchTerms
                .map(
                  () =>
                    `(sp.TenSP LIKE ? OR bt.TenBienThe LIKE ? OR sp.LoaiDaPhuHop LIKE ?)`
                )
                .join(" OR ");
              const params = searchTerms.flatMap((term) => [
                `%${term}%`,
                `%${term}%`,
                `%${term}%`,
              ]);
              [rows] = await db.query(`${queryBase} WHERE ${conditions} LIMIT 8`, params);
            } else {
              [rows] = await db.query(`${queryBase} LIMIT 5`);
            }

            if (rows.length > 0) {
              // Gom nhóm các biến thể theo từng sản phẩm để AI dễ đọc
              const groupedProducts = rows.reduce((acc, current) => {
                if (!acc[current.MaSP]) {
                  acc[current.MaSP] = {
                    id: current.MaSP,
                    name: current.TenSP,
                    variants: [],
                  };
                }
                acc[current.MaSP].variants.push({
                  variantId: current.MaBienThe,
                  variantName: current.TenBienThe,
                  price: current.Gia,
                });
                return acc;
              }, {});

              suggestedProducts = buildProductLinkMap(
                Object.values(groupedProducts).slice(0, 8),
              );

              // Chuyển đổi object gom nhóm thành chuỗi văn bản cho Prompt
              dsSanPham = Object.values(groupedProducts)
                .slice(0, 20)
                .map((p) => {
                  const variantText = p.variants
                    .map(
                      (v) =>
                        `   + Phân loại: ${v.variantName} - Giá: ${Number(v.price).toLocaleString("vi-VN")}đ`,
                    )
                    .join("\n");
                  return `- ${p.name} (Mã SP để tạo link: ${p.id})\n${variantText}`;
                })
                .join("\n\n");
            }
          } catch (error) {
            console.error("Lỗi lấy danh sách sản phẩm và biến thể:", error);
          }

          // 👉 HÀNG RÀO BẢO VỆ PROMPT ĐƯỢC THIẾT KẾ LẠI
          const dynamicInstruction = `
${promptCoBan}

**QUY TẮC BẮT BUỘC TẠO LINK MUA HÀNG:**
Khi bạn giới thiệu bất kỳ sản phẩm nào có tên trong danh sách dưới đây, bạn **PHẢI** chèn thêm cú pháp "[XEM_NGAY|Mã_Sản_Phẩm]" ngay sau tên sản phẩm đó.
Ví dụ: "Bạn có thể tham khảo dòng Kem Chống Nắng HAMONI [XEM_NGAY|1] hiện có các phân loại dung tích phù hợp với da của bạn."
*Lưu ý:* Sử dụng **CHÍNH XÁC số Mã SP** (Ví dụ: 1, 2, 3...) được cung cấp, tuyệt đối không chèn mã biến thể hay tự thêm chữ vào ID.

**DANH SÁCH SẢN PHẨM & CÁC BIẾN THỂ HIỆN CÓ TRONG KHO:**
${truncateText(dsSanPham, 2500)}

TÀI LIỆU KIẾN THỨC CHUYÊN SÂU VỀ MỸ PHẨM VÀ DA LIỄU (Sử dụng kiến thức này để tư vấn):
"""
${truncateText(duLieuHuanLuyen, 2500)}
"""
`;
          // =========================================================

          const [history] = await db.query(
            `SELECT VaiTro, NoiDung FROM ChiTietChat 
             WHERE MaPhien = ? ORDER BY NgayGui DESC LIMIT 3`,
            [maPhien],
          );

          let contextPrompt = "Lịch sử trò chuyện gần đây:\n";
          history.reverse().forEach((msg) => {
            contextPrompt += `${msg.VaiTro}: ${msg.NoiDung}\n`;
          });
          contextPrompt += `\nCâu hỏi mới của CUST: ${truncateText(text, 1000)}`;

          let aiResponse;
          try {
            aiResponse = await generateAiReply(
              contextPrompt,
              `Bạn là trợ lý AI của Hamoni Cosmetic. Trả lời ngắn gọn, lịch sự và đúng trọng tâm.\n\n${dynamicInstruction}`,
            );
          } catch (aiError) {
            console.error("Dùng fallback trả lời cục bộ do Gemini lỗi:", aiError);
            aiResponse = buildLocalAssistantReply(text, dsSanPham);
          }

          aiResponse = appendSuggestedProducts(
            injectProductLinks(aiResponse, suggestedProducts),
            suggestedProducts,
          );

          await db.query(
            `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'BOT', ?)`,
            [maPhien, aiResponse],
          );

          const aiMessageData = {
            id: Date.now(),
            senderType: "BOT",
            text: aiResponse,
            time: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
          };

          io.to(roomName).emit("receive_message", aiMessageData);
          io.to("STAFF_ROOM").emit("monitor_message", {
            maPhien,
            ...aiMessageData,
          });
        }
      } catch (error) {
        console.error("Lỗi xử lý tin nhắn chat:", error);
        io.to(roomName).emit("receive_message", {
          id: Date.now(),
          senderType: "BOT",
          text: FALLBACK_AI_MESSAGE,
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        });
      }
    });

    // 3. XỬ LÝ KHI NHÂN VIÊN GỬI TIN NHẮN TRẢ LỜI KHÁCH
    socket.on("staff_send_message", async (data) => {
      const { id, maPhien, maNhanVien, roomName, text } = data;
      try {
        const messageId = id || Date.now();
        const timeNow = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });

        await db.query(
          `UPDATE PhienChat SET MaNhanVienXuLy = ?, TrangThai = 'human' WHERE MaPhien = ?`,
          [maNhanVien, maPhien],
        );
        await db.query(
          `INSERT INTO ChiTietChat (MaPhien, VaiTro, NoiDung) VALUES (?, 'STAFF', ?)`,
          [maPhien, text],
        );

        io.to(roomName).emit("receive_message", {
          id: messageId,
          senderType: "STAFF",
          text: text,
          time: timeNow,
        });

        io.to("STAFF_ROOM").emit("monitor_message", {
          id: messageId,
          maPhien,
          senderType: "STAFF",
          text,
          time: timeNow,
          status: "human",
        });
      } catch (error) {
        console.error("Lỗi khi nhân viên gửi tin nhắn:", error);
      }
    });

    // 4. XỬ LÝ KHI NHÂN VIÊN/ADMIN KẾT THÚC CUỘC TRÒ CHUYỆN
    socket.on("end_chat", async (data) => {
      const { maPhien, roomName } = data;
      try {
        await db.query(
          `UPDATE PhienChat SET TrangThai = 'bot', MaNhanVienXuLy = NULL WHERE MaPhien = ?`,
          [maPhien],
        );

        io.to(roomName).emit("chat_closed_by_admin");

        io.to("STAFF_ROOM").emit("monitor_message", {
          maPhien,
          text: "Phiên hỗ trợ đã kết thúc. AI quay trở lại.",
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
          status: "bot",
        });
      } catch (error) {
        console.error("Lỗi khi kết thúc cuộc trò chuyện:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Đã ngắt kết nối: ${socket.id}`);
    });
  });
};
