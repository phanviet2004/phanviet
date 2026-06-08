// controllers/dashboardController.js
const db = require("../config/db");
const ExcelJS = require("exceljs");

// ===== BUILD FILTER (ĐÃ FIX TRIỆT ĐỂ LỖI TÌM KIẾM SỐ) =====
const buildFilter = (query) => {
  let where = "WHERE d.NgayDat IS NOT NULL";
  const params = [];

  if (query.keyword) {
    const kwRaw = query.keyword.trim();
    const kwLike = `%${kwRaw}%`;

    // Kiểm tra nếu keyword là số thuần túy
    const isNumber = /^\d+$/.test(kwRaw);

    if (isNumber) {
      // FIX: Khi nhập số, CHỈ tìm đích danh Mã đơn hàng.
      // Không tìm LIKE ở Tên khách hay Sản phẩm để tránh bị dính số "5" trong "B5"
      where += ` AND d.MaDH = ?`;
      params.push(kwRaw);
    } else {
      // Khi nhập chữ: Tìm gần đúng trên tên Khách hàng hoặc Sản phẩm
      where += ` AND (
        n.HoTen LIKE ?
        OR sp.TenSP LIKE ?
      )`;
      params.push(kwLike, kwLike);
    }
  }

  // 2. FILTER DROPDOWN
  if (query.sanPham && query.sanPham !== "all") {
    where += " AND sp.MaSP = ?";
    params.push(query.sanPham);
  }

  if (query.khachHang && query.khachHang !== "all") {
    where += " AND n.MaND = ?";
    params.push(query.khachHang);
  }

  // 3. FILTER DATE
  if (query.tuNgay) {
    where += " AND DATE(d.NgayDat) >= ?";
    params.push(query.tuNgay);
  }

  if (query.denNgay) {
    where += " AND DATE(d.NgayDat) <= ?";
    params.push(query.denNgay);
  }

  return { where, params };
};

