const db = require('../config/db');

exports.getDashboard = async (req, res) => {
    try {
        // ===== STATS =====
        const [[totalProducts]] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM (
                SELECT tk.MaBienThe
                FROM TonKho tk
                GROUP BY tk.MaBienThe
            ) AS unique_variants
        `);

        const [[outOfStock]] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM (
                SELECT tk.MaBienThe
                FROM TonKho tk
                GROUP BY tk.MaBienThe
                HAVING SUM(tk.SoLuongTon) < 10
            ) AS zero_stock_variants
        `);

        // ===== PRODUCTS =====
        const [products] = await db.execute(`
            SELECT 
                bt.MaBienThe AS id,
                sp.TenSP AS tenSanPham,
                bt.TenBienThe AS tenBienThe,
                CONCAT(sp.TenSP, ' - ', bt.TenBienThe) AS ten,
                SUM(tk.SoLuongTon) AS soLuong,

                -- biến động gần nhất
                (
                    SELECT SoLuongThayDoi 
                    FROM LogTonKho l 
                    WHERE l.MaBienThe = bt.MaBienThe
                    ORDER BY l.NgayTao DESC
                    LIMIT 1
                ) AS bienDong,

                -- thời gian gần nhất
                (
                    SELECT NgayTao 
                    FROM LogTonKho l 
                    WHERE l.MaBienThe = bt.MaBienThe
                    ORDER BY l.NgayTao DESC
                    LIMIT 1
                ) AS thoiGian
            FROM TonKho tk
            JOIN BienTheSanPham bt ON tk.MaBienThe = bt.MaBienThe
            JOIN SanPham sp ON bt.MaSP = sp.MaSP
            GROUP BY bt.MaBienThe, sp.TenSP, bt.TenBienThe
            ORDER BY bt.MaBienThe DESC
        `);
const [[lastLog]] = await db.execute(`
    SELECT NgayTao 
    FROM LogTonKho
    ORDER BY NgayTao DESC
    LIMIT 1
`);
        // ===== LOG =====
        const [logs] = await db.execute(`
            SELECT 
                l.LoaiGiaoDich,
                l.SoLuongThayDoi,
                l.GhiChu,
                sp.TenSP,
                l.NgayTao AS thoiGian
            FROM LogTonKho l
            JOIN BienTheSanPham bt ON l.MaBienThe = bt.MaBienThe
            JOIN SanPham sp ON bt.MaSP = sp.MaSP
            ORDER BY l.NgayTao DESC
            LIMIT 100
        `);

        res.json({
   stats: {
    totalProducts: totalProducts.total,
    processing: 0,
    outOfStock: outOfStock.total,
    lastUpdate: lastLog?.NgayTao || null   // 🔥 chuẩn hơn
},

    products: products.map(p => ({
        ...p,

        // trạng thái
        trangThai:
            p.soLuong === 0 ? 'HET_HANG' :
            p.soLuong < 10 ? 'SAP_HET' :
            'SAN_SANG',

        // 🔥 THÊM 2 DÒNG NÀY
        bienDong: p.bienDong ?? 0,
        thoiGian: p.thoiGian ?? null
    })),

    logs
});

    } catch (err) {
        console.error("🔥 warehouse error:", err);
        res.status(500).json({ message: "Lỗi server" });
    }
};
