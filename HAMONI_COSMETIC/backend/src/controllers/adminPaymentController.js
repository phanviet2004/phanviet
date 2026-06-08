const db = require('../config/db');

const loadOrderItems = async (conn, orderId) => {
  const [items] = await conn.execute(`
    SELECT MaBienThe, SoLuong
    FROM ChiTietDonHang
    WHERE MaDH = ?
  `, [orderId]);

  return items;
};

const getLatestOrderStockMovement = async (conn, orderId) => {
  const [[row]] = await conn.query(`
    SELECT LoaiGiaoDich
    FROM LogTonKho
    WHERE MaThamChieu = ?
      AND LoaiGiaoDich IN ('XUAT_DON_HANG', 'NHAP_DON_HUY')
    ORDER BY NgayTao DESC, MaLog DESC
    LIMIT 1
  `, [orderId]);

  return row?.LoaiGiaoDich || null;
};

const deductOrderStock = async (conn, orderId, note = 'Trừ kho khi thanh toán') => {
  const items = await loadOrderItems(conn, orderId);

  for (const item of items) {
    const quantity = Number(item.SoLuong || 0);

    const [stocks] = await conn.query(`
      SELECT MaKho, SoLuongTon
      FROM TonKho
      WHERE MaBienThe = ?
      ORDER BY MaKho ASC
      FOR UPDATE
    `, [item.MaBienThe]);

    const totalStock = stocks.reduce((sum, row) => sum + Number(row.SoLuongTon || 0), 0);

    if (totalStock < quantity) {
      throw new Error(`Không đủ tồn kho cho biến thể ${item.MaBienThe}`);
    }

    let remain = quantity;
    for (const stock of stocks) {
      if (remain <= 0) break;

      const available = Number(stock.SoLuongTon || 0);
      if (available <= 0) continue;

      const deduct = Math.min(available, remain);

      await conn.query(`
        UPDATE TonKho
        SET SoLuongTon = SoLuongTon - ?
        WHERE MaKho = ? AND MaBienThe = ?
      `, [deduct, stock.MaKho, item.MaBienThe]);

      remain -= deduct;
    }

    await conn.query(`
      INSERT INTO LogTonKho
      (MaBienThe, LoaiGiaoDich, SoLuongThayDoi, SoLuongTonHienTai, MaThamChieu, GhiChu)
      VALUES (?, 'XUAT_DON_HANG', ?, ?, ?, ?)
    `, [item.MaBienThe, -quantity, totalStock - quantity, orderId, note]);
  }
};

const removePurchasedCartItems = async (conn, userId, items) => {
  const variantIds = [...new Set(
    (items || [])
      .map(item => Number(item.maBienThe || item.MaBienThe))
      .filter(id => Number.isInteger(id) && id > 0)
  )];

  if (!variantIds.length) return;

  const placeholders = variantIds.map(() => '?').join(', ');

  await conn.execute(
    `DELETE FROM GioHang WHERE MaND = ? AND MaBienThe IN (${placeholders})`,
    [userId, ...variantIds]
  );
};

// =========================
// CONFIRM MANUAL PAYMENT (ADMIN)
// =========================
exports.confirmManualPayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const adminId = req.user?.id;
    const { orderId } = req.body;

    if (!adminId) {
      return res.status(401).json({ message: 'Bạn cần đăng nhập' });
    }

    if (!orderId) {
      return res.status(400).json({
        message: 'Thiếu orderId'
      });
    }

    const numOrderId = Number(orderId);
    if (!Number.isInteger(numOrderId) || numOrderId <= 0) {
      return res.status(400).json({
        message: 'orderId không hợp lệ'
      });
    }

    await conn.beginTransaction();

    const [[order]] = await conn.execute(`
      SELECT MaDH, MaND
      FROM DonHang
      WHERE MaDH = ?
      FOR UPDATE
    `, [numOrderId]);

    if (!order) {
      await conn.rollback();
      return res.status(404).json({
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const userId = order.MaND;

    const [[existingPayment]] = await conn.execute(`
      SELECT TrangThai
      FROM ThanhToan
      WHERE MaDH = ?
      FOR UPDATE
    `, [numOrderId]);

    if (existingPayment?.TrangThai === 'DaThanhToan') {
      await conn.rollback();
      return res.status(409).json({
        message: 'Đơn hàng này đã được xác nhận thanh toán trước đó',
        data: {
          orderId: numOrderId,
          paymentStatus: 'DaThanhToan'
        }
      });
    }

    // Update payment record
    await conn.execute(`
      INSERT INTO ThanhToan (MaDH, PhuongThuc, TrangThai, NgayThanhToan)
      VALUES (?, 'ThanhToanTheoSo', 'DaThanhToan', NOW())
      ON DUPLICATE KEY UPDATE
        TrangThai = 'DaThanhToan',
        PhuongThuc = 'ThanhToanTheoSo',
        NgayThanhToan = NOW()
    `, [numOrderId]);

    // Deduct stock if not already done
    const latestStockMovement = await getLatestOrderStockMovement(
      conn,
      numOrderId
    );

    const STOCK_OUT_MOVEMENT = 'XUAT_DON_HANG';
    if (latestStockMovement !== STOCK_OUT_MOVEMENT) {
      await deductOrderStock(
        conn,
        numOrderId,
        'Trừ kho khi thanh toán thủ công được xác nhận'
      );
    }

    // Remove cart items
    const orderedItems = await loadOrderItems(conn, numOrderId);
    await removePurchasedCartItems(conn, userId, orderedItems);

    // Log the action
    await conn.execute(`
      INSERT INTO LogDonHang
      (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao)
      VALUES (?, ?, ?, ?, NOW())
    `, [
      numOrderId,
      'ChoThanhToan',
      'ChoXacNhan',
      `Nhân viên ID ${adminId} xác nhận thanh toán thủ công thành công`
    ]);

    await conn.commit();

    return res.json({
      message: 'Xác nhận thanh toán thủ công thành công',
      data: {
        orderId: numOrderId,
        paymentStatus: 'DaThanhToan'
      }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Lỗi confirmManualPayment:', err);

    return res.status(500).json({
      message: 'Không thể xác nhận thanh toán thủ công'
    });
  } finally {
    conn.release();
  }
};