// ===== 1️⃣ FILTER DROPDOWN =====
exports.getFilters = async (req, res) => {
  try {
    const [sanPhams] = await db.query("SELECT MaSP, TenSP FROM SanPham");

    // ĐÃ FIX: Thêm điều kiện WHERE MaQuyen = 'CUST' để chỉ lấy đúng Khách hàng
    const [khachHangs] = await db.query(
      "SELECT MaND, HoTen FROM NguoiDung WHERE MaQuyen = 'CUST'",
    );

    res.json({ sanPhams, khachHangs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi filters" });
  }
};

// ===== 2️⃣ OVERVIEW =====
exports.getOverview = async (req, res) => {
  try {
    const type = req.query.type || "search";

    let where = "";
    let params = [];

    if (type === "reset") {
      where = "WHERE d.NgayDat IS NOT NULL";
    } else {
      ({ where, params } = buildFilter(req.query));
    }

    const [rows] = await db.query(
      `
      SELECT d.MaDH, d.NgayDat, n.HoTen AS KhachHang,
             sp.TenSP AS SanPham,
             ct.SoLuong,
             ct.DonGia AS GiaBan,
             (ct.SoLuong * ct.DonGia) AS DoanhThu
      FROM DonHang d
      JOIN NguoiDung n ON d.MaND = n.MaND
      JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      JOIN SanPham sp ON bt.MaSP = sp.MaSP
      ${where}
      ORDER BY d.NgayDat DESC
    `,
      params,
    );

    // ===== CALCULATE =====
    let tongSL = 0;
    const revenueByOrder = {};

    rows.forEach((r) => {
      tongSL += Number(r.SoLuong);

      if (!revenueByOrder[r.MaDH]) {
        revenueByOrder[r.MaDH] = 0;
      }

      revenueByOrder[r.MaDH] += Number(r.DoanhThu);
    });

    const tongDT = Object.values(revenueByOrder).reduce((a, b) => a + b, 0);
    const tongDon = Object.keys(revenueByOrder).length;
    const trungBinhDon = tongDon ? tongDT / tongDon : 0;

    res.json({
      stats: {
        tongDon,
        tongSoLuong: tongSL,
        tongDoanhThu: tongDT,
        trungBinhDon,
      },
      orders: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi overview" });
  }
};

// ===== 3️⃣ CHART =====
exports.getCharts = async (req, res) => {
  try {
    const { where, params } = buildFilter(req.query);

    const tuNgay = req.query.tuNgay;
    const denNgay = req.query.denNgay;
    let isDailyView = false;

    if (tuNgay && denNgay) {
      const start = new Date(tuNgay);
      const end = new Date(denNgay);
      const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
      if (diffDays <= 31) {
        isDailyView = true;
      }
    }

    const timeGroup = isDailyView
      ? "DATE_FORMAT(d.NgayDat, '%Y-%m-%d')"
      : "MONTH(d.NgayDat)";

    const sqlRevenue = `
      SELECT ${timeGroup} AS timeKey, IFNULL(SUM(ct.SoLuong * ct.DonGia), 0) AS revenue
      FROM DonHang d
      INNER JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      INNER JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      INNER JOIN SanPham sp ON bt.MaSP = sp.MaSP
      LEFT JOIN NguoiDung n ON d.MaND = n.MaND
      ${where}
      GROUP BY ${timeGroup}
      ORDER BY timeKey ASC
    `;

    const sqlOrders = `
      SELECT ${timeGroup} AS timeKey, COUNT(DISTINCT d.MaDH) AS orders
      FROM DonHang d
      INNER JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      INNER JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      INNER JOIN SanPham sp ON bt.MaSP = sp.MaSP
      LEFT JOIN NguoiDung n ON d.MaND = n.MaND
      ${where}
      GROUP BY ${timeGroup}
      ORDER BY timeKey ASC
    `;

    const [revenueRows] = await db.query(sqlRevenue, params);
    const [orderRows] = await db.query(sqlOrders, params);

    const chartData = [];

    if (isDailyView) {
      let curr = new Date(tuNgay);
      let end = new Date(denNgay);

      while (curr <= end) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, "0");
        const dd = String(curr.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const display = `${dd}/${mm}`;

        const rev =
          revenueRows.find((r) => r.timeKey === dateStr)?.revenue || 0;
        const ord = orderRows.find((r) => r.timeKey === dateStr)?.orders || 0;

        chartData.push({
          month: display,
          revenue: Number(rev),
          orders: Number(ord),
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      for (let i = 1; i <= 12; i++) {
        const revRow = revenueRows.find((r) => Number(r.timeKey) === i);
        const ordRow = orderRows.find((r) => Number(r.timeKey) === i);

        chartData.push({
          month: `Tháng ${i}`,
          revenue: Number(revRow?.revenue || 0),
          orders: Number(ordRow?.orders || 0),
        });
      }
    }

    res.json({ chartData });
  } catch (err) {
    console.error("Lỗi chart:", err);
    res.status(500).json({ message: "Lỗi tạo dữ liệu biểu đồ" });
  }
};

// ===== 4️⃣ EXPORT EXCEL =====
exports.exportExcel = async (req, res) => {
  try {
    const { where, params } = buildFilter(req.query);

    const [rows] = await db.query(
      `
      SELECT d.MaDH, d.NgayDat, n.HoTen AS KhachHang,
             sp.TenSP AS SanPham,
             ct.SoLuong,
             ct.DonGia,
             (ct.SoLuong * ct.DonGia) AS DoanhThu
      FROM DonHang d
      JOIN NguoiDung n ON d.MaND = n.MaND
      JOIN ChiTietDonHang ct ON d.MaDH = ct.MaDH
      JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      JOIN SanPham sp ON bt.MaSP = sp.MaSP
      ${where}
    `,
      params,
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("BaoCao");

    sheet.columns = [
      { header: "Mã đơn", key: "MaDH", width: 15 },
      { header: "Ngày", key: "NgayDat", width: 20 },
      { header: "Khách hàng", key: "KhachHang", width: 25 },
      { header: "Sản phẩm", key: "SanPham", width: 25 },
      { header: "Số lượng", key: "SoLuong", width: 10 },
      { header: "Giá", key: "DonGia", width: 15 },
      { header: "Doanh thu", key: "DoanhThu", width: 20 },
    ];

    rows.forEach((r) => {
      sheet.addRow({
        ...r,
        NgayDat: new Date(r.NgayDat).toLocaleDateString("vi-VN"),
      });
    });

    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", "attachment; filename=baocao.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi export Excel" });
  }
};
