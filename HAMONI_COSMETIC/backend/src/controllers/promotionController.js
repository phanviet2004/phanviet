const db = require("../config/db");

const promotionController = {
  // 1. LẤY DANH SÁCH (Không check trạng thái nữa vì dùng Hard Delete)
  getAllPromotions: async (req, res) => {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM ChuongTrinhKhuyenMai ORDER BY NgayBatDau DESC`,
      );
      res.status(200).json(rows);
    } catch (error) {
      console.error("Lỗi lấy danh sách KM:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // 2. LẤY SẢN PHẨM & BIẾN THỂ
  getVariantsForPromo: async (req, res) => {
    try {
      const [rows] = await db.execute(`
                SELECT bt.MaBienThe, bt.TenBienThe, sp.TenSP 
                FROM BienTheSanPham bt
                JOIN SanPham sp ON bt.MaSP = sp.MaSP
                ORDER BY sp.TenSP ASC
            `);
      res.status(200).json(rows);
    } catch (error) {
      console.error("Lỗi lấy SP cho Promo:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // 3. TẠO KHUYẾN MÃI MỚI
  createPromotion: async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const {
        TenCTKM,
        LoaiGiamGia,
        GiaTriGiam,
        NgayBatDau,
        NgayKetThuc,
        Banner,
        danhSachBienThe,
      } = req.body;

      // === VALIDATE DỮ LIỆU BẮT BUỘC ===
      if (!TenCTKM?.trim()) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Tên chương trình không được để trống!" });
      }

      if (!["PhanTram", "SoTien"].includes(LoaiGiamGia)) {
        await conn.rollback();
        return res.status(400).json({ message: "Loại giảm giá không hợp lệ!" });
      }

      if (!GiaTriGiam || Number(GiaTriGiam) <= 0) {
        await conn.rollback();
        return res.status(400).json({ message: "Mức giảm phải lớn hơn 0!" });
      }

      const giaTriGiam = Number(GiaTriGiam);
      if (LoaiGiamGia === "PhanTram" && giaTriGiam > 100) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Giảm theo % không được vượt quá 100%!" });
      }

      // === VALIDATE NGÀY THÁNG ===
      if (!NgayBatDau || !NgayKetThuc) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Vui lòng chọn ngày bắt đầu và kết thúc!" });
      }

      const startDate = new Date(NgayBatDau);
      const endDate = new Date(NgayKetThuc);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Định dạng ngày không hợp lệ!" });
      }

      if (endDate <= startDate) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
      }

      // === VALIDATE SẢN PHẨM ===
      if (!danhSachBienThe || danhSachBienThe.length === 0) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Vui lòng chọn ít nhất 1 sản phẩm!" });
      }

      const [kmResult] = await conn.execute(
        `
                INSERT INTO ChuongTrinhKhuyenMai (TenCTKM, LoaiGiamGia, GiaTriGiam, NgayBatDau, NgayKetThuc, Banner)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
        [
          TenCTKM.trim(),
          LoaiGiamGia,
          giaTriGiam,
          NgayBatDau,
          NgayKetThuc,
          Banner || null,
        ],
      );

      const newMaCTKM = kmResult.insertId;

      for (let maBienThe of danhSachBienThe) {
        await conn.execute(
          `INSERT INTO SanPham_KhuyenMai (MaCTKM, MaBienThe) VALUES (?, ?)`,
          [newMaCTKM, maBienThe],
        );
      }

      await conn.commit();
      res
        .status(201)
        .json({ message: "Tạo chương trình khuyến mãi thành công!" });
    } catch (error) {
      await conn.rollback();
      console.error("Lỗi tạo KM:", error);
      res.status(500).json({ message: "Lỗi server khi tạo khuyến mãi" });
    } finally {
      conn.release();
    }
  },

  // 3.5. LẤY CÁC KHUYẾN MÃI ĐANG HOẠT ĐỘNG (dùng cho dropdown gợi ý URL)
  getActivePromotions: async (req, res) => {
    try {
      const [rows] = await db.execute(`
                SELECT MaCTKM, TenCTKM, NgayBatDau, NgayKetThuc
                FROM ChuongTrinhKhuyenMai
                WHERE (NgayBatDau IS NULL OR DATE(NgayBatDau) <= CURDATE())
                  AND (NgayKetThuc IS NULL OR DATE(NgayKetThuc) >= CURDATE())
                ORDER BY NgayKetThuc ASC
            `);

      res.status(200).json(rows);
    } catch (error) {
      console.error("Lỗi lấy khuyến mãi đang hoạt động:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // 4. LẤY CHI TIẾT 1 KHUYẾN MÃI
  getPromotionDetail: async (req, res) => {
    try {
      const { id } = req.params;

      const [[promotion]] = await db.execute(
        `SELECT * FROM ChuongTrinhKhuyenMai WHERE MaCTKM = ?`,
        [id],
      );
      if (!promotion)
        return res
          .status(404)
          .json({ message: "Không tìm thấy chương trình này!" });

      const [variants] = await db.execute(
        `SELECT MaBienThe FROM SanPham_KhuyenMai WHERE MaCTKM = ?`,
        [id],
      );
      const danhSachBienThe = variants.map((v) => v.MaBienThe);

      res.status(200).json({ ...promotion, danhSachBienThe });
    } catch (error) {
      console.error("Lỗi chi tiết KM:", error);
      res.status(500).json({ message: "Lỗi server" });
    }
  },

  // 5. CẬP NHẬT KHUYẾN MÃI
  updatePromotion: async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { id } = req.params;
      const {
        TenCTKM,
        LoaiGiamGia,
        GiaTriGiam,
        NgayBatDau,
        NgayKetThuc,
        Banner,
        danhSachBienThe,
      } = req.body;

      // === VALIDATE DỮ LIỆU ===
      if (!TenCTKM?.trim()) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Tên chương trình không được để trống!" });
      }

      if (!["PhanTram", "SoTien"].includes(LoaiGiamGia)) {
        await conn.rollback();
        return res.status(400).json({ message: "Loại giảm giá không hợp lệ!" });
      }

      if (!GiaTriGiam || Number(GiaTriGiam) <= 0) {
        await conn.rollback();
        return res.status(400).json({ message: "Mức giảm phải lớn hơn 0!" });
      }

      const giaTriGiam = Number(GiaTriGiam);
      if (LoaiGiamGia === "PhanTram" && giaTriGiam > 100) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Giảm theo % không được vượt quá 100%!" });
      }

      // === VALIDATE NGÀY THÁNG ===
      if (!NgayBatDau || !NgayKetThuc) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Vui lòng chọn ngày bắt đầu và kết thúc!" });
      }

      const startDate = new Date(NgayBatDau);
      const endDate = new Date(NgayKetThuc);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Định dạng ngày không hợp lệ!" });
      }

      if (endDate <= startDate) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
      }

      // === VALIDATE SẢN PHẨM ===
      if (!danhSachBienThe || danhSachBienThe.length === 0) {
        await conn.rollback();
        return res
          .status(400)
          .json({ message: "Vui lòng chọn ít nhất 1 sản phẩm!" });
      }

      await conn.execute(
        `
                UPDATE ChuongTrinhKhuyenMai 
                SET TenCTKM = ?, LoaiGiamGia = ?, GiaTriGiam = ?, NgayBatDau = ?, NgayKetThuc = ?, Banner = ?
                WHERE MaCTKM = ?
            `,
        [
          TenCTKM.trim(),
          LoaiGiamGia,
          giaTriGiam,
          NgayBatDau,
          NgayKetThuc,
          Banner || null,
          id,
        ],
      );

      await conn.execute(`DELETE FROM SanPham_KhuyenMai WHERE MaCTKM = ?`, [
        id,
      ]);

      for (let maBienThe of danhSachBienThe) {
        await conn.execute(
          `INSERT INTO SanPham_KhuyenMai (MaCTKM, MaBienThe) VALUES (?, ?)`,
          [id, maBienThe],
        );
      }

      await conn.commit();
      res.status(200).json({ message: "Cập nhật khuyến mãi thành công!" });
    } catch (error) {
      await conn.rollback();
      console.error("Lỗi cập nhật KM:", error);
      res.status(500).json({ message: "Lỗi server" });
    } finally {
      conn.release();
    }
  },

  // 6. LẤY SẢN PHẨM CHI TIẾT CỦA KHUYẾN MÃI
  getPromotionProducts: async (req, res) => {
    try {
      const { id } = req.params;

      const [[promotion]] = await db.execute(
        `SELECT * FROM ChuongTrinhKhuyenMai WHERE MaCTKM = ?`,
        [id],
      );

      if (!promotion) {
        return res.status(404).json({
          message: "Không tìm thấy chương trình khuyến mãi này!",
        });
      }

      const [products] = await db.execute(
        `
                SELECT 
                    sp.MaSP as id,
                    sp.TenSP as name,
                    tk.SoLuongTon,
                    (
                        SELECT DuongDanAnh
                        FROM HinhAnh
                        WHERE MaThamChieu = sp.MaSP
                        AND LoaiThamChieu = 'SanPham'
                        /* ĐÃ FIX: Ưu tiên ảnh chính, nếu không có lấy ảnh bất kỳ để không bị null */
                        ORDER BY LaAnhChinh DESC, ThuTuHienThi ASC
                        LIMIT 1
                    ) as image,
                    bt.MaBienThe,
                    bt.TenBienThe,
                    bt.Gia as oldPrice,
                    CASE
                        WHEN km.LoaiGiamGia = 'PhanTram'
                            THEN bt.Gia - (bt.Gia * km.GiaTriGiam / 100)
                        WHEN km.LoaiGiamGia = 'SoTien'
                            THEN GREATEST(0, bt.Gia - km.GiaTriGiam)
                        ELSE bt.Gia
                    END as price
                FROM SanPham_KhuyenMai skm
                JOIN ChuongTrinhKhuyenMai km ON skm.MaCTKM = km.MaCTKM
                JOIN BienTheSanPham bt ON skm.MaBienThe = bt.MaBienThe
                JOIN SanPham sp ON bt.MaSP = sp.MaSP
                LEFT JOIN TonKho tk ON bt.MaBienThe = tk.MaBienThe
                WHERE skm.MaCTKM = ?
                ORDER BY sp.TenSP ASC, bt.TenBienThe ASC
            `,
        [id],
      );

      res.status(200).json({
        promotion,
        products,
      });
    } catch (error) {
      console.error("Lỗi lấy sản phẩm KM:", error);
      res.status(500).json({
        message: "Lỗi server",
      });
    }
  },

  // 7. XÓA KHUYẾN MÃI (HARD DELETE)
  deletePromotion: async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const { id } = req.params;

      // Xóa ở bảng con (Sản phẩm) trước
      await conn.execute(`DELETE FROM SanPham_KhuyenMai WHERE MaCTKM = ?`, [
        id,
      ]);

      // Xóa ở bảng cha sau
      const [deleteResult] = await conn.execute(
        `DELETE FROM ChuongTrinhKhuyenMai WHERE MaCTKM = ?`,
        [id],
      );

      if (deleteResult.affectedRows === 0) {
        await conn.rollback();
        return res
          .status(404)
          .json({ message: "Không tìm thấy chương trình khuyến mãi để xóa." });
      }

      await conn.commit();
      res.status(200).json({ message: "Xóa khuyến mãi thành công!" });
    } catch (error) {
      await conn.rollback();
      console.error("Lỗi xóa KM:", error);

      // Bắt lỗi khóa ngoại nếu chương trình này đã được áp dụng vào Đơn Hàng thực tế
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res
          .status(409)
          .json({
            message:
              "Không thể xóa vì khuyến mãi này đã được sử dụng trong Đơn Hàng.",
          });
      }

      res.status(500).json({ message: "Lỗi server khi xóa" });
    } finally {
      conn.release();
    }
  },
};

module.exports = promotionController;
