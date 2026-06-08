const db = require('../config/db');

exports.getOrderForInvoice = async (id) => {
    // 1. Thông tin đơn hàng
    const [orderRows] = await db.execute(`
        SELECT dh.*, nd.HoTen, nd.SoDienThoai, nd.Email
        FROM DonHang dh
        LEFT JOIN NguoiDung nd ON dh.MaND = nd.MaND
        WHERE dh.MaDH = ?
    `, [id]);

    if (orderRows.length === 0) return null;

    // 2. Chi tiết sản phẩm
    const [itemRows] = await db.execute(`
        SELECT 
            ct.SoLuong AS soLuong,
            ct.DonGia AS giaBan,
            sp.TenSP AS tenSP,
            bt.TenBienThe
        FROM ChiTietDonHang ct
        JOIN BienTheSanPham bt ON ct.MaBienThe = bt.MaBienThe
        JOIN SanPham sp ON bt.MaSP = sp.MaSP
        WHERE ct.MaDH = ?
    `, [id]);

    const order = orderRows[0];

    // 3. FORMAT CHUẨN CHO FRONTEND
    return {
        id: order.MaDH,
        ngayTao: order.NgayDat,

        khachHang: {
            hoTen: order.HoTen,
            soDienThoai: order.SoDienThoai,
            email: order.Email
        },

        diaChiGiaoHang: order.ThongTinGiaoHang || 'Chưa có',
        tamTinh: Number(order.TongTien),
        giamGia: Number(order.TienGiamGia || 0),
        phiShip: Number(order.PhiShip || 0),
        tongTien: Number(order.ThanhTien),
        trangThai: order.TrangThai,

        chiTiet: itemRows
    };
};