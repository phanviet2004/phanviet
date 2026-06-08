const db = require('../config/db');

async function syncExpiredBannerStatuses() {
    await db.execute(`
        UPDATE bannertoancuc
        SET TrangThai = 'Hidden'
        WHERE TrangThai = 'Active'
          AND NgayHetHan IS NOT NULL
          AND CURDATE() > NgayHetHan
    `);
}

function shouldBeActiveByDate(endDateValue) {
    if (!endDateValue) return false;

    const normalizedEndDate = String(endDateValue).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedEndDate)) return false;

    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return normalizedEndDate >= todayDate;
}

const bannerController = {

    getBanners: async (req, res) => {
        try {
            console.log("🔥 API banner được gọi");

            await syncExpiredBannerStatuses();

            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.max(parseInt(req.query.limit, 10) || 5, 1);
            const offset = (page - 1) * limit;

            const countSql = `SELECT COUNT(*) AS total FROM bannertoancuc`;
            const [countRows] = await db.query(countSql);
            const totalItems = countRows?.[0]?.total || 0;

            const activeCountSql = `SELECT COUNT(*) AS totalActive FROM bannertoancuc WHERE TrangThai = 'Active'`;
            const [activeCountRows] = await db.query(activeCountSql);
            const totalActiveItems = activeCountRows?.[0]?.totalActive || 0;

            const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

            // Nếu page vượt quá tổng trang thì trả về trang cuối cùng
            const safePage = Math.min(page, totalPages);
            const safeOffset = (safePage - 1) * limit;

            const sql = `
                SELECT 
                    MaBanner,
                    TieuDe,
                    DuongDanAnh,
                    URLDich,
                    ViTriHienThi,
                    ThuTuHienThi,
                    TrangThai,
                    DATE_FORMAT(NgayBatDau, '%Y-%m-%d') AS NgayBatDau,
                    DATE_FORMAT(NgayHetHan, '%Y-%m-%d') AS NgayHetHan
                FROM bannertoancuc
                ORDER BY MaBanner DESC
                LIMIT ? OFFSET ?
            `;

            const [data] = await db.query(sql, [limit, safeOffset]);

            console.log("✅ Data:", data);

            return res.status(200).json({
                data,
                pagination: {
                    page: safePage,
                    limit,
                    totalItems,
                    totalActiveItems,
                    totalPages
                }
            });

        } catch (err) {
            console.error("❌ SQL ERROR:", err);
            return res.status(500).json({
                message: "Lỗi server",
                error: err.message
            });
        }
    },

    getBannerById: async (req, res) => {
        try {
            await syncExpiredBannerStatuses();

            const sql = `
                SELECT 
                    MaBanner,
                    TieuDe,
                    DuongDanAnh,
                    URLDich,
                    ViTriHienThi,
                    ThuTuHienThi,
                    TrangThai,
                    DATE_FORMAT(NgayBatDau, '%Y-%m-%d') AS NgayBatDau,
                    DATE_FORMAT(NgayHetHan, '%Y-%m-%d') AS NgayHetHan
                FROM bannertoancuc 
                WHERE MaBanner = ?
            `;

            const [data] = await db.query(sql, [req.params.id]);

            return res.status(200).json(data[0]);

        } catch (err) {
            return res.status(500).json(err);
        }
    },

    createBanner: async (req, res) => {
     const { TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai, NgayBatDau, NgayHetHan } = req.body;
    
    try {
        const [result] = await db.execute(
            `INSERT INTO bannertoancuc 
            (TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai, NgayBatDau, NgayHetHan) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                TieuDe,
                DuongDanAnh,
                URLDich,
                ViTriHienThi || 'TrangChu',
                ThuTuHienThi || 0,
                TrangThai || 'Active',
                NgayBatDau || null,
                NgayHetHan || null
            ]
        );
        
        res.status(201).json({ 
            message: "Thêm banner thành công!", 
            MaBanner: result.insertId,
            url: DuongDanAnh // Trả về để Frontend hiển thị ngay
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Lỗi Server không thể thêm banner!" });
    }
},

    updateBanner: async (req, res) => {
const { id } = req.params;
    const { TieuDe, DuongDanAnh, URLDich, ViTriHienThi, ThuTuHienThi, TrangThai, NgayBatDau, NgayHetHan } = req.body;
    const effectiveStatus = shouldBeActiveByDate(NgayHetHan) ? 'Active' : (TrangThai || 'Hidden');
    
    try {
        await db.execute(
            `UPDATE bannertoancuc 
             SET TieuDe=?, DuongDanAnh=?, URLDich=?, ViTriHienThi=?, ThuTuHienThi=?, TrangThai=?, NgayBatDau=?, NgayHetHan=? 
             WHERE MaBanner=?`,
            [
                TieuDe,
                DuongDanAnh,
                URLDich,
                ViTriHienThi,
                ThuTuHienThi,
                effectiveStatus,
                NgayBatDau || null,
                NgayHetHan || null,
                id
            ]
        );
        res.status(200).json({ message: "Cập nhật banner thành công!" });
    } catch (error) {
        res.status(500).json({ message: "Lỗi Server!" });
    }
    },

    deleteBanner: async (req, res) => {
        try {
            const sql = `
                DELETE FROM bannertoancuc
                WHERE MaBanner=?
            `;

            await db.query(sql, [req.params.id]);

            return res.status(200).json("Xóa thành công");

        } catch (err) {
            return res.status(500).json(err);
        }
    }

};

module.exports = bannerController;