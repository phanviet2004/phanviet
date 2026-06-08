const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const { createNotification } = require("./notificationController");
const { getVoucherColumns, buildVoucherRow } = require('../utils/voucherSchema');

const cancelDebugLogPath = path.join(
  __dirname,
  "../../cancel-unpaid-debug.log",
);

const appendCancelDebugLog = (entry) => {
  try {
    fs.appendFileSync(
      cancelDebugLogPath,
      `${JSON.stringify({
        at: new Date().toISOString(),
        ...entry,
      })}\n`,
      "utf8",
    );
  } catch (error) {
    console.error("[cancelUnpaidOrder] debug log write failed:", error.message);
  }
};

const CHECKOUT_STATUS = "ChoXacNhan";
const STOCK_OUT_MOVEMENT = "XUAT_DON_HANG";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const isCheckoutValidationError = (message) => {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("giỏ hàng") ||
    normalized.includes("voucher") ||
    normalized.includes("tồn kho") ||
    normalized.includes("đơn hàng tối thiểu")
  );
};

const normalizeSelectedVariantIds = (selectedVariantIds) => {
  if (!Array.isArray(selectedVariantIds)) {
    return [];
  }

  const validIds = selectedVariantIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  return [...new Set(validIds)];
};

const removePurchasedCartItems = async (conn, userId, items) => {
  const variantIds = [
    ...new Set(
      (items || [])
        .map((item) => Number(item.maBienThe))
        .filter((id) => Number.isInteger(id) && id > 0),
    ),
  ];

  if (!variantIds.length) {
    return;
  }

  const placeholders = variantIds.map(() => "?").join(", ");
  await conn.execute(
    `DELETE FROM GioHang WHERE MaND = ? AND MaBienThe IN (${placeholders})`,
    [userId, ...variantIds],
  );
};

const getUserCartItems = async (conn, userId, selectedVariantIds = []) => {
  const normalizedIds = normalizeSelectedVariantIds(selectedVariantIds);
  const hasSelectedFilter = normalizedIds.length > 0;

  const sql = `
        SELECT
            gh.MaBienThe AS maBienThe,
            gh.SoLuong AS soLuong,
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
            ) AS donGia,
            bt.TenBienThe AS tenBienThe,
            sp.MaSP AS maSP,
            sp.TenSP AS tenSP,
            (
                SELECT ha.DuongDanAnh
                FROM HinhAnh ha
                WHERE ha.LoaiThamChieu = 'SanPham'
                  AND ha.MaThamChieu = sp.MaSP
                ORDER BY ha.LaAnhChinh DESC, ha.ThuTuHienThi ASC, ha.MaHinhAnh ASC
                LIMIT 1
            ) AS hinhAnh,
            COALESCE((
                SELECT SUM(tk.SoLuongTon)
                FROM TonKho tk
                WHERE tk.MaBienThe = gh.MaBienThe
            ), 0) AS tonKho
        FROM GioHang gh
        JOIN BienTheSanPham bt ON gh.MaBienThe = bt.MaBienThe
        JOIN SanPham sp ON bt.MaSP = sp.MaSP
        WHERE gh.MaND = ?
        ${hasSelectedFilter ? `AND gh.MaBienThe IN (${normalizedIds.map(() => "?").join(", ")})` : ""}
        ORDER BY gh.NgayTao DESC, gh.MaBienThe DESC
    `;

  const params = hasSelectedFilter ? [userId, ...normalizedIds] : [userId];
  const [items] = await conn.execute(sql, params);

  return items.map((item) => {
    const soLuong = Number(item.soLuong || 0);
    const donGia = Number(item.donGia || 0);

    return {
      maBienThe: item.maBienThe,
      maSP: item.maSP,
      tenSP: item.tenSP,
      tenBienThe: item.tenBienThe,
      hinhAnh: item.hinhAnh,
      soLuong,
      donGia,
      thanhTien: roundMoney(soLuong * donGia),
      tonKho: Number(item.tonKho || 0),
    };
  });
};

