const db = require('../config/db');

const Customer = {
    // 1. Hàm lấy danh sách
    getAll: async () => {
        const sql = `SELECT * FROM NguoiDung`; 
        const [rows] = await db.execute(sql);
        return rows;
    },
    // 2. Hàm xóa 
    delete: async (id) => {
        try {
            await db.execute('SET FOREIGN_KEY_CHECKS = 0');
            const sql = `DELETE FROM NguoiDung WHERE MaND = ?`;
            const [result] = await db.execute(sql, [id]);
            await db.execute('SET FOREIGN_KEY_CHECKS = 1');
            return result;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = Customer;