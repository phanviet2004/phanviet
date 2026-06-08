const db = require("../config/db");

// ===== GET PRODUCTS =====
exports.getProducts = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                bt.MaBienThe,
                sp.TenSP,
                bt.TenBienThe,
                bt.Gia
            FROM BienTheSanPham bt
            JOIN SanPham sp ON bt.MaSP = sp.MaSP
        `);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ===== GET STOCK =====
exports.getStock = async (req, res) => {
    try {
        const { id } = req.params;

        const [[row]] = await db.query(`
            SELECT COALESCE(SUM(SoLuongTon), 0) AS SoLuongTon
            FROM TonKho 
            WHERE MaBienThe = ?
        `, [id]);

        res.json(row || { SoLuongTon: 0 });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ===== INBOUND =====
exports.createInbound = async (req, res) => {
    const conn = await db.getConnection();

    try {
        const { items, GhiChu } = req.body;

        if (!items || items.length === 0) {
            throw new Error("Không có sản phẩm");
        }

        await conn.beginTransaction();

        for (const i of items) {
            const { MaBienThe, SoLuong, GiaNhap } = i;

            // update tồn
            await conn.query(`
                INSERT INTO TonKho (MaKho, MaBienThe, SoLuongTon)
                VALUES (1, ?, ?)
                ON DUPLICATE KEY UPDATE SoLuongTon = SoLuongTon + ?
            `, [MaBienThe, SoLuong, SoLuong]);

            // lấy tồn mới
            const [[stock]] = await conn.query(`
                SELECT COALESCE(SUM(SoLuongTon), 0) AS SoLuongTon
                FROM TonKho
                WHERE MaBienThe = ?
            `, [MaBienThe]);

            // log
            await conn.query(`
                INSERT INTO LogTonKho 
                (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, GhiChu)
                VALUES (?, 'NHAP', ?, ?, ?)
            `, [MaBienThe, SoLuong, stock.SoLuongTon, GhiChu]);
        }

        await conn.commit();

        res.json({ message: "Nhập kho thành công" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};

// ===== OUTBOUND =====
exports.createOutbound = async (req, res) => {
    const conn = await db.getConnection();

    try {
        const { items, GhiChu } = req.body;

        if (!items || items.length === 0) {
            throw new Error("Không có sản phẩm");
        }

        await conn.beginTransaction();

        for (const i of items) {
            const { MaBienThe, SoLuong } = i;

            const [stocks] = await conn.query(`
                SELECT MaKho, SoLuongTon
                FROM TonKho
                WHERE MaBienThe = ?
                ORDER BY MaKho ASC
                FOR UPDATE
            `, [MaBienThe]);

            const totalStock = stocks.reduce((sum, row) => sum + Number(row.SoLuongTon || 0), 0);

            if (totalStock < SoLuong) {
                throw new Error(`Không đủ tồn kho cho SP ${MaBienThe}`);
            }

            // trừ kho theo từng kho đến khi đủ số lượng cần xuất
            let remain = SoLuong;
            for (const stock of stocks) {
                if (remain <= 0) break;
                const available = Number(stock.SoLuongTon || 0);
                if (available <= 0) continue;

                const deduct = Math.min(available, remain);
                await conn.query(`
                    UPDATE TonKho 
                    SET SoLuongTon = SoLuongTon - ?
                    WHERE MaKho = ? AND MaBienThe = ?
                `, [deduct, stock.MaKho, MaBienThe]);
                remain -= deduct;
            }

            // log
            await conn.query(`
                INSERT INTO LogTonKho 
                (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, GhiChu)
                VALUES (?, 'XUAT', ?, ?, ?)
            `, [MaBienThe, -SoLuong, totalStock - SoLuong, GhiChu]);
        }

        await conn.commit();

        res.json({ message: "Xuất kho thành công" });

    } catch (err) {
        await conn.rollback();
        res.status(500).json({ message: err.message });
    } finally {
        conn.release();
    }
};