const db = require("../config/db");

const isCustomerReply = (reply) =>
  String(reply?.MaQuyen || "").toUpperCase() === "CUST";

const getEffectiveReviewStatus = (review) => {
  const replies = Array.isArray(review?.replies) ? review.replies : [];

  if (replies.length === 0) {
    return review?.TrangThai || "CHUA_PHAN_HOI";
  }

  const latestReply = replies[replies.length - 1];
  return isCustomerReply(latestReply) ? "CHUA_PHAN_HOI" : "DA_PHAN_HOI";
};

const loadRepliesForReview = async (review) => {
  const [replies] = await db.query(
    `
        SELECT
            ph.MaPH,
            ph.MaND,
            ph.NoiDung,
            ph.NgayTao,
            nd.HoTen,
            nd.MaQuyen
        FROM DanhGia_PhanHoi ph
        JOIN NguoiDung nd ON ph.MaND = nd.MaND
        WHERE ph.MaDG = ?
        ORDER BY ph.NgayTao ASC, ph.MaPH ASC
    `,
    [review.MaDG],
  );

  review.replies = replies;
  review.TrangThai = getEffectiveReviewStatus(review);
  return review;
};

const reviewController = {
  // ===== STATS =====
  getReviewStats: async (req, res) => {
    try {
      const [rows] = await db.query(`
                SELECT
                    dg.MaDG,
                    dg.TrangThai
                FROM DanhGia dg
            `);

      for (const review of rows) {
        await loadRepliesForReview(review);
      }

      const total = rows.length;
      const pending = rows.filter(
        (review) => review.TrangThai === "CHUA_PHAN_HOI",
      ).length;

      res.json({
        total,
        pending,
      });
    } catch (error) {
      console.error("STATS ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // 🔥 [MỚI THÊM] ===== LẤY DANH SÁCH SẢN PHẨM CHO SIDEBAR =====
  getSidebarProducts: async (req, res) => {
    try {
      const query = `
                SELECT 
                    sp.MaSP, 
                    sp.TenSP, 
                    dg.MaDG,
                    dg.TrangThai,
                    dg.NgayDanhGia
                FROM SanPham sp
                JOIN DanhGia dg ON sp.MaSP = dg.MaSP
                ORDER BY sp.MaSP ASC, dg.NgayDanhGia DESC
            `;

      const [rows] = await db.query(query);

      const productMap = new Map();

      for (const row of rows) {
        const review = await loadRepliesForReview(row);
        const current = productMap.get(review.MaSP) || {
          MaSP: review.MaSP,
          TenSP: review.TenSP,
          TotalReviews: 0,
          PendingReviews: 0,
        };

        current.TotalReviews += 1;
        if (review.TrangThai === "CHUA_PHAN_HOI") {
          current.PendingReviews += 1;
        }

        productMap.set(review.MaSP, current);
      }

      res.json(
        Array.from(productMap.values()).sort((a, b) => {
          if (b.PendingReviews !== a.PendingReviews) {
            return b.PendingReviews - a.PendingReviews;
          }

          return b.TotalReviews - a.TotalReviews;
        }),
      );
    } catch (error) {
      console.error("GET SIDEBAR ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ===== GET ALL + FILTER + SEARCH + DATE =====
  getAllReviews: async (req, res) => {
    try {
      // 🔥 Thêm MaSP vào biến destructuring
      let { status, search, rating, startDate, endDate, MaSP } = req.query;

      let query = `
                SELECT 
                    dg.MaDG,
                    dg.SoSao,
                    dg.BinhLuan,
                    dg.HinhAnh, /* 🔥 ĐÃ THÊM CỘT HÌNH ẢNH VÀO ĐÂY ĐỂ TRẢ VỀ CHO FRONTEND */
                    dg.TrangThai,
                    dg.NgayDanhGia,
                    nd.HoTen,
                    sp.TenSP
                FROM DanhGia dg
                JOIN NguoiDung nd ON dg.MaND = nd.MaND
                JOIN SanPham sp ON dg.MaSP = sp.MaSP
                WHERE 1=1
            `;

      let params = [];

      if (rating && rating !== "ALL") {
        query += " AND dg.SoSao = ?";
        params.push(Number(rating));
      }

      if (startDate) {
        query += " AND dg.NgayDanhGia >= ?";
        params.push(startDate);
      }

      if (endDate) {
        query += " AND dg.NgayDanhGia <= ?";
        params.push(endDate);
      }
      // 🔥 [MỚI THÊM] Lọc theo sản phẩm được chọn bên Sidebar
      if (MaSP && MaSP !== "ALL") {
        query += " AND dg.MaSP = ?";
        params.push(MaSP);
      }

      if (search) {
        query += " AND (nd.HoTen LIKE ? OR sp.TenSP LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }

      query += " ORDER BY dg.NgayDanhGia DESC";

      const [rows] = await db.query(query, params);

      // 🔥 GẮN REPLIES VÀO MỖI REVIEW
      for (let review of rows) {
        await loadRepliesForReview(review);
      }

      let filteredRows = rows;

      if (status && status !== "ALL") {
        filteredRows = rows.filter((review) => review.TrangThai === status);
      }

      res.json(filteredRows);
    } catch (error) {
      console.error("GET REVIEWS ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ===== GET REPLIES (OPTION - dùng riêng nếu cần) =====
  getRepliesByReview: async (req, res) => {
    try {
      const { id } = req.params;

      const [rows] = await db.query(
        `
                SELECT 
                    ph.MaPH,
                    ph.MaND,
                    ph.NoiDung,
                    ph.NgayTao,
                    nd.HoTen,
                    nd.MaQuyen
                FROM DanhGia_PhanHoi ph
                JOIN NguoiDung nd ON ph.MaND = nd.MaND
                WHERE ph.MaDG = ?
                ORDER BY ph.NgayTao ASC, ph.MaPH ASC
            `,
        [id],
      );

      res.json(rows);
    } catch (error) {
      console.error("GET REPLIES ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ===== UPDATE STATUS =====
  updateStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await db.query("UPDATE DanhGia SET TrangThai = ? WHERE MaDG = ?", [
        status,
        id,
      ]);

      res.json({ message: "Cập nhật thành công" });
    } catch (error) {
      console.error("UPDATE STATUS ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  },

  // ===== REPLY (CHUẨN THREAD) =====
  replyReview: async (req, res) => {
    try {
      const { id } = req.params;
      let { replyComment } = req.body;

      // ép kiểu an toàn
      replyComment = String(replyComment || "").trim();

      if (!replyComment) {
        return res.status(400).json({ message: "Nội dung phản hồi rỗng!" });
      }
      // ✅ INSERT vào bảng DanhGia_PhanHoi (CHO PHÉP NHIỀU LẦN)
      await db.query(
        `INSERT INTO DanhGia_PhanHoi (MaDG, MaND, NoiDung)
                 VALUES (?, ?, ?)`,
        [id, 1, replyComment], // 1 = admin (sau này lấy từ login)
      );

      // ✅ cập nhật trạng thái
      await db.query(
        `UPDATE DanhGia 
                 SET TrangThai = 'DA_PHAN_HOI' 
                 WHERE MaDG = ?`,
        [id],
      );

      res.json({ message: "Đã phản hồi" });
    } catch (error) {
      console.error("REPLY ERROR:", error);
      res.status(500).json({ message: error.message });
    }
  },
};

module.exports = reviewController;