const validateVoucher = async (
  conn,
  voucherCode,
  subtotal,
  lockRow = false,
) => {
  if (!voucherCode) {
    return {
      maVoucher: null,
      tienGiamGia: 0,
      thongTinVoucher: null,
    };
  }

  const normalizedCode = String(voucherCode).trim().toUpperCase();
  const lockClause = lockRow ? "FOR UPDATE" : "";

  // Read actual voucher columns and only select those present to avoid ER_BAD_FIELD_ERROR
  const availableCols = await getVoucherColumns();
  const desired = [
    'MaVoucher',
    'PhanTramGiam',
    'SoTienGiam',
    'GiamToiDa',
    'DonTaiThieu',
    'SoLuong',
    'SoLuongDaDung',
    'NgayBatDau',
    'NgayKetThuc',
    'TrangThai',
  ];

  const selectCols = desired.filter((c) => availableCols.includes(c));
  if (!selectCols.includes('MaVoucher')) {
    throw new Error('Lỗi hệ thống voucher, vui lòng thử lại sau');
  }

  let rows;
  try {
    const sql = `SELECT ${selectCols.join(', ')} FROM Voucher WHERE MaVoucher = ? ${lockClause}`;
    const [result] = await conn.execute(sql, [normalizedCode]);
    rows = result;
    console.debug('[validateVoucher] selected cols:', selectCols, 'rows:', rows);
  } catch (sqlErr) {
    console.error('[validateVoucher] SQL error:', sqlErr);
    if (sqlErr?.code === 'ER_NO_SUCH_TABLE' || sqlErr?.code === 'ER_BAD_FIELD_ERROR') {
      throw new Error('Lỗi hệ thống voucher, vui lòng thử lại sau');
    }
    throw sqlErr;
  }

  if (!rows.length) {
    throw new Error("Mã voucher không tồn tại");
  }

  // Normalize row to support schema variations (SoLuong vs SoLuongToiDa, etc.)
  const voucher = buildVoucherRow(rows[0]);
  const now = new Date();
  const startAt = voucher.NgayBatDau ? new Date(voucher.NgayBatDau) : null;
  const endAt = voucher.NgayKetThuc ? new Date(voucher.NgayKetThuc) : null;
  const remaining = Number(voucher.SoLuongConLai ?? Math.max(Number(voucher.SoLuong || 0) - Number(voucher.SoLuongDaDung || 0), 0));
  const minimumOrder = Number(voucher.DonTaiThieu || 0);

  if (voucher.TrangThai !== "KichHoat") {
    throw new Error("Voucher chưa được kích hoạt");
  }
  if (startAt && now < startAt) {
    throw new Error("Voucher chưa đến thời gian áp dụng");
  }
  if (endAt && now > endAt) {
    throw new Error("Voucher đã hết hạn");
  }
  if (remaining <= 0) {
    throw new Error("Voucher đã hết lượt sử dụng");
  }
  if (subtotal < minimumOrder) {
    throw new Error(
      `Đơn hàng tối thiểu ${minimumOrder.toLocaleString("vi-VN")}đ để áp dụng voucher`,
    );
  }

  let discount = 0;

  if (voucher.PhanTramGiam != null) {
    discount = roundMoney((subtotal * Number(voucher.PhanTramGiam || 0)) / 100);
    if (voucher.GiamToiDa != null) {
      discount = Math.min(discount, Number(voucher.GiamToiDa || 0));
    }
  } else if (voucher.SoTienGiam != null) {
    discount = Number(voucher.SoTienGiam || 0);
  }

  discount = Math.max(0, Math.min(roundMoney(discount), subtotal));

  return {
    maVoucher: normalizedCode,
    tienGiamGia: discount,
    thongTinVoucher: {
      maVoucher: normalizedCode,
      phanTramGiam: voucher.PhanTramGiam,
      soTienGiam: voucher.SoTienGiam,
      giamToiDa: voucher.GiamToiDa,
      donToiThieu: voucher.DonTaiThieu,
    },
  };
};

