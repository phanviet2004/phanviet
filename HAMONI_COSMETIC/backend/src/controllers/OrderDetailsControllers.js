const db = require('../config/db');

// Controller dedicated to order details + logs to avoid mixing with admin orderController
exports.getOrderDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const [[order]] = await db.execute(`
      SELECT dh.*, nd.HoTen, nd.SoDienThoai, nd.Email
      FROM DonHang dh
      LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND
      WHERE dh.MaDH = ?
    `, [id]);

    if (!order) return res.status(404).json({ message: 'Không tìm thấy' });

    const [items] = await db.execute(`
      SELECT ct.SoLuong as soLuong,
             ct.DonGia as giaBan,
             sp.TenSP,
             bt.TenBienThe,
             (SELECT ha.DuongDanAnh FROM HinhAnh ha 
              WHERE ha.LoaiThamChieu = 'SanPham' 
              AND ha.MaThamChieu = sp.MaSP 
              ORDER BY ha.LaAnhChinh DESC, ha.ThuTuHienThi ASC 
              LIMIT 1) AS DuongDanAnh
      FROM ChiTietDonHang ct
      JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
      JOIN SanPham sp ON bt.MaSP = sp.MaSP
      WHERE ct.MaDH = ?
    `, [id]);

    const [logs] = await db.execute(`
      SELECT TrangThaiCu, TrangThaiMoi, GhiChu, NgayTao
      FROM LogDonHang
      WHERE MaDH = ?
      ORDER BY NgayTao ASC
    `, [id]);

    const isPrinted = logs.some(l => l.TrangThaiMoi === 'DaInHoaDon');

    res.json({
      id: order.MaDH,
      ngayTao: order.NgayDat,
      trangThai: order.TrangThai,
      khachHang: {
        hoTen: order.HoTen,
        soDienThoai: order.SoDienThoai,
        email: order.Email
      },
      diaChiGiaoHang: order.ThongTinGiaoHang,
      tamTinh: Number(order.TongTien),
      giamGia: Number(order.TienGiamGia || 0),
      phiShip: Number(order.PhiShip || 0),
      tongTien: Number(order.ThanhTien),
      daInHoaDon: isPrinted,
      chiTiet: items,
      lichSu: logs.map(l => ({
        moTa: `${l.TrangThaiCu || 'Khởi tạo'} → ${l.TrangThaiMoi}`,
        thoiGian: l.NgayTao,
        ghiChu: l.GhiChu
      }))
    });

  } catch (err) {
    console.error('🔥 OrderDetailsControllers.getOrderDetail error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.getOrderLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const [logs] = await db.execute(`
      SELECT l.TrangThaiCu, l.TrangThaiMoi, l.GhiChu, l.NgayTao, nd.HoTen AS nguoiThaoTac
      FROM LogDonHang l
      LEFT JOIN NguoiDung nd ON l.NguoiThaoTac = nd.MaND
      WHERE l.MaDH = ?
      ORDER BY l.NgayTao ASC
    `, [id]);

    const lichSu = logs.map(l => ({
      moTa: `${l.TrangThaiCu || 'Khởi tạo'} → ${l.TrangThaiMoi}`,
      thoiGian: l.NgayTao,
      ghiChu: l.GhiChu,
      nguoiThaoTac: l.nguoiThaoTac || 'Hệ thống'
    }));

    res.json(lichSu);
  } catch (err) {
    console.error('🔥 OrderDetailsControllers.getOrderLogs error:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};
