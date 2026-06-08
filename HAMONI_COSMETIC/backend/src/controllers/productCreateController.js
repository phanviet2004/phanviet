// src/controllers/productCreateController.js
const db = require('../config/db');

const createProduct = async (req, res) => {
    // 1. Nhận "cục Data" từ Frontend gửi lên
    const { productInfo, images, variants } = req.body;

    // Kiểm tra dữ liệu cơ bản
    if (!productInfo || !productInfo.TenSP || !productInfo.MaDM) {
        return res.status(400).json({ message: "Thiếu tên sản phẩm hoặc danh mục!" });
    }

    // Lấy một kết nối riêng từ Pool để chạy Transaction
    const connection = await db.getConnection();

    try {
        // KIỂM TRA TRÙNG TÊN SẢN PHẨM TRƯỚC KHI TẠO
        const [existingProduct] = await connection.execute(
            `SELECT MaSP FROM SanPham WHERE TenSP = ?`,
            [productInfo.TenSP.trim()]
        );

        if (existingProduct.length > 0) {
            connection.release(); // Trả lại connection nếu return sớm
            return res.status(400).json({ message: "Tên sản phẩm này đã tồn tại. Vui lòng đặt tên khác!" });
        }

        // BẮT ĐẦU TRANSACTION
        await connection.beginTransaction();

        // ==========================================
        // BƯỚC 1: LƯU THÔNG TIN SẢN PHẨM CHÍNH
        // ==========================================
        const [productResult] = await connection.execute(
            `INSERT INTO SanPham (MaDM, TenSP, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                productInfo.MaDM, 
                productInfo.TenSP.trim(), // Trim khoảng trắng thừa để an toàn
                productInfo.MoTa || null, 
                productInfo.ThanhPhan || null, 
                productInfo.CachSuDung || null, 
                productInfo.LoaiDaPhuHop || null
            ]
        );
        
        // Lấy ID của sản phẩm vừa được tạo thành công
        const newProductId = productResult.insertId;

        // ==========================================
        // BƯỚC 2: LƯU DANH SÁCH HÌNH ẢNH (Nếu có)
        // ==========================================
        if (images && images.length > 0) {
            for (let i = 0; i < images.length; i++) {
                const duongDanAnh = images[i];
                // Ảnh đầu tiên (i = 0) sẽ được set làm ảnh chính (LaAnhChinh = 1)
                const laAnhChinh = (i === 0) ? 1 : 0; 

                await connection.execute(
                    `INSERT INTO HinhAnh (LoaiThamChieu, MaThamChieu, DuongDanAnh, LaAnhChinh) 
                     VALUES ('SanPham', ?, ?, ?)`,
                    [newProductId, duongDanAnh, laAnhChinh]
                );
            }
        }

        // ==========================================
        // BƯỚC 3: LƯU DANH SÁCH BIẾN THỂ (Nếu có)
        // ==========================================
        if (variants && variants.length > 0) {
            for (let variant of variants) {
                await connection.execute(
                    `INSERT INTO BienTheSanPham (MaSP, TenBienThe, Gia) 
                     VALUES (?, ?, ?)`,
                    [newProductId, variant.TenBienThe, variant.Gia]
                );
            }
        }

        // LƯU THÀNH CÔNG TẤT CẢ -> CHỐT DỮ LIỆU VÀO DB
        await connection.commit();
        res.status(201).json({ 
            message: "Tạo sản phẩm mới thành công!", 
            MaSP: newProductId 
        });

    } catch (error) {
        // NẾU CÓ BẤT KỲ LỖI NÀO XẢY RA -> HỦY BỎ TẤT CẢ LỆNH INSERT TRƯỚC ĐÓ
        await connection.rollback();
        console.error("❌ Lỗi khi tạo sản phẩm:", error);
        res.status(500).json({ message: "Lỗi Server khi tạo sản phẩm!" });
    } finally {
        // Trả kết nối lại cho hệ thống
        connection.release();
    }
};

module.exports = {
    createProduct
};