const buildCheckoutSummary = async (
  conn,
  userId,
  voucherCode,
  lockVoucher = false,
  selectedVariantIds = [],
) => {
  const normalizedIds = normalizeSelectedVariantIds(selectedVariantIds);
  const cartItems = await getUserCartItems(conn, userId, normalizedIds);

  if (!cartItems.length) {
    throw new Error("Giỏ hàng của bạn đang trống");
  }

  if (normalizedIds.length > 0 && cartItems.length !== normalizedIds.length) {
    throw new Error("Một số sản phẩm đã chọn không còn trong giỏ hàng");
  }

  const outOfStockItems = cartItems.filter(
    (item) => item.tonKho < item.soLuong,
  );
  if (outOfStockItems.length) {
    const firstItem = outOfStockItems[0];
    throw new Error(
      `Sản phẩm ${firstItem.tenSP} (${firstItem.tenBienThe}) không đủ tồn kho`,
    );
  }

  const subtotal = roundMoney(
    cartItems.reduce((sum, item) => sum + Number(item.thanhTien || 0), 0),
  );
  const shippingFee = 0;

  const voucherResult = await validateVoucher(
    conn,
    voucherCode,
    subtotal,
    lockVoucher,
  );
  const total = roundMoney(subtotal + shippingFee - voucherResult.tienGiamGia);

  return {
    items: cartItems,
    tongTien: subtotal,
    phiShip: shippingFee,
    tienGiamGia: voucherResult.tienGiamGia,
    thanhTien: total,
    maVoucher: voucherResult.maVoucher,
    voucher: voucherResult.thongTinVoucher,
  };
};

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
      [item.MaBienThe, quantity, totalRow.SoLuongTon, orderId],
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

