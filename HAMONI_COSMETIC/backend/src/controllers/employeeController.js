// src/controllers/employeeController.js
const db = require('../config/db');
const excelJS = require('exceljs');

// 1. Lấy danh sách nhân viên (Đã xóa cột PhongBan)
const getEmployees = async (req, res) => {
    try {
        const { search, status } = req.query;
        
        // Bỏ PhongBan khỏi lệnh SELECT
        let query = "SELECT MaND, HoTen, Email, SoDienThoai, TrangThai, MaQuyen, AvatarUrl FROM NguoiDung WHERE MaQuyen != 'CUST'";
        let queryParams = [];

        if (search) {
            query += " AND (HoTen LIKE ? OR Email LIKE ? OR SoDienThoai LIKE ?)";
            const searchParam = `%${search}%`;
            queryParams.push(searchParam, searchParam, searchParam);
        }

        if (status && status !== 'Tất cả trạng thái') {
            const statusVal = status === 'Hoạt động' ? 1 : 0;
            query += " AND TrangThai = ?";
            queryParams.push(statusVal);
        }

        query += " ORDER BY MaND DESC";

        const [rows] = await db.execute(query, queryParams);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Lỗi lấy danh sách nhân viên:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 2. Ngưng hoạt động
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('UPDATE NguoiDung SET TrangThai = 0 WHERE MaND = ?', [id]);
        res.status(200).json({ message: "Đã khóa tài khoản nhân viên thành công!" });
    } catch (error) {
        console.error("Lỗi khóa nhân viên:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

// 3. Xuất file Excel (Đã cấu hình lại cột)
const exportExcel = async (req, res) => {
    try {
        // Bỏ PhongBan khỏi lệnh SELECT
        const [rows] = await db.execute("SELECT MaND, HoTen, Email, SoDienThoai, TrangThai, MaQuyen FROM NguoiDung WHERE MaQuyen != 'CUST' ORDER BY MaND DESC");

        const workbook = new excelJS.Workbook();
        const worksheet = workbook.addWorksheet('DanhSachNhanVien');

        // Bỏ cột Phòng Ban khỏi Excel
        worksheet.columns = [
            { header: 'Mã NV', key: 'MaND', width: 10 },
            { header: 'Họ Tên', key: 'HoTen', width: 25 },
            { header: 'Vai Trò', key: 'MaQuyen', width: 15 },
            { header: 'Email', key: 'Email', width: 30 },
            { header: 'Số Điện Thoại', key: 'SoDienThoai', width: 15 },
            { header: 'Trạng Thái', key: 'TrangThai', width: 15 }
        ];

        rows.forEach(row => {
            row.MaND = `NV-${row.MaND}`;
            row.TrangThai = row.TrangThai === 1 ? 'Hoạt động' : 'Ngoại tuyến';
            worksheet.addRow(row);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=DanhSachNhanVien.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Lỗi xuất Excel:", error);
        res.status(500).json({ message: "Lỗi xuất file" });
    }
};

module.exports = { getEmployees, deleteEmployee, exportExcel };