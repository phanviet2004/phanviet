const db = require('../config/db');

const shoppingcartController = {

    // 1. LẤY GIỎ HÀNG
    getCartItems: async (req, res) => {
        try {
            const maKhachHang = req.user?.maND || req.params.maKhachHang || req.query.maKhachHang;
            if (!maKhachHang) {
                return res.status(400).json({ success: false, message: "Thiếu mã khách hàng" });
            }
            const query = `
                SELECT 
                    gh.MaND, gh.MaBienThe, gh.SoLuong, gh.IsSelected,
                    bt.TenBienThe,
                    COALESCE(
                        (
                            SELECT MIN(
                                CASE
                                    WHEN km2.LoaiGiamGia = 'PhanTram' THEN GREATEST(0, bt.Gia - (bt.Gia * km2.GiaTriGiam / 100))
                                    WHEN km2.LoaiGiamGia = 'SoTien' THEN GREATEST(0, bt.Gia - km2.GiaTriGiam)
                                    ELSE bt.Gia
                                END
                            )
                            FROM SanPham_KhuyenMai spkm2
                            JOIN ChuongTrinhKhuyenMai km2 ON km2.MaCTKM = spkm2.MaCTKM
                            WHERE spkm2.MaBienThe = bt.MaBienThe
                              AND NOW() BETWEEN km2.NgayBatDau AND km2.NgayKetThuc
                        ),
                        bt.Gia
                    ) AS Gia,
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM SanPham_KhuyenMai spkm3
                            JOIN ChuongTrinhKhuyenMai km3 ON km3.MaCTKM = spkm3.MaCTKM
                            WHERE spkm3.MaBienThe = bt.MaBienThe
                              AND NOW() BETWEEN km3.NgayBatDau AND km3.NgayKetThuc
                        )
                        THEN bt.Gia
                        ELSE NULL
                    END AS GiaGoc,
                    tk.SoLuongTon,
                    sp.TenSP, 
                    h.DuongDanAnh
                FROM (
                    SELECT
                        MaND,
                        MaBienThe,
                        SUM(SoLuong) AS SoLuong,
                        MAX(COALESCE(IsSelected, 1)) AS IsSelected
                    FROM GioHang
                    WHERE MaND = ?
                    GROUP BY MaND, MaBienThe
                ) gh
                JOIN BienTheSanPham bt ON gh.MaBienThe = bt.MaBienThe
                JOIN SanPham sp ON bt.MaSP = sp.MaSP
                LEFT JOIN TonKho tk ON bt.MaBienThe = tk.MaBienThe
                LEFT JOIN (
                    SELECT
                        MaThamChieu,
                        COALESCE(
                            MAX(CASE WHEN LaAnhChinh = 1 THEN DuongDanAnh END),
                            MIN(DuongDanAnh)
                        ) AS DuongDanAnh
                    FROM HinhAnh
                    GROUP BY MaThamChieu
                ) h ON h.MaThamChieu = sp.MaSP
            `;
            const [rows] = await db.query(query, [maKhachHang]);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error("❌ Lỗi GetCart:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        }
    },

    // 2. THÊM SẢN PHẨM VÀO GIỎ
    addToCart: async (req, res) => {
        const conn = await db.getConnection();
        try {
            const { maKhachHang, maBienThe, soLuong } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            if (!maBienThe || !soLuong || Number(soLuong) <= 0) {
                return res.status(400).json({ success: false, message: "Dữ liệu thêm giỏ hàng không hợp lệ" });
            }

            await conn.beginTransaction();

            const [stock] = await conn.query(`SELECT SoLuongTon FROM TonKho WHERE MaBienThe = ? FOR UPDATE`, [maBienThe]);

            if (stock.length === 0) return res.status(404).json({ success: false, message: "Sản phẩm không tồn tại" });

            const [check] = await conn.query(
`SELECT COALESCE(SUM(SoLuong), 0) AS SoLuongTrongGio, COALESCE(MAX(IsSelected), 1) AS IsSelected
                 FROM GioHang WHERE MaND = ? AND MaBienThe = ? FOR UPDATE`,
                [targetMaND, maBienThe]
            );
            const soLuongTrongGio = Number(check?.[0]?.SoLuongTrongGio || 0);
            const isSelected = Number(check?.[0]?.IsSelected ?? 1);
            const soLuongMoi = soLuongTrongGio + Number(soLuong);
            
            const soLuongTonKho = Number(stock[0].SoLuongTon || 0);

            if (soLuongMoi > soLuongTonKho) {
                await conn.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message:
                        `Bạn đã có ${soLuongTrongGio} sản phẩm trong giỏ hàng. ` +
                        `Không thể thêm số lượng đã chọn vào giỏ hàng vì sẽ vượt quá giới hạn mua hàng của bạn.`
                });
            }

            await conn.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            await conn.query(
                `INSERT INTO GioHang (MaND, MaBienThe, SoLuong, IsSelected) VALUES (?, ?, ?, ?)`,
                [targetMaND, maBienThe, soLuongMoi, isSelected]
            );

            await conn.commit();
            res.json({ success: true, message: "Đã thêm vào giỏ" });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
        } finally {
            if (conn) conn.release();
        }
    },

    // 3. CẬP NHẬT GIỎ HÀNG
    updateCartItem: async (req, res) => {
        const conn = await db.getConnection();
        try {
            const { maKhachHang, maBienThe, soLuong, isSelected } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            if (!maBienThe || !soLuong || Number(soLuong) <= 0) {
                return res.status(400).json({ success: false, message: "Dữ liệu cập nhật giỏ hàng không hợp lệ" });
            }

            await conn.beginTransaction();
            const [stock] = await conn.query(`SELECT SoLuongTon FROM TonKho WHERE MaBienThe = ? FOR UPDATE`, [maBienThe]);

            const soLuongTonKho = Number(stock?.[0]?.SoLuongTon || 0);

            if (stock.length > 0 && Number(soLuong) > soLuongTonKho) {
                await conn.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Không thể cập nhật giỏ hàng vì số lượng đã chọn vượt quá tồn kho hiện tại (tối đa ${soLuongTonKho} sản phẩm).`
                });
            }

            await conn.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            await conn.query(
                `INSERT INTO GioHang (MaND, MaBienThe, SoLuong, IsSelected) VALUES (?, ?, ?, ?)`,
                [targetMaND, maBienThe, Number(soLuong), Number(isSelected) === 1 ? 1 : 0]
            );

            await conn.commit();
            res.json({ success: true });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
} finally {
            if (conn) conn.release();
        }
    },

    // 4. XÓA SẢN PHẨM
    removeCartItem: async (req, res) => {
        try {
            const { maKhachHang, maBienThe } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }
            await db.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    },

    // 5. GIỮ HÀNG (CHỈ KIỂM TRA TẠM, KHÔNG TRỪ KHO)
    // 5. GIỮ HÀNG (TẠM GIỮ CÓ THỜI HẠN)
    holdStockFromCart: async (req, res) => {
        const conn = await db.getConnection(); 
        try {
            await conn.beginTransaction();
            const maKhachHang = req.body.maKhachHang || req.user?.maND;
            
            if (!maKhachHang) {
                await conn.rollback();
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }

            // 1. Dọn dẹp hàng kẹt: Xóa các lượt giữ hàng đã quá hạn của TOÀN HỆ THỐNG
            await conn.query(`DELETE FROM GiuHangTam WHERE ThoiGianHetHan < NOW()`);

            // 2. Lấy thông tin các sản phẩm trong giỏ đang được chọn
            const [items] = await conn.query(`
                SELECT gh.MaBienThe, gh.SoLuong, tk.SoLuongTon, sp.TenSP
                FROM GioHang gh
                JOIN TonKho tk ON gh.MaBienThe = tk.MaBienThe
                JOIN BienTheSanPham bt ON gh.MaBienThe = bt.MaBienThe
                JOIN SanPham sp ON bt.MaSP = sp.MaSP
                WHERE gh.MaND = ? AND gh.IsSelected = 1
                FOR UPDATE
            `, [maKhachHang]);

            if (items.length === 0) {
                await conn.rollback();
                return res.status(400).json({ success: false, message: "Chưa chọn sản phẩm" });
            }

            // 3. Kiểm tra xem kho còn đủ không (tính cả lượng người KHÁC đang tạm giữ)
            for (let item of items) {
                const [holdData] = await conn.query(`
                    SELECT COALESCE(SUM(SoLuong), 0) AS DangGiu 
                    FROM GiuHangTam 
                    WHERE MaBienThe = ? AND MaND != ?
                `, [item.MaBienThe, maKhachHang]);
                
                const soLuongNguoiKhacGiu = holdData[0].DangGiu;
                const tonKhoKhaDung = item.SoLuongTon - soLuongNguoiKhacGiu;

                if (item.SoLuong > tonKhoKhaDung) {
                    await conn.rollback();
                    return res.status(400).json({ 
                        success: false, 
                        message: `Sản phẩm "${item.TenSP}" hiện đang có người khác thao tác thanh toán. Chỉ còn ${Math.max(0, tonKhoKhaDung)} sản phẩm khả dụng.` 
                    });
                }
            }

            // 4. Nếu kho đủ -> Ghi nhận phiên giữ hàng cho User này (Thời hạn giữ: 15 phút)
            for (let item of items) {
                await conn.query(`
                    INSERT INTO GiuHangTam (MaND, MaBienThe, SoLuong, ThoiGianHetHan) 
                    VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
                    ON DUPLICATE KEY UPDATE 
                        SoLuong = VALUES(SoLuong), 
                        ThoiGianHetHan = VALUES(ThoiGianHetHan)
                `, [maKhachHang, item.MaBienThe, item.SoLuong]);
            }

            await conn.commit();
            res.json({ success: true, message: "Đã giữ tạm sản phẩm, vui lòng thanh toán trong 15 phút" });
            
        } catch (error) {
            if (conn) await conn.rollback();
            console.error("Lỗi holdStockFromCart:", error);
            res.status(500).json({ success: false, message: "Lỗi hệ thống khi tạm giữ hàng" });
        } finally {
            if (conn) conn.release();
        }
    },
// THÊM VÀO shoppingcartController
    // 7. NHẢ HÀNG TẠM GIỮ (Khi rời khỏi trang checkout)
    releaseHold: async (req, res) => {
        try {
            const maKhachHang = req.body.maKhachHang || req.user?.maND;
            if (!maKhachHang) return res.status(401).json({ success: false });

            // Xóa phiên giữ hàng của User này
            await db.query(`DELETE FROM GiuHangTam WHERE MaND = ?`, [maKhachHang]);
            res.json({ success: true, message: "Đã nhả hàng thành công" });
        } catch (error) {
            res.status(500).json({ success: false });
        }
    },
    

    // 6. CHUYỂN SANG MỤC YÊU THÍCH
    moveToWishlist: async (req, res) => {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const { maKhachHang, items } = req.body;
            const targetMaND = maKhachHang || req.user?.maND;
            if (!targetMaND) {
                await conn.rollback();
                return res.status(401).json({ success: false, message: "Vui lòng đăng nhập" });
            }

            if (!items || items.length === 0) {
                await conn.rollback();
return res.status(400).json({ success: false });
            }

            for (let maBienThe of items) {
                await conn.query(`INSERT IGNORE INTO DanhSachYeuThich (MaND, MaBienThe) VALUES (?, ?)`, [targetMaND, maBienThe]);
                await conn.query(`DELETE FROM GioHang WHERE MaND = ? AND MaBienThe = ?`, [targetMaND, maBienThe]);
            }

            await conn.commit();
            res.json({ success: true });
        } catch (error) {
            if (conn) await conn.rollback();
            res.status(500).json({ success: false });
        } finally {
            if (conn) conn.release();
        }
    }
    
};


module.exports = shoppingcartController;