const deductOrderStock = async (
  conn,
  orderId,
  logNote = "Trừ kho khi tạo đơn hàng",
) => {
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
            VALUES (?, 'XUAT_DON_HANG', ?, ?, ?, ?)
        `,
      [item.MaBienThe, -quantity, totalStock - quantity, orderId, logNote],
    );
  }
};

exports.getCheckoutPreview = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Bạn cần đăng nhập để thanh toán" });
    }
    const voucherCode = req.body?.voucherCode;
    console.log('[getCheckoutPreview] userId=', userId, 'voucherCode=', voucherCode);
    const selectedVariantIds = req.body?.selectedVariantIds;
    const checkout = await buildCheckoutSummary(
      db,
      userId,
      voucherCode,
      false,
      selectedVariantIds,
    );

    res.json(checkout);
  } catch (err) {
    const statusCode = isCheckoutValidationError(err.message) ? 400 : 500;

    if (statusCode === 500) {
      console.error("Loi getCheckoutPreview:", err);
    }

    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};

exports.getCheckoutProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để tiếp tục" });
    }

    const [[user]] = await db.execute(
      `
            SELECT HoTen, Email, SoDienThoai, DiaChi
            FROM NguoiDung
            WHERE MaND = ?
            LIMIT 1
        `,
      [userId],
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    return res.json({
      data: {
        recipientName: user.HoTen || "",
        recipientEmail: user.Email || "",
        recipientPhone: user.SoDienThoai || "",
        address: user.DiaChi || "",
      },
    });
  } catch (err) {
    console.error("Loi getCheckoutProfile:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

exports.placeOrderFromCheckout = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Bạn cần đăng nhập để thanh toán" });
    }

    const {
      recipientName,
      recipientPhone,
      recipientEmail,
      shippingAddress,
      note,
      paymentMethod,
      voucherCode,
      selectedVariantIds,
    } = req.body;

    if (!recipientName || !recipientPhone || !shippingAddress) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin nhận hàng" });
    }

    const normalizedRecipientName = String(recipientName || "").trim();
    const normalizedRecipientPhone = String(recipientPhone || "")
      .replace(/\D/g, "")
      .slice(0, 10);
    const normalizedRecipientEmail = String(recipientEmail || "").trim();
    const normalizedShippingAddress = String(shippingAddress || "").trim();

    if (
      !normalizedRecipientName ||
      !normalizedRecipientPhone ||
      !normalizedShippingAddress
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ thông tin nhận hàng" });
    }

    if (!/^\d{10}$/.test(normalizedRecipientPhone)) {
      return res
        .status(400)
        .json({ message: "Số điện thoại phải gồm đúng 10 chữ số" });
    }

    await conn.beginTransaction();

    await conn.execute(
      `
            UPDATE NguoiDung
            SET
                HoTen = ?,
                SoDienThoai = ?,
                DiaChi = ?,
                Email = CASE
                    WHEN ? IS NULL OR ? = '' THEN Email
                    ELSE ?
                END
            WHERE MaND = ?
        `,
      [
        normalizedRecipientName,
        normalizedRecipientPhone,
        normalizedShippingAddress,
        normalizedRecipientEmail,
        normalizedRecipientEmail,
        normalizedRecipientEmail,
        userId,
      ],
    );

    const checkout = await buildCheckoutSummary(
      conn,
      userId,
      voucherCode,
      true,
      selectedVariantIds,
    );
    const paymentMethodCode =
      String(paymentMethod || "cod").toLowerCase() === "vnpay"
        ? "VNPAY"
        : "COD";
    const paymentStatus =
      paymentMethodCode === "VNPAY" ? "ChoThanhToan" : "ChoThuTien";

    const shippingInfo = [
      `Tên: ${normalizedRecipientName}`,
      `SĐT: ${normalizedRecipientPhone}`,
      normalizedRecipientEmail ? `Email: ${normalizedRecipientEmail}` : null,
      `Địa chỉ: ${normalizedShippingAddress}`,
    ]
      .filter(Boolean)
      .join(" | ");

    const [orderResult] = await conn.execute(
      `
            INSERT INTO DonHang (
                MaND,
                MaVoucher,
                NgayDat,
                TrangThai,
                TongTien,
                PhiShip,
                TienGiamGia,
                ThanhTien,
                ThongTinGiaoHang,
                GhiChu
            ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        userId,
        checkout.maVoucher,
        CHECKOUT_STATUS,
        checkout.tongTien,
        checkout.phiShip,
        checkout.tienGiamGia,
        checkout.thanhTien,
        shippingInfo,
        note || null,
      ],
    );

    const orderId = orderResult.insertId;

    for (const item of checkout.items) {
      await conn.execute(
        `
                INSERT INTO ChiTietDonHang (MaDH, MaBienThe, SoLuong, DonGia)
                VALUES (?, ?, ?, ?)
            `,
        [orderId, item.maBienThe, item.soLuong, item.donGia],
      );
    }

    if (paymentMethodCode === "COD") {
      await deductOrderStock(
        conn,
        orderId,
        "Trừ kho khi đơn hàng ở trạng thái Chờ xác nhận",
      );
    }

    if (checkout.maVoucher) {
      try {
        await conn.execute(
          `
                UPDATE Voucher
                SET SoLuongDaDung = IFNULL(SoLuongDaDung, 0) + 1
                WHERE MaVoucher = ?
            `,
          [checkout.maVoucher],
        );
      } catch (err) {
        console.error('[placeOrderFromCheckout] Failed to update Voucher usage:', err);
        // If voucher table missing or schema changed, continue without failing the whole checkout
      }
    }

    await conn.execute(
      `
            INSERT INTO ThanhToan (MaDH, PhuongThuc, TrangThai, NgayThanhToan)
            VALUES (?, ?, ?, NULL)
        `,
      [orderId, paymentMethodCode, paymentStatus],
    );

    await conn.execute(
      `
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NguoiThaoTac, NgayTao)
            VALUES (?, NULL, ?, 'Khách hàng tạo đơn từ trang thanh toán', ?, NOW())
        `,
      [orderId, CHECKOUT_STATUS, userId],
    );

    if (paymentMethodCode === "COD") {
      await removePurchasedCartItems(conn, userId, checkout.items);
    }

    await conn.commit();

    res.status(201).json({
      message: "Đặt hàng thành công",
      data: {
        orderId,
        trangThai: CHECKOUT_STATUS,
        phuongThucThanhToan: paymentMethodCode,
        tongTien: checkout.thanhTien,
      },
    });
  } catch (err) {
    await conn.rollback();

    const statusCode = isCheckoutValidationError(err.message) ? 400 : 500;

    if (statusCode === 500) {
      console.error("Loi placeOrderFromCheckout:", err);
    }

    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  } finally {
    conn.release();
  }
};

