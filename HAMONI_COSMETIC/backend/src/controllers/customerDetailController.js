const db = require('../config/db');
exports.getDetailAnalytics = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Lấy thông tin khách hàng 
        const [customer] = await db.execute(
    'SELECT HoTen, SoDienThoai, Email, DiaChi, TrangThai, AvatarUrl AS Avatar FROM NguoiDung WHERE MaND = ?', 
    [id]
);
        if (customer.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy người dùng" });
        }
        // 2. Lấy lịch sử đơn hàng 
        const [orders] = await db.execute(
            'SELECT MaDH, TongTien, NgayDat, TrangThai FROM DonHang WHERE MaND = ? ORDER BY NgayDat DESC',
            [id]
        );
        // 3. Tính toán tổng tông và xếp hạng
        const totalSpent = orders.reduce((sum, order) => sum + Number(order.TongTien), 0);      
        const spentForRanking = totalSpent / 1000;
        let rankName = "Đồng";
        if (spentForRanking > 7000) rankName = "Kim Cương";
        else if (spentForRanking >= 5001) rankName = "Bạch Kim";
        else if (spentForRanking >= 1001) rankName = "Vàng";
        else if (spentForRanking >= 501) rankName = "Bạc";
        res.json({
            customerInfo: customer[0],
            orderHistory: orders,
            membership: {
                totalSpent: totalSpent,
                rankName: rankName,
                totalOrders: orders.length
            }
        });

    } catch (error) {
        console.error("Lỗi Database Hamoni:", error);
        res.status(500).json({ message: "Lỗi kết nối dữ liệu hệ thống" });
    }
};