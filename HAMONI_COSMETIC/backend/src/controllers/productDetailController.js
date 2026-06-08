// src/controllers/productDetailController.js
const db = require('../config/db');

const COMPLETED_ORDER_STATUSES = ['HoanThanh', 'DaGiao'];

// ==========================================
// 1. LẤY TOÀN BỘ DỮ LIỆU CHI TIẾT (INFO, IMAGES, VARIANTS)
// ==========================================
const getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        // Lấy thông tin cơ bản
        const [infoResult] = await db.execute('SELECT * FROM SanPham WHERE MaSP = ?', [id]);
        if (infoResult.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
        }

        // Lấy danh sách hình ảnh (Đa hình)
        const [imagesResult] = await db.execute(
            'SELECT * FROM HinhAnh WHERE LoaiThamChieu = "SanPham" AND MaThamChieu = ?', 
            [id]
        );

        // Lấy danh sách biến thể
        const [variantsResult] = await db.execute(
            'SELECT * FROM BienTheSanPham WHERE MaSP = ?', 
            [id]
        );

        // Gộp lại và trả về cho React
        res.status(200).json({
            info: infoResult[0],
            images: imagesResult,
            variants: variantsResult
        });
    } catch (error) {
        console.error("Lỗi lấy chi tiết sản phẩm:", error);
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 1.1 CHI TIẾT SẢN PHẨM CHO CLIENT
// ==========================================
const getPublicProductDetail = async (req, res) => {
    const { id } = req.params;

    try {
        const [productRows] = await db.execute(
            `SELECT sp.MaSP, sp.MaDM, sp.TenSP, sp.MoTa, sp.ThanhPhan, sp.CachSuDung, sp.LoaiDaPhuHop, dm.TenDM
             FROM SanPham sp
             LEFT JOIN DanhMuc dm ON dm.MaDM = sp.MaDM
             WHERE sp.MaSP = ?`,
            [id]
        );

        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        const [imageRows] = await db.execute(
            `SELECT MaHinhAnh, DuongDanAnh, LaAnhChinh, ThuTuHienThi
             FROM HinhAnh
             WHERE LoaiThamChieu = 'SanPham' AND MaThamChieu = ?
             ORDER BY LaAnhChinh DESC, ThuTuHienThi ASC, MaHinhAnh ASC`,
            [id]
        );

        const [variantRows] = await db.execute(
            `SELECT
                bt.MaBienThe,
                bt.TenBienThe,
                bt.Gia,
                CASE
                    WHEN km.MaCTKM IS NOT NULL
                         AND NOW() BETWEEN km.NgayBatDau AND km.NgayKetThuc
                    THEN CASE
                        WHEN km.LoaiGiamGia = 'PhanTram' THEN GREATEST(0, bt.Gia - (bt.Gia * km.GiaTriGiam / 100))
                        WHEN km.LoaiGiamGia = 'SoTien' THEN GREATEST(0, bt.Gia - km.GiaTriGiam)
                        ELSE bt.Gia
                    END
                    ELSE bt.Gia
                END AS GiaBan,
                CASE
                    WHEN km.MaCTKM IS NOT NULL
                         AND NOW() BETWEEN km.NgayBatDau AND km.NgayKetThuc
                    THEN bt.Gia
                    ELSE NULL
                END AS GiaGoc,
                COALESCE(SUM(tk.SoLuongTon), 0) AS SoLuongTon
             FROM BienTheSanPham bt
             LEFT JOIN TonKho tk ON tk.MaBienThe = bt.MaBienThe
             LEFT JOIN SanPham_KhuyenMai spkm ON spkm.MaBienThe = bt.MaBienThe
             LEFT JOIN ChuongTrinhKhuyenMai km ON km.MaCTKM = spkm.MaCTKM
             WHERE bt.MaSP = ?
             GROUP BY bt.MaBienThe, bt.TenBienThe, bt.Gia, km.MaCTKM, km.NgayBatDau, km.NgayKetThuc, km.LoaiGiamGia, km.GiaTriGiam
             ORDER BY GiaBan ASC, bt.MaBienThe ASC`,
            [id]
        );

        const [stockRows] = await db.execute(
            `SELECT COALESCE(SUM(tk.SoLuongTon), 0) AS SoLuongTon
             FROM BienTheSanPham bt
             LEFT JOIN TonKho tk ON tk.MaBienThe = bt.MaBienThe
             WHERE bt.MaSP = ?`,
            [id]
        );

        const [ratingRows] = await db.execute(
            `SELECT
                COALESCE(ROUND(AVG(SoSao), 1), 0) AS SoSaoTB,
                COUNT(*) AS LuotDanhGia
             FROM DanhGia
             WHERE MaSP = ? AND IsHidden = 0`,
            [id]
        );

        const sortedVariants = [...variantRows].sort((a, b) => Number(a.GiaBan || 0) - Number(b.GiaBan || 0));
        const lowestPrice = sortedVariants.length > 0 ? Number(sortedVariants[0].GiaBan || 0) : 0;
        const lowestOldPrice = sortedVariants.length > 0 && sortedVariants[0].GiaGoc != null
            ? Number(sortedVariants[0].GiaGoc)
            : null;

        res.status(200).json({
            info: {
                ...productRows[0],
                GiaBan: lowestPrice,
                GiaGoc: lowestOldPrice,
                SoLuongTon: Number(stockRows[0]?.SoLuongTon || 0),
                SoSaoTB: Number(ratingRows[0]?.SoSaoTB || 0),
                LuotDanhGia: Number(ratingRows[0]?.LuotDanhGia || 0)
            },
            images: imageRows,
            variants: sortedVariants
        });
    } catch (error) {
        console.error('Lỗi lấy chi tiết sản phẩm client:', error);
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

// ==========================================
// 1.2 ĐÁNH GIÁ SẢN PHẨM CHO CLIENT
// ==========================================
const getProductReviews = async (req, res) => {
    const { id } = req.params;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const safeLimit = Number.isFinite(limit) ? limit : 4;

    try {
        const [rows] = await db.execute(
            `SELECT
                dg.MaDG,
                dg.MaND,
                dg.SoSao,
                dg.BinhLuan,
                dg.HinhAnh,
                dg.NgayDanhGia,
                nd.HoTen
             FROM DanhGia dg
             JOIN NguoiDung nd ON nd.MaND = dg.MaND
             WHERE dg.MaSP = ? AND dg.IsHidden = 0
             ORDER BY dg.NgayDanhGia DESC
             LIMIT ${safeLimit}`,
            [id]
        );

        for (const review of rows) {
            const [replies] = await db.execute(
                `SELECT
                    ph.MaPH,
                    ph.MaND,
                    ph.NoiDung,
                    ph.NgayTao,
                    nd.HoTen,
                    nd.MaQuyen
                 FROM DanhGia_PhanHoi ph
                 JOIN NguoiDung nd ON nd.MaND = ph.MaND
                 WHERE ph.MaDG = ?
                 ORDER BY ph.NgayTao ASC`,
                [review.MaDG]
            );

            review.replies = replies;
        }

        res.status(200).json(rows);
    } catch (error) {
        console.error('Lỗi lấy đánh giá sản phẩm:', error);
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

const getReviewReplyEligibility = async (req, res) => {
    const { id } = req.params;
    const userId = Number(req.user?.id || 0);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: 'Bạn cần đăng nhập để phản hồi.' });
    }

    try {
        const [reviewRows] = await db.execute(
            `SELECT MaDG, MaND
             FROM DanhGia
             WHERE MaSP = ? AND MaND = ? AND IsHidden = 0
             LIMIT 1`,
            [id, userId]
        );

        const hasReviewed = reviewRows.length > 0;

        const [purchaseRows] = await db.query(
            `SELECT 1
             FROM DonHang dh
             JOIN ChiTietDonHang ctdh ON ctdh.MaDH = dh.MaDH
             JOIN BienTheSanPham bt ON bt.MaBienThe = ctdh.MaBienThe
             WHERE dh.MaND = ?
               AND bt.MaSP = ?
               AND dh.TrangThai IN (?)
             LIMIT 1`,
            [userId, id, COMPLETED_ORDER_STATUSES]
        );

        const hasCompletedPurchase = purchaseRows.length > 0;

        const canReply = hasReviewed && hasCompletedPurchase;

        return res.status(200).json({
            canReply,
            hasReviewed,
            hasCompletedPurchase,
            userId
        });
    } catch (error) {
        console.error('Lỗi kiểm tra quyền phản hồi đánh giá:', error);
        return res.status(500).json({ message: 'Lỗi Server!' });
    }
};

const postCustomerReply = async (req, res) => {
    const { reviewId } = req.params;
    const userId = Number(req.user?.id || 0);
    const replyComment = String(req.body?.replyComment || '').trim();

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({ message: 'Bạn cần đăng nhập để phản hồi.' });
    }

    if (!replyComment) {
        return res.status(400).json({ message: 'Nội dung phản hồi không được để trống.' });
    }

    try {
        const [reviewRows] = await db.execute(
            `SELECT MaDG, MaSP, MaND
             FROM DanhGia
             WHERE MaDG = ? AND IsHidden = 0
             LIMIT 1`,
            [reviewId]
        );

        if (reviewRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy bài đánh giá.' });
        }

        const review = reviewRows[0];
        if (Number(review.MaND) !== userId) {
            return res.status(403).json({ message: 'Bạn chỉ có thể phản hồi bài đánh giá của chính mình.' });
        }

        const [purchaseRows] = await db.query(
            `SELECT 1
             FROM DonHang dh
             JOIN ChiTietDonHang ctdh ON ctdh.MaDH = dh.MaDH
             JOIN BienTheSanPham bt ON bt.MaBienThe = ctdh.MaBienThe
             WHERE dh.MaND = ?
               AND bt.MaSP = ?
               AND dh.TrangThai IN (?)
             LIMIT 1`,
            [userId, review.MaSP, COMPLETED_ORDER_STATUSES]
        );

        if (purchaseRows.length === 0) {
            return res.status(403).json({ message: 'Bạn chưa có đơn hàng hoàn tất cho sản phẩm này.' });
        }

        const [shopReplyRows] = await db.execute(
            `SELECT 1
             FROM DanhGia_PhanHoi ph
             JOIN NguoiDung nd ON nd.MaND = ph.MaND
             WHERE ph.MaDG = ?
               AND nd.MaQuyen <> 'CUST'
             LIMIT 1`,
            [reviewId]
        );

        if (shopReplyRows.length === 0) {
            return res.status(400).json({ message: 'Chỉ phản hồi lại khi shop đã trả lời đánh giá của bạn.' });
        }

        const [insertResult] = await db.execute(
            `INSERT INTO DanhGia_PhanHoi (MaDG, MaND, NoiDung)
             VALUES (?, ?, ?)`,
            [reviewId, userId, replyComment]
        );

        await db.execute(
            `UPDATE DanhGia
             SET TrangThai = 'DA_PHAN_HOI'
             WHERE MaDG = ?`,
            [reviewId]
        );

        const [newReplyRows] = await db.execute(
            `SELECT
                ph.MaPH,
                ph.MaND,
                ph.NoiDung,
                ph.NgayTao,
                nd.HoTen,
                nd.MaQuyen
             FROM DanhGia_PhanHoi ph
             JOIN NguoiDung nd ON nd.MaND = ph.MaND
             WHERE ph.MaPH = ?
             LIMIT 1`,
            [insertResult.insertId]
        );

        return res.status(201).json({
            message: 'Đã gửi phản hồi.',
            reply: newReplyRows[0] || null
        });
    } catch (error) {
        console.error('Lỗi gửi phản hồi khách hàng:', error);
        return res.status(500).json({ message: 'Lỗi Server!' });
    }
};

// ==========================================
// 1.3 SẢN PHẨM GỢI Ý CHO CLIENT
// ==========================================
const getSuggestedProducts = async (req, res) => {
    const { id } = req.params;
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const safeLimit = Number.isFinite(limit) ? limit : 4;

    try {
        const [categoryRows] = await db.execute(
            'SELECT MaDM FROM SanPham WHERE MaSP = ?',
            [id]
        );

        if (categoryRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm!' });
        }

        const maDM = categoryRows[0].MaDM;

        const [rows] = await db.execute(
            `SELECT
                sp.MaSP,
                sp.TenSP,
                -- Giá bán (tính sau khuyến mãi nếu có) lấy min trên các biến thể
                COALESCE(MIN(
                    CASE
                        WHEN km.MaCTKM IS NOT NULL AND NOW() BETWEEN km.NgayBatDau AND km.NgayKetThuc
                        THEN CASE
                            WHEN km.LoaiGiamGia = 'PhanTram' THEN GREATEST(0, bt.Gia - (bt.Gia * km.GiaTriGiam / 100))
                            WHEN km.LoaiGiamGia = 'SoTien' THEN GREATEST(0, bt.Gia - km.GiaTriGiam)
                            ELSE bt.Gia
                        END
                        ELSE bt.Gia
                    END
                ), 0) AS GiaBan,
                -- Giá gốc: lấy min giá gốc các biến thể (dùng để so sánh và hiển thị giá gốc nếu > GiaBan)
                COALESCE(MIN(bt.Gia), 0) AS GiaGoc,
                COALESCE(ROUND(AVG(dg.SoSao), 1), 0) AS SoSaoTB,
                COUNT(DISTINCT dg.MaDG) AS LuotDanhGia,
                COALESCE((
                    SELECT SUM(tk.SoLuongTon)
                    FROM BienTheSanPham bt2
                    LEFT JOIN TonKho tk ON tk.MaBienThe = bt2.MaBienThe
                    WHERE bt2.MaSP = sp.MaSP
                ), 0) AS SoLuongTon,
                (
                    SELECT ha.DuongDanAnh
                    FROM HinhAnh ha
                    WHERE ha.LoaiThamChieu = 'SanPham' AND ha.MaThamChieu = sp.MaSP
                    ORDER BY ha.LaAnhChinh DESC, ha.ThuTuHienThi ASC, ha.MaHinhAnh ASC
                    LIMIT 1
                ) AS AnhChinh
             FROM SanPham sp
             LEFT JOIN BienTheSanPham bt ON bt.MaSP = sp.MaSP
             LEFT JOIN SanPham_KhuyenMai spkm ON spkm.MaBienThe = bt.MaBienThe
             LEFT JOIN ChuongTrinhKhuyenMai km ON km.MaCTKM = spkm.MaCTKM
             LEFT JOIN DanhGia dg ON dg.MaSP = sp.MaSP AND dg.IsHidden = 0
             WHERE sp.MaDM = ? AND sp.MaSP <> ?
             GROUP BY sp.MaSP, sp.TenSP
             ORDER BY SoSaoTB DESC, sp.NgayTao DESC
             LIMIT ${safeLimit}`,
            [maDM, id]
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Lỗi lấy sản phẩm gợi ý:', error);
        res.status(500).json({ message: 'Lỗi Server!' });
    }
};

// ==========================================
// 2. CẬP NHẬT THÔNG TIN CƠ BẢN CỦA SẢN PHẨM
// ==========================================
const updateProductInfo = async (req, res) => {
    const { id } = req.params;
    const { TenSP, MaDM, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop } = req.body;
    try {
        await db.execute(
            `UPDATE SanPham 
             SET TenSP = ?, MaDM = ?, MoTa = ?, ThanhPhan = ?, CachSuDung = ?, LoaiDaPhuHop = ? 
             WHERE MaSP = ?`,
            [TenSP, MaDM, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop, id]
        );
        res.status(200).json({ message: "Cập nhật thông tin thành công!" });
    } catch (error) {
        console.error("Lỗi cập nhật sản phẩm:", error);
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 3. QUẢN LÝ HÌNH ẢNH (THÊM / XÓA)
// ==========================================
const addProductImage = async (req, res) => {
    const { id } = req.params;
    const { DuongDanAnh } = req.body;
    try {
        const [result] = await db.execute(
            `INSERT INTO HinhAnh (LoaiThamChieu, MaThamChieu, DuongDanAnh, LaAnhChinh) 
             VALUES ('SanPham', ?, ?, 0)`,
            [id, DuongDanAnh]
        );
        res.status(201).json({ message: "Đã thêm ảnh!", MaHinhAnh: result.insertId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

const deleteProductImage = async (req, res) => {
    const { imageId } = req.params;
    try {
        await db.execute('DELETE FROM HinhAnh WHERE MaHinhAnh = ?', [imageId]);
        res.status(200).json({ message: "Đã xóa ảnh!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 4. QUẢN LÝ BIẾN THỂ (THÊM / XÓA)
// ==========================================
const addProductVariant = async (req, res) => {
    const { id } = req.params;
    const { TenBienThe, Gia } = req.body;
    try {
        const [result] = await db.execute(
            `INSERT INTO BienTheSanPham (MaSP, TenBienThe, Gia) VALUES (?, ?, ?)`,
            [id, TenBienThe, Gia]
        );
        res.status(201).json({ message: "Đã thêm biến thể!", MaBienThe: result.insertId });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

const deleteProductVariant = async (req, res) => {
    const { variantId } = req.params;
    try {
        // Tương lai: Nên check xem biến thể này có đang nằm trong Đơn Hàng nào không trước khi xóa
        await db.execute('DELETE FROM BienTheSanPham WHERE MaBienThe = ?', [variantId]);
        res.status(200).json({ message: "Đã xóa biến thể!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
};

// ==========================================
// 5. XÓA SẢN PHẨM
// ==========================================
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const conn = await db.getConnection();

    try {
        const [productRows] = await conn.execute('SELECT MaSP FROM SanPham WHERE MaSP = ?', [id]);
        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm để xóa!' });
        }

        // Chặn xóa khi sản phẩm đã phát sinh đơn hàng qua biến thể
        const [usedInOrderRows] = await conn.execute(
            `SELECT 1
             FROM ChiTietDonHang ct
             JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
             WHERE bt.MaSP = ?
             LIMIT 1`,
            [id]
        );

        if (usedInOrderRows.length > 0) {
            return res.status(409).json({
                message: 'Không thể xóa sản phẩm đã phát sinh đơn hàng. Hãy ẩn sản phẩm thay vì xóa.'
            });
        }

        await conn.beginTransaction();

        // Dọn dữ liệu liên quan trước khi xóa sản phẩm
        await conn.execute(
            `DELETE FROM LogTonKho
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM GioHang
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM ChiTietPhieuNhapKho
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM DanhGia_PhanHoi
             WHERE MaDG IN (SELECT MaDG FROM DanhGia WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute('DELETE FROM DanhGia WHERE MaSP = ?', [id]);

        await conn.execute(
            `DELETE FROM TonKho
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM SanPham_KhuyenMai
             WHERE MaBienThe IN (SELECT MaBienThe FROM BienTheSanPham WHERE MaSP = ?)`,
            [id]
        );

        await conn.execute(
            `DELETE FROM HinhAnh
             WHERE LoaiThamChieu = 'SanPham' AND MaThamChieu = ?`,
            [id]
        );

        await conn.execute('DELETE FROM BienTheSanPham WHERE MaSP = ?', [id]);
        await conn.execute('DELETE FROM SanPham WHERE MaSP = ?', [id]);

        await conn.commit();
        return res.status(200).json({ message: 'Xóa sản phẩm thành công!' });
    } catch (error) {
        await conn.rollback();
        console.error('Lỗi xóa sản phẩm:', error);

        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({
                message: 'Lỗi cấu trúc dữ liệu: thiếu bảng liên quan khi xóa sản phẩm.'
            });
        }

        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                message: 'Không thể xóa vì sản phẩm vẫn còn dữ liệu ràng buộc ở bảng khác.'
            });
        }

        return res.status(500).json({ message: 'Lỗi server khi xóa sản phẩm!' });
    } finally {
        conn.release();
    }
};

module.exports = {
    getProductById,
    getPublicProductDetail,
    getProductReviews,
    getReviewReplyEligibility,
    postCustomerReply,
    getSuggestedProducts,
    updateProductInfo,
    addProductImage,
    deleteProductImage,
    addProductVariant,
    deleteProductVariant,
    deleteProduct
};