exports.confirmOnlinePayment = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Bạn cần đăng nhập để thanh toán" });
    }

    const orderId = Number(req.body?.orderId || 0);
    const transactionCode = String(req.body?.transactionCode || "").trim();

    if (!orderId) {
      return res
        .status(400)
        .json({ message: "Thiếu mã đơn hàng để xác nhận thanh toán" });
    }

    await conn.beginTransaction();

    const [[order]] = await conn.execute(
      `
            SELECT MaDH, MaND, TrangThai
            FROM DonHang
            WHERE MaDH = ?
            FOR UPDATE
        `,
      [orderId],
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (String(order.MaND) !== String(userId)) {
      await conn.rollback();
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thanh toán đơn hàng này" });
    }

    if (order.TrangThai === "DaHuy") {
      await conn.rollback();
      return res.status(400).json({ message: "Đơn hàng đã bị hủy" });
    }

    const [[payment]] = await conn.execute(
      `
            SELECT PhuongThuc, TrangThai
            FROM ThanhToan
            WHERE MaDH = ?
            FOR UPDATE
        `,
      [orderId],
    );

    if (!payment) {
      await conn.rollback();
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin thanh toán của đơn hàng" });
    }

    if (payment.PhuongThuc !== "VNPAY") {
      await conn.rollback();
      return res
        .status(400)
        .json({
          message: "Đơn hàng này không sử dụng phương thức thanh toán online",
        });
    }

    const latestStockMovement = await getLatestOrderStockMovement(
      conn,
      orderId,
    );
    if (latestStockMovement !== STOCK_OUT_MOVEMENT) {
      await deductOrderStock(
        conn,
        orderId,
        "Trừ kho khi xác nhận thanh toán online",
      );
    }

    const orderedItems = await loadOrderItems(conn, orderId);
    await removePurchasedCartItems(
      conn,
      userId,
      orderedItems.map((item) => ({ maBienThe: item.MaBienThe })),
    );

    if (payment.TrangThai === "DaThanhToan") {
      await conn.commit();
      return res.json({
        message: "Đơn hàng đã được xác nhận thanh toán trước đó",
        data: {
          orderId,
          stockDeducted: latestStockMovement !== STOCK_OUT_MOVEMENT,
        },
      });
    }

    await conn.execute(
      `
            UPDATE ThanhToan
            SET TrangThai = 'DaThanhToan', NgayThanhToan = NOW()
            WHERE MaDH = ?
        `,
      [orderId],
    );

    await conn.execute(
      `
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NguoiThaoTac, NgayTao)
            VALUES (?, ?, ?, ?, ?, NOW())
        `,
      [
        orderId,
        order.TrangThai,
        order.TrangThai,
        transactionCode
          ? `Khách hàng xác nhận thanh toán online. Mã GD: ${transactionCode}`
          : "Khách hàng xác nhận thanh toán online",
        userId,
      ],
    );

    const io = req.app.get("io");
    await createNotification({
      userId,
      title: "Thanh toán online đã được xác nhận",
      content: `Đơn hàng #${orderId} đã được xác nhận thanh toán thành công.`,
      io,
    });

    await conn.commit();

    return res.json({
      message: "Xác nhận thanh toán thành công",
      data: { orderId },
    });
  } catch (err) {
    await conn.rollback();

    const statusCode = isCheckoutValidationError(err.message) ? 400 : 500;

    if (statusCode === 500) {
      console.error("Loi confirmOnlinePayment:", err);
    }

    return res
      .status(statusCode)
      .json({ message: err.message || "Lỗi server" });
  } finally {
    conn.release();
  }
};

