const db = require('../config/db');

// Lấy chi tiết 1 nhân viên
const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(
            "SELECT MaND, HoTen, Email, SoDienThoai, TrangThai, MaQuyen, AvatarUrl FROM NguoiDung WHERE MaND = ? AND MaQuyen != 'CUST'",
            [id]
        );
        if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Lỗi lấy chi tiết nhân viên:', error);
        res.status(500).json({ message: "Lỗi server" });
    }
};

// Cập nhật thông tin nhân viên
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { HoTen, Email, SoDienThoai, MaQuyen, TrangThai, AvatarUrl } = req.body;
        await db.execute(
            "UPDATE NguoiDung SET HoTen = ?, Email = ?, SoDienThoai = ?, MaQuyen = ?, TrangThai = ?, AvatarUrl = ? WHERE MaND = ?",
            [HoTen, Email, SoDienThoai, MaQuyen, Number(TrangThai), AvatarUrl || null, id]
        );
        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        console.error('Lỗi cập nhật nhân viên:', error);
        res.status(500).json({ message: "Lỗi khi cập nhật" });
    }
};

// Đừng quên export chúng ra nhé!
module.exports = { getEmployeeById, updateEmployee };