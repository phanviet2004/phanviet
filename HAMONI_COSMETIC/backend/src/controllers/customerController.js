const db = require('../config/db');
const ExcelJS = require('exceljs');

// 1. Lấy danh sách khách hàng
exports.getCustomers = async (req, res) => {
    try {
        const { search, status } = req.query; 
        let sql = 'SELECT MaND, HoTen, SoDienThoai, Email, TrangThai, AvatarUrl FROM NguoiDung WHERE MaQuyen = "CUST"';
        let params = [];
        if (search && search.trim() !== "") {
            sql += ' AND (HoTen LIKE ? OR SoDienThoai LIKE ? OR Email LIKE ? OR CAST(MaND AS CHAR) LIKE ? OR CONCAT("HM-", MaND) LIKE ?)';
            const searchVal = `%${search}%`;
            params.push(searchVal, searchVal, searchVal, searchVal, searchVal);
        }
        if (status && status !== 'Tất cả trạng thái') {
            sql += ' AND TrangThai = ?';
            params.push(status === 'Hoạt động' ? 1 : 0);
        }
        const [rows] = await db.execute(sql, params);
        // Map AvatarUrl thành Avatar để frontend dễ sử dụng
        const mappedRows = rows.map(row => ({
            ...row,
            Avatar: row.AvatarUrl
        }));
        res.json(mappedRows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 2. Lấy chi tiết 1 khách hàng 
exports.getCustomerById = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM NguoiDung WHERE MaND = ? AND MaQuyen = "CUST"', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy khách hàng" });
        }
        const customer = rows[0];
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 2.1 Cập nhật trạng thái khách hàng
exports.updateCustomerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { TrangThai } = req.body;

        const statusValue = Number(TrangThai);
        if (![0, 1].includes(statusValue)) {
            return res.status(400).json({ message: "Trạng thái không hợp lệ" });
        }

        const [result] = await db.execute(
            'UPDATE NguoiDung SET TrangThai = ? WHERE MaND = ? AND MaQuyen = "CUST"',
            [statusValue, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy khách hàng để cập nhật" });
        }

        res.json({ message: "Cập nhật trạng thái thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 3. Xóa khách hàng
exports.deleteCustomer = async (req, res) => {
    try {
        const [result] = await db.execute('DELETE FROM NguoiDung WHERE MaND = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy khách hàng để xóa" });
        }
        res.json({ message: "Xóa thành công!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 4. Xuất File Excel
exports.exportExcel = async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Khách Hàng Hamoni');
        
        sheet.columns = [
            { header: 'ID', key: 'MaND', width: 10 },
            { header: 'Họ Tên', key: 'HoTen', width: 25 },
            { header: 'Email', key: 'Email', width: 25 },
            { header: 'SĐT', key: 'SoDienThoai', width: 15 },
            { header: 'Trạng Thái', key: 'TrangThaiText', width: 15 },
        ];
        const [rows] = await db.execute('SELECT * FROM NguoiDung WHERE MaQuyen = "CUST"');
        const dataForExcel = rows.map(item => ({
            ...item,
            TrangThaiText: item.TrangThai === 1 ? 'Hoạt động' : 'Bị chặn'
        }));
        sheet.addRows(dataForExcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=KhachHang_Hamoni.xlsx');
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};