exports.getOnlinePaymentStatus = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Bạn cần đăng nhập để thanh toán" });
    }

    const orderId = Number(req.params?.orderId || 0);
    if (!orderId) {
      return res
        .status(400)
        .json({ message: "Thiếu mã đơn hàng để kiểm tra thanh toán" });
    }

    const [[order]] = await conn.execute(
      `
            SELECT MaDH, MaND
            FROM DonHang
            WHERE MaDH = ?
        `,
      [orderId],
    );

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (String(order.MaND) !== String(userId)) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền kiểm tra đơn hàng này" });
    }

    const [[payment]] = await conn.execute(
      `
            SELECT PhuongThuc, TrangThai, NgayThanhToan
            FROM ThanhToan
            WHERE MaDH = ?
        `,
      [orderId],
    );

    if (!payment) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin thanh toán của đơn hàng" });
    }

    return res.json({
      message: "Lấy trạng thái thanh toán thành công",
      data: {
        orderId,
        paymentMethod: payment.PhuongThuc,
        paymentStatus: payment.TrangThai,
        paidAt: payment.NgayThanhToan,
      },
    });
  } catch (err) {
    const statusCode = err?.message ? 500 : 500;
    console.error("Loi getOnlinePaymentStatus:", err);
    return res
      .status(statusCode)
      .json({ message: err.message || "Lỗi server" });
  } finally {
    conn.release();
  }
};

