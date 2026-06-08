const db = require("../config/db");
const { createNotification } = require("./notificationController");

const STOCK_OUTGOING_STATUS = "DaXacNhan";
const STOCK_RETURN_STATUS = "DaHuy";

const loadOrderItems = async (conn, orderId) => {
  const [items] = await conn.execute(
    `
        SELECT MaBienThe, SoLuong
        FROM ChiTietDonHang
        WHERE MaDH = ?
    `,
    [orderId],
  );

  return items;
};

const deductOrderStock = async (conn, orderId) => {
  const items = await loadOrderItems(conn, orderId);

  for (const item of items) {
    const quantity = Number(item.SoLuong || 0);

    const [stocks] = await conn.query(
      `
            SELECT MaKho, SoLuongTon
            FROM TonKho
            WHERE MaBienThe = ?
            ORDER BY MaKho ASC
            FOR UPDATE
        `,
      [item.MaBienThe],
    );

    const totalStock = stocks.reduce(
      (sum, row) => sum + Number(row.SoLuongTon || 0),
      0,
    );

    if (totalStock < quantity) {
      throw new Error(`Không đủ tồn kho cho biến thể ${item.MaBienThe}`);
    }

    let remain = quantity;
    for (const stock of stocks) {
      if (remain <= 0) break;

      const available = Number(stock.SoLuongTon || 0);
      if (available <= 0) continue;

      const deduct = Math.min(available, remain);

      await conn.query(
        `
                UPDATE TonKho
                SET SoLuongTon = SoLuongTon - ?
                WHERE MaKho = ? AND MaBienThe = ?
            `,
        [deduct, stock.MaKho, item.MaBienThe],
      );

      remain -= deduct;
    }

    await conn.query(
      `
            INSERT INTO LogTonKho
            (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, MaThamChieu, GhiChu)
            VALUES (?, 'XUAT_DON_HANG', ?, ?, ?, 'Trừ kho khi xác nhận đơn hàng')
        `,
      [item.MaBienThe, -quantity, totalStock - quantity, orderId],
    );
  }
};

const restoreOrderStock = async (conn, orderId) => {
  const items = await loadOrderItems(conn, orderId);

  for (const item of items) {
    const quantity = Number(item.SoLuong || 0);

    const [stocks] = await conn.query(
      `
            SELECT MaKho, SoLuongTon
            FROM TonKho
            WHERE MaBienThe = ?
            ORDER BY MaKho ASC
            FOR UPDATE
        `,
      [item.MaBienThe],
    );

    const primaryStock = stocks[0];

    if (primaryStock) {
      await conn.query(
        `
                UPDATE TonKho
                SET SoLuongTon = SoLuongTon + ?
                WHERE MaKho = ? AND MaBienThe = ?
            `,
        [quantity, primaryStock.MaKho, item.MaBienThe],
      );
    } else {
      await conn.query(
        `
                INSERT INTO TonKho (MaKho, MaBienThe, SoLuongTon)
                VALUES (1, ?, ?)
            `,
        [item.MaBienThe, quantity],
      );
    }

    const [[totalRow]] = await conn.query(
      `
            SELECT COALESCE(SUM(SoLuongTon), 0) AS SoLuongTon
            FROM TonKho
            WHERE MaBienThe = ?
        `,
      [item.MaBienThe],
    );

    await conn.query(
      `
            INSERT INTO LogTonKho
            (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, MaThamChieu, GhiChu)
            VALUES (?, 'NHAP_DON_HUY', ?, ?, ?, 'Hoàn kho khi hủy đơn hàng')
        `,
      [item.MaBienThe, quantity, Number(totalRow?.SoLuongTon || 0), orderId],
    );
  }
};

const getLatestOrderStockMovement = async (conn, orderId) => {
  const [[row]] = await conn.query(
    `
        SELECT LoaiGiaoDich
        FROM LogTonKho
        WHERE MaThamChieu = ?
          AND LoaiGiaoDich IN ('XUAT_DON_HANG', 'NHAP_DON_HUY')
        ORDER BY NgayTao DESC, MaLog DESC
        LIMIT 1
    `,
    [orderId],
  );

  return row?.LoaiGiaoDich || null;
};

