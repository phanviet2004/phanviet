const db = require("../config/db");
const ExcelJS = require("exceljs");

// 1. LẤY TẤT CẢ DANH MỤC (Nối với bảng HinhAnh)
exports.getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;
    // Dùng LEFT JOIN + subquery để lấy ảnh và số sản phẩm của từng danh mục
    let sql = `
      SELECT 
        d.MaDM, 
        d.TenDM, 
        h.DuongDanAnh,
        COALESCE(sp.SoLuongSanPham, 0) AS SoLuongSanPham,
        CASE WHEN COALESCE(sp.SoLuongSanPham, 0) > 0 THEN 1 ELSE 0 END AS TrangThai
      FROM DANHMUC d
      LEFT JOIN HinhAnh h ON d.MaDM = h.MaThamChieu AND h.LoaiThamChieu = 'DANHMUC'
      LEFT JOIN (
        SELECT MaDM, COUNT(*) AS SoLuongSanPham
        FROM SanPham
        GROUP BY MaDM
      ) sp ON sp.MaDM = d.MaDM
    `;
    let params = [];

    if (search) {
      sql += " WHERE d.MaDM LIKE ? OR d.TenDM LIKE ?";
      params = [`%${search}%`, `%${search}%`];
    }

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh mục: " + error.message });
  }
};

// 2. XÓA DANH MỤC
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Phải xóa ảnh liên quan trong bảng HinhAnh trước (nếu không cài CASCADE trong DB)
    await db.execute(
      "DELETE FROM HinhAnh WHERE LoaiThamChieu = 'DANHMUC' AND MaThamChieu = ?",
      [id],
    );

    // Sau đó mới xóa Danh mục
    await db.execute("DELETE FROM DANHMUC WHERE MaDM = ?", [id]);

    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi xóa danh mục: " + error.message });
  }
};

// 3. THÊM DANH MỤC
exports.createCategory = async (req, res) => {
  try {
    const { MaDM, TenDM, DuongDanAnh } = req.body;

    // Bước 1: Thêm vào bảng DANHMUC
    const sqlDanhMuc = "INSERT INTO DANHMUC (MaDM, TenDM) VALUES (?, ?)";
    await db.execute(sqlDanhMuc, [MaDM, TenDM]);

    // Bước 2: Nếu có ảnh, thêm vào bảng HinhAnh
    if (DuongDanAnh) {
      const sqlHinhAnh = `
            INSERT INTO HinhAnh (LoaiThamChieu, MaThamChieu, DuongDanAnh, LaAnhChinh) 
            VALUES ('DANHMUC', ?, ?, 1)
        `;
      await db.execute(sqlHinhAnh, [MaDM, DuongDanAnh]);
    }

    res.status(201).json({ message: "Thêm thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi SQL: " + error.message });
  }
};

// 4. CẬP NHẬT DANH MỤC
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenDM, DuongDanAnh } = req.body;

    // Bước 1: Cập nhật tên danh mục trong bảng DANHMUC
    const sqlDanhMuc = "UPDATE DANHMUC SET TenDM = ? WHERE MaDM = ?";
    await db.execute(sqlDanhMuc, [TenDM, id]);

    // Bước 2: Cập nhật ảnh trong bảng HinhAnh
    // Cách an toàn nhất: Xóa ảnh cũ của danh mục này đi, rồi chèn ảnh mới vào (nếu có)
    if (req.body.hasOwnProperty("DuongDanAnh")) {
      await db.execute(
        "DELETE FROM HinhAnh WHERE LoaiThamChieu = 'DANHMUC' AND MaThamChieu = ?",
        [id],
      );

      if (DuongDanAnh) {
        const sqlHinhAnh = `
                INSERT INTO HinhAnh (LoaiThamChieu, MaThamChieu, DuongDanAnh, LaAnhChinh) 
                VALUES ('DANHMUC', ?, ?, 1)
            `;
        await db.execute(sqlHinhAnh, [id, DuongDanAnh]);
      }
    }

    res.json({ message: "Cập nhật thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi cập nhật: " + error.message });
  }
};

// 5. XUẤT FILE EXCEL
exports.exportCategoryExcel = async (req, res) => {
  try {
    // Cũng phải JOIN bảng để lấy đường dẫn ảnh đưa vào file Excel
    const sql = `
      SELECT d.MaDM, d.TenDM, h.DuongDanAnh 
      FROM DANHMUC d
      LEFT JOIN HinhAnh h ON d.MaDM = h.MaThamChieu AND h.LoaiThamChieu = 'DANHMUC'
    `;
    const [rows] = await db.execute(sql);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Danh_Muc_San_Pham");

    // Tạo cột cho file Excel
    worksheet.columns = [
      { header: "Mã Danh Mục", key: "MaDM", width: 15 },
      { header: "Tên Danh Mục", key: "TenDM", width: 30 },
      { header: "Ảnh Danh Mục", key: "DuongDanAnh", width: 50 },
    ];

    // Đổ style cho header (Tô màu vàng cho đẹp)
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1C40F" }, // Màu vàng Hamoni
    };

    // Thêm dữ liệu vào
    worksheet.addRows(rows);

    // Cấu hình header để trình duyệt tự động tải file về
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=DanhMuc_Hamoni.xlsx",
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: "Lỗi xuất file: " + error.message });
  }
};