// ================= XÓA ĐƠN HÀNG CHƯA THANH TOÁN =================
exports.cancelUnpaidOrder = async (req, res) => {
  let conn;
  let txStarted = false;

  console.log("[cancelUnpaidOrder] REQUEST RECEIVED", {
    body: req.body,
    userId: req.user?.id,
    headers: req.headers.authorization
      ? "Bearer token present"
      : "No auth header",
  });
  appendCancelDebugLog({
    stage: "request-received",
    body: req.body,
    userId: req.user?.id,
    hasAuthHeader: Boolean(req.headers.authorization),
  });

  try {
    conn = await db.getConnection();

    const userId = req.user?.id;
    if (!userId) {
      console.log("[cancelUnpaidOrder] NO USER ID - returning 401");
      appendCancelDebugLog({ stage: "no-user-id" });
      return res.status(401).json({ message: "Bạn cần đăng nhập để hủy đơn" });
    }

    const orderId = Number(req.body?.orderId);
    if (!orderId) {
      console.log("[cancelUnpaidOrder] NO ORDER ID - returning 400");
      appendCancelDebugLog({ stage: "no-order-id", userId });
      return res.status(400).json({ message: "Thiếu mã đơn hàng" });
    }

    await conn.beginTransaction();
    txStarted = true;

    console.log("[cancelUnpaidOrder] start", { orderId, userId });
    appendCancelDebugLog({ stage: "start", orderId, userId });

    // 1. Kiểm tra đơn hàng tồn tại
    const [[order]] = await conn.execute(
      `
            SELECT MaDH, MaND, MaVoucher, TrangThai
            FROM DonHang
            WHERE MaDH = ?
            FOR UPDATE
        `,
      [orderId],
    );

    if (!order) {
      await conn.rollback();
      txStarted = false;
      appendCancelDebugLog({ stage: "order-not-found", orderId, userId });
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // 2. Kiểm tra quyền sở hữu
    if (String(order.MaND) !== String(userId)) {
      await conn.rollback();
      txStarted = false;
      appendCancelDebugLog({
        stage: "forbidden",
        orderId,
        userId,
        orderOwnerId: order.MaND,
      });
      return res.status(403).json({
        message: "Bạn không có quyền hủy đơn hàng này",
        debug: {
          orderOwnerId: order.MaND,
          currentUserId: userId,
        },
      });
    }

    const [[payment]] = await conn.execute(
      `
            SELECT TrangThai
            FROM ThanhToan
            WHERE MaDH = ?
            FOR UPDATE
        `,
      [orderId],
    );

    if (payment?.TrangThai === "DaThanhToan") {
      await conn.rollback();
      txStarted = false;
      appendCancelDebugLog({ stage: "already-paid", orderId, userId });
      return res
        .status(400)
        .json({
          message: "Đơn hàng đã thanh toán, không thể hủy theo cách này",
        });
    }

    // Xóa dữ liệu liên quan trước, sau đó mới xóa đơn hàng.
    const [deletedOrderDetails] = await conn.execute(
      `DELETE FROM ChiTietDonHang WHERE MaDH = ?`,
      [orderId],
    );
    const [deletedPayments] = await conn.execute(
      `DELETE FROM ThanhToan WHERE MaDH = ?`,
      [orderId],
    );
    const [deletedReviews] = await conn.execute(
      `DELETE FROM DanhGia WHERE MaDH = ?`,
      [orderId],
    );
    const [deletedOrderLogs] = await conn.execute(
      `DELETE FROM LogDonHang WHERE MaDH = ?`,
      [orderId],
    );
    const [deletedOrders] = await conn.execute(
      `DELETE FROM DonHang WHERE MaDH = ?`,
      [orderId],
    );

    if (!deletedOrders?.affectedRows) {
      throw new Error("Không thể xóa đơn hàng");
    }

    if (order.MaVoucher) {
      try {
        await conn.execute(
          `
                UPDATE Voucher
                SET SoLuongDaDung = GREATEST(IFNULL(SoLuongDaDung, 0) - 1, 0)
                WHERE MaVoucher = ?
            `,
          [order.MaVoucher],
        );
      } catch (err) {
        console.error('[cancelUnpaidOrder] Failed to decrement Voucher usage:', err);
        // don't block order cancellation due to voucher table/schema issues
      }
    }

    await conn.commit();
    txStarted = false;

    console.log("[cancelUnpaidOrder] success", {
      orderId,
      userId,
      deleted: {
        chiTietDonHang: deletedOrderDetails?.affectedRows || 0,
        thanhToan: deletedPayments?.affectedRows || 0,
        danhGia: deletedReviews?.affectedRows || 0,
        logDonHang: deletedOrderLogs?.affectedRows || 0,
        donHang: deletedOrders?.affectedRows || 0,
      },
    });
    appendCancelDebugLog({
      stage: "success",
      orderId,
      userId,
      deleted: {
        chiTietDonHang: deletedOrderDetails?.affectedRows || 0,
        thanhToan: deletedPayments?.affectedRows || 0,
        danhGia: deletedReviews?.affectedRows || 0,
        logDonHang: deletedOrderLogs?.affectedRows || 0,
        donHang: deletedOrders?.affectedRows || 0,
      },
    });

    res.json({
      message: "Đã xóa đơn hàng thành công",
      data: {
        orderId,
        deleted: {
          chiTietDonHang: deletedOrderDetails?.affectedRows || 0,
          thanhToan: deletedPayments?.affectedRows || 0,
          danhGia: deletedReviews?.affectedRows || 0,
          logDonHang: deletedOrderLogs?.affectedRows || 0,
          donHang: deletedOrders?.affectedRows || 0,
        },
      },
    });
  } catch (err) {
    if (conn && txStarted) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error(
          "[cancelUnpaidOrder] rollback error:",
          rollbackErr.message,
        );
      }
    }
    console.error("Loi cancelUnpaidOrder:", err);
    appendCancelDebugLog({
      stage: "error",
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: err.message || "Lỗi server" });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

// ================= CUSTOMER CANCEL ORDER =================
exports.customerCancelOrder = async (req, res) => {
  const conn = await db.getConnection();

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Bạn cần đăng nhập để hủy đơn" });
    }

    const orderId = Number(req.body?.orderId);
    if (!orderId) {
      return res.status(400).json({ message: "Thiếu mã đơn hàng" });
    }

    await conn.beginTransaction();

    // 1. Kiểm tra đơn hàng tồn tại và thuộc về khách hàng
    const [[order]] = await conn.execute(
      `
            SELECT MaDH, MaND, TrangThai
            FROM DonHang
            WHERE MaDH = ?
            FOR UPDATE
        `,
      [orderId],
    );

    if (!order) {
      await conn.rollback();
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (String(order.MaND) !== String(userId)) {
      await conn.rollback();
      return res
        .status(403)
        .json({ message: "Bạn không có quyền hủy đơn hàng này" });
    }

    // 2. Kiểm tra trạng thái đơn hàng - chỉ cho phép hủy nếu chưa hoàn thành/đã hủy
    const validCancelStates = ["ChoXacNhan", "DaXacNhan", "DangGiao"];
    if (!validCancelStates.includes(order.TrangThai)) {
      await conn.rollback();
      let message = "Không thể hủy đơn hàng ở trạng thái này";
      if (order.TrangThai === "HoanThanh") {
        message = "Đơn hàng đã hoàn thành, không thể hủy";
      } else if (order.TrangThai === "DaHuy") {
        message = "Đơn hàng đã được hủy";
      }
      return res.status(400).json({ message });
    }

    // 3. Kiểm tra nếu đơn đã trừ kho (DaXacNhan hoặc DangGiao) - hoàn lại kho
    const latestStockMovement = await getLatestOrderStockMovement(
      conn,
      orderId,
    );
    if (
      (order.TrangThai === "DaXacNhan" || order.TrangThai === "DangGiao") &&
      latestStockMovement === "XUAT_DON_HANG"
    ) {
      await restoreOrderStock(conn, orderId);
    }

    // 4. Cập nhật trạng thái thành DaHuy
    await conn.execute(
      `
            UPDATE DonHang
            SET TrangThai = 'DaHuy'
            WHERE MaDH = ?
        `,
      [orderId],
    );

    // 5. Ghi log
    await conn.execute(
      `
            INSERT INTO LogDonHang (MaDH, TrangThaiCu, TrangThaiMoi, GhiChu, NguoiThaoTac, NgayTao)
            VALUES (?, ?, 'DaHuy', 'Khách hàng hủy đơn hàng', ?, NOW())
        `,
      [orderId, order.TrangThai, userId],
    );

    await conn.commit();

    // Check nếu đơn có ghi nhận thanh toán từ Casso
    const [[paymentRecord]] = await conn.execute(
      `
            SELECT TrangThai FROM ThanhToan WHERE MaDH = ? LIMIT 1
        `,
      [orderId],
    );

    const hasCassoPayment = paymentRecord?.TrangThai === "DaThanhToan";

    return res.json({
      message: "Đã hủy đơn hàng thành công",
      data: {
        orderId,
        newStatus: "DaHuy",
        hasCassoPayment,
      },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rollbackErr) {
      console.error("Lỗi rollback customerCancelOrder:", rollbackErr.message);
    }
    console.error("Lỗi customerCancelOrder:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  } finally {
    conn.release();
  }
};