// ================= GET LIST =================
exports.getOrders = async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    let params = [];

    if (status && status !== "all") {
      whereClause += ` AND dh.TrangThai = ?`;
      params.push(status);
    }
    if (search) {
      whereClause += ` AND (dh.MaDH LIKE ? OR nd.HoTen LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (startDate) {
      whereClause += ` AND dh.NgayDat >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND dh.NgayDat <= ?`;
      params.push(endDate);
    }

    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM DonHang dh 
             LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND ${whereClause}`,
      params,
    );

    const limitNum = Number(req.query.limit) || 5;
    const totalItems = Number(countResult[0].total);
    const totalPages = Math.ceil(totalItems / limitNum) || 1;

    const selectQuery = `
            SELECT dh.MaDH as id, dh.NgayDat as ngayTao,
                   dh.TrangThai as trangThai,
                   dh.ThanhTien as tongTien,
                   COALESCE(dh.DaHoanTien, 0) AS daHoanTien,
                   nd.HoTen as khachHang,
                   tt.PhuongThuc as phuongThucThanhToan,
                   tt.TrangThai as trangThaiThanhToan
            FROM DonHang dh
            LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND
            LEFT JOIN (
                SELECT t.MaDH, t.PhuongThuc, t.TrangThai
                FROM ThanhToan t
                INNER JOIN (
                    SELECT MaDH, MAX(MaThanhToan) AS latestPaymentId
                    FROM ThanhToan
                    GROUP BY MaDH
                ) latest ON latest.latestPaymentId = t.MaThanhToan
            ) tt ON tt.MaDH = dh.MaDH
            ${whereClause}
            ORDER BY dh.NgayDat DESC
            LIMIT ? OFFSET ?
        `;

    const [rows] = await db.query(selectQuery, [...params, limit, offset]);

    res.json({
      data: rows,
      pagination: {
        totalItems: totalItems,
        totalPages: totalPages,
        currentPage: page,
        limit: limit,
      },
    });
  } catch (err) {
    console.error("🔥 Lỗi getOrders:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ================= GET DETAIL =================
exports.getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await db.execute(
      `
            SELECT dh.*, nd.HoTen, nd.SoDienThoai, nd.Email, nd.AvatarUrl
            FROM DonHang dh
            LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND
            WHERE dh.MaDH = ?
        `,
      [id],
    );

    if (!order) return res.status(404).json({ message: "Không tìm thấy" });

    const [items] = await db.execute(
      `
            SELECT ct.SoLuong as soLuong, 
                   ct.DonGia as giaBan,
                   sp.TenSP, 
                   sp.MaSP,
                   bt.TenBienThe,
                   COALESCE(
                       (SELECT DuongDanAnh FROM HinhAnh 
                        WHERE LoaiThamChieu = 'SanPham' AND MaThamChieu = sp.MaSP 
                        ORDER BY LaAnhChinh DESC, ThuTuHienThi ASC LIMIT 1),
                       NULL
                   ) as hinhAnh
            FROM ChiTietDonHang ct
            JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
            JOIN SanPham sp ON bt.MaSP = sp.MaSP
            WHERE ct.MaDH = ?
        `,
      [id],
    );

    const [logs] = await db.execute(
      `
            SELECT TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao
            FROM LogDonHang
            WHERE MaDH = ?
            ORDER BY NgayTao ASC
        `,
      [id],
    );

    const [[payment]] = await db.execute(
      `
            SELECT PhuongThuc, TrangThai, NgayThanhToan
            FROM ThanhToan
            WHERE MaDH = ?
            ORDER BY MaThanhToan DESC
            LIMIT 1
        `,
      [id],
    );

    const isPrinted = logs.some((l) => l.TrangThaiMoi === "DaInHoaDon");

    res.json({
      id: order.MaDH,
      ngayTao: order.NgayDat,
      trangThai: order.TrangThai,
      daHoanTien: !!order.DaHoanTien,
      khachHang: {
        hoTen: order.HoTen,
        soDienThoai: order.SoDienThoai,
        email: order.Email,
        avatarUrl: order.AvatarUrl || null,
      },
      diaChiGiaoHang: order.ThongTinGiaoHang,
      ghiChu: order.GhiChu,
      tamTinh: Number(order.TongTien),
      giamGia: Number(order.TienGiamGia || 0),
      phiShip: Number(order.PhiShip || 0),
      tongTien: Number(order.ThanhTien),
      daInHoaDon: isPrinted,
      phuongThucThanhToan: payment?.PhuongThuc || null,
      trangThaiThanhToan: payment?.TrangThai || null,
      ngayThanhToan: payment?.NgayThanhToan || null,
      chiTiet: items,
      lichSu: logs.map((l) => ({
        moTa: `${l.TrangThaiCu || "Khởi tạo"} → ${l.TrangThaiMoi}`,
        thoiGian: l.NgayTao,
        ghiChu: l.GhiChu,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ================= UPDATE STATUS =================
exports.updateOrderStatus = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;
    const { newStatus, daHoanTien } = req.body;

    try {
      await conn.query(
        `ALTER TABLE DonHang ADD COLUMN DaHoanTien TINYINT(1) DEFAULT 0`,
      );
    } catch (err) {}

    await conn.beginTransaction();

    // ĐÃ FIX: Thêm MaND để lát nữa gửi thông báo
    const [[old]] = await conn.execute(
      `SELECT TrangThai, COALESCE(DaHoanTien, 0) AS DaHoanTien, MaND FROM DonHang WHERE MaDH = ?`,
      [id],
    );

    if (!old) {
      await conn.rollback();
      return res.status(404).json({ message: "Không tìm thấy" });
    }

    if (old.TrangThai === newStatus && typeof daHoanTien === "undefined") {
      await conn.rollback();
      return res.json({ message: "OK" });
    }

    const latestStockMovement = await getLatestOrderStockMovement(conn, id);

    if (
      newStatus === STOCK_OUTGOING_STATUS &&
      old.TrangThai !== STOCK_OUTGOING_STATUS &&
      latestStockMovement !== "XUAT_DON_HANG"
    ) {
      await deductOrderStock(conn, id);
    }

    if (
      newStatus === STOCK_RETURN_STATUS &&
      old.TrangThai !== STOCK_RETURN_STATUS
    ) {
      if (
        (old.TrangThai === "ChoXacNhan" ||
          old.TrangThai === STOCK_OUTGOING_STATUS ||
          old.TrangThai === "DangGiao") &&
        latestStockMovement === "XUAT_DON_HANG"
      ) {
        await restoreOrderStock(conn, id);
      }
    }

    if (typeof daHoanTien !== "undefined") {
      await conn.execute(
        `UPDATE DonHang SET TrangThai = ?, DaHoanTien = ? WHERE MaDH = ?`,
        [newStatus, daHoanTien ? 1 : 0, id],
      );
    } else {
      await conn.execute(`UPDATE DonHang SET TrangThai = ? WHERE MaDH = ?`, [
        newStatus,
        id,
      ]);
    }

    if (old.TrangThai !== newStatus) {
      await conn.execute(
        `
                INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, NgayTao)
                VALUES (?, ?, ?, NOW())
            `,
        [id, old.TrangThai, newStatus],
      );
    }

    await conn.commit();

    // Thông báo chỉ nên là phần phụ; nếu lỗi dữ liệu cục bộ thì không làm hỏng cập nhật trạng thái.
    try {
      const io = req.app.get("io");
      await createNotification({
        userId: old.MaND,
        title: "Cập nhật đơn hàng",
        content: `Đơn hàng #${id} đã được chuyển sang trạng thái ${newStatus}.`,
        io,
      });
    } catch (notifyErr) {
      console.warn("⚠️ Không thể tạo thông báo cập nhật đơn hàng:", notifyErr);
    }

    res.json({ message: "OK" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.message && err.message.includes("Không đủ tồn kho")) {
      return res.status(409).json({ message: err.message });
    }
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    conn.release();
  }
};

// ================= CANCEL ORDER =================
exports.cancelOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const { id } = req.params;

    await conn.beginTransaction();

    // ĐÃ FIX: Thêm MaND để gửi thông báo khi huỷ đơn
    const [[order]] = await conn.execute(
      `SELECT TrangThai, MaND FROM DonHang WHERE MaDH = ?`,
      [id],
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    const latestStockMovement = await getLatestOrderStockMovement(conn, id);

    if (
      (order.TrangThai === "ChoXacNhan" ||
        order.TrangThai === STOCK_OUTGOING_STATUS ||
        order.TrangThai === "DangGiao") &&
      latestStockMovement === "XUAT_DON_HANG"
    ) {
      await restoreOrderStock(conn, id);
    }

    await conn.execute(
      `UPDATE DonHang SET TrangThai = 'DaHuy' WHERE MaDH = ?`,
      [id],
    );

    await conn.execute(
      `
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, NgayTao)
            VALUES (?, ?, 'DaHuy', NOW())
        `,
      [id, order.TrangThai],
    );

    await conn.commit();

    try {
      const io = req.app.get("io");
      await createNotification({
        userId: order.MaND,
        title: "Đơn hàng đã bị hủy",
        content: `Đơn hàng #${id} đã được hủy.`,
        io,
      });
    } catch (notifyErr) {
      console.warn("⚠️ Không thể tạo thông báo hủy đơn:", notifyErr);
    }

    res.json({ message: "Đã hủy đơn hàng" });
  } catch (err) {
    await conn.rollback();
    console.error("🔥 CANCEL ERROR:", err);
    res.status(500).json({ message: "Lỗi server" });
  } finally {
    conn.release();
  }
};

// ================= MARK PRINTED (ONLY ONCE) =================
exports.markOrderPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await db.execute(
      `SELECT MaDH FROM DonHang WHERE MaDH = ?`,
      [id],
    );

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    const [[printLog]] = await db.execute(
      `SELECT MaLog FROM LogDonHang WHERE MaDH = ? AND TrangThaiMoi = 'DaInHoaDon' LIMIT 1`,
      [id],
    );

    if (printLog) {
      return res
        .status(409)
        .json({ message: "Đơn hàng đã in hóa đơn trước đó" });
    }

    await db.execute(
      `
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao)
            VALUES (?, NULL, 'DaInHoaDon', 'In hóa đơn lần đầu', NOW())
        `,
      [id],
    );

    res.json({ message: "Đã ghi nhận in hóa đơn" });
  } catch (err) {
    console.error("🔥 ERROR markOrderPrinted:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ================= GET ORDER LOGS (API RIÊNG) =================
exports.getOrderLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const [logs] = await db.execute(
      `
            SELECT 
                l.TrangThaiCu,
                l.TrangThaiMoi,
                l.GhiChu,
                l.NgayTao,
                nd.HoTen AS nguoiThaoTac
            FROM LogDonHang l
            LEFT JOIN NguoiDung nd ON l.NguoiThaoTac = nd.MaND
            WHERE l.MaDH = ?
            ORDER BY l.NgayTao ASC
        `,
      [id],
    );

    const lichSu = logs.map((l) => ({
      moTa: `${l.TrangThaiCu || "Khởi tạo"} → ${l.TrangThaiMoi}`,
      thoiGian: l.NgayTao,
      ghiChu: l.GhiChu,
      nguoiThaoTac: l.nguoiThaoTac || "Hệ thống",
    }));

    res.json(lichSu);
  } catch (err) {
    console.error("🔥 ERROR getOrderLogs:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ================= GET REFUND ALERTS =================
exports.getRefundAlerts = async (req, res) => {
  try {
    const [rows] = await db.execute(`
            SELECT dh.MaDH as id
            FROM DonHang dh
            LEFT JOIN (
                SELECT t.MaDH, t.PhuongThuc, t.TrangThai
                FROM ThanhToan t
                INNER JOIN (
                    SELECT MaDH, MAX(MaThanhToan) AS latestPaymentId
                    FROM ThanhToan
                    GROUP BY MaDH
                ) latest ON latest.latestPaymentId = t.MaThanhToan
            ) tt ON tt.MaDH = dh.MaDH
            WHERE dh.TrangThai = 'DaHuy'
              AND COALESCE(dh.DaHoanTien, 0) = 0
              AND tt.PhuongThuc IN ('VNPAY','THANHTOANTHEOSO','CHUYENKHOAN','BANK_TRANSFER')
              AND tt.TrangThai = 'DATHANHTOAN'
            ORDER BY dh.NgayDat DESC
            LIMIT 100
        `);

    const ids = rows.map((r) => r.id);
    res.json({ count: ids.length, ids });
  } catch (err) {
    console.error("ERROR getRefundAlerts:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
