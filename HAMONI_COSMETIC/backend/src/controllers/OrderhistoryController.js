const db = require('../config/db');

exports.getMyOrderHistory = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }

    const page = Math.max(1, Number(req.query?.page) || 1);
    const limit = Math.max(1, Number(req.query?.limit) || 5);
    const offset = (page - 1) * limit;
    const year = Number(req.query?.year);
    const hasYearFilter = Number.isInteger(year) && year > 0;
    const yearClause = hasYearFilter ? 'AND YEAR(dh.NgayDat) = ?' : '';
    const queryParams = hasYearFilter ? [userId, year] : [userId];

    const [[countRow]] = await db.execute(`
      SELECT COUNT(*) AS totalItems
      FROM DonHang dh
      WHERE dh.MaND = ?
      ${yearClause}
    `, queryParams);

    const totalItems = Number(countRow?.totalItems || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));

    const [rows] = await db.query(`
      SELECT
        dh.MaDH AS id,
        dh.NgayDat AS ngayDat,
        dh.TrangThai AS trangThai,
        dh.ThanhTien AS tongTien,
        (
          SELECT COALESCE(SUM(ct.SoLuong), 0)
          FROM ChiTietDonHang ct
          WHERE ct.MaDH = dh.MaDH
        ) AS tongSanPham
      FROM DonHang dh
      WHERE dh.MaND = ?
      ${yearClause}
      ORDER BY dh.NgayDat DESC, dh.MaDH DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    return res.json({
      data: rows.map((row) => ({
        id: Number(row.id),
        ngayDat: row.ngayDat,
        trangThai: row.trangThai,
        tongTien: Number(row.tongTien || 0),
        tongSanPham: Number(row.tongSanPham || 0)
      })),
      pagination: {
        currentPage: page,
        limit,
        totalItems,
        totalPages
      }
    });
  } catch (err) {
    console.error('Lỗi getMyOrderHistory:', err);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};
