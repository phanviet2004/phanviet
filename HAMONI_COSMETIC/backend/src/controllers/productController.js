// src/controllers/productController.js
const db = require("../config/db");

const getAllProducts = async (req, res) => {
  try {
    // 1. Nhận tham số từ Frontend gửi lên (có giá trị mặc định nếu rỗng)
    const search = req.query.search || "";
    const category = req.query.category || "all";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const offset = (page - 1) * limit;

    // 2. Khởi tạo câu truy vấn gốc (Bổ sung lấy full thông tin chi tiết)
    let query = `SELECT MaSP, MaDM, TenSP, MoTa, ThanhPhan, CachSuDung, LoaiDaPhuHop, NgayTao FROM SanPham WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM SanPham WHERE 1=1`;
    let queryParams = [];

    // 3. Lắp ráp điều kiện LỌC THEO DANH MỤC
    if (category !== "all") {
      query += ` AND MaDM = ?`;
      countQuery += ` AND MaDM = ?`;
      queryParams.push(category);
    }

    // 4. Lắp ráp điều kiện TÌM KIẾM
    if (search) {
      query += ` AND (TenSP LIKE ? OR MaSP LIKE ? OR ThanhPhan LIKE ?)`;
      countQuery += ` AND (TenSP LIKE ? OR MaSP LIKE ? OR ThanhPhan LIKE ?)`;
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    // 5. Thêm lệnh sắp xếp và Phân trang (LIMIT, OFFSET)
    query += ` ORDER BY NgayTao DESC LIMIT ${limit} OFFSET ${offset}`;

    // 6. Thực thi truy vấn lấy Sản phẩm
    const [dataResult, countResult] = await Promise.all([
      db.execute(query, queryParams),
      db.execute(countQuery, queryParams),
    ]);

    let products = dataResult[0];
    const totalRecords = countResult[0][0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // =================================================================
    // 7. LẤY THÔNG TIN BIẾN THỂ & GIÁ ĐỂ GHÉP VÀO SẢN PHẨM
    // =================================================================
    if (products.length > 0) {
      // Lấy ra danh sách các MaSP của trang hiện tại (hoặc của tất cả nếu export excel)
      const productIds = products.map((p) => p.MaSP);

      // Tạo chuỗi dấu ? tương ứng với số lượng ID (VD: ?,?,?)
      const placeholders = productIds.map(() => "?").join(",");

      const variantQuery = `SELECT MaBienThe, MaSP, TenBienThe, Gia FROM BienTheSanPham WHERE MaSP IN (${placeholders})`;

      const [variantsResult] = await db.execute(variantQuery, productIds);
      const variants = variantsResult;

      // Nhóm các biến thể theo MaSP
      const variantsByProduct = {};
      variants.forEach((variant) => {
        if (!variantsByProduct[variant.MaSP]) {
          variantsByProduct[variant.MaSP] = [];
        }
        variantsByProduct[variant.MaSP].push({
          MaBienThe: variant.MaBienThe,
          TenBienThe: variant.TenBienThe,
          Gia: variant.Gia,
        });
      });

      // Gắn mảng BienThe vào từng sản phẩm
      products = products.map((p) => ({
        ...p,
        BienThe: variantsByProduct[p.MaSP] || [], // Nếu không có biến thể thì mảng rỗng
      }));
    }

    // 8. Trả kết quả về cho React
    res.status(200).json({
      data: products,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    res.status(500).json({ message: "Lỗi hệ thống khi tải dữ liệu!" });
  }
};

module.exports = { getAllProducts };
