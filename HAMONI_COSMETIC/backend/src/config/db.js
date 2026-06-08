const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo Connection Pool (Hồ bơi kết nối)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Kiểm tra kết nối khi khởi động
pool.getConnection()
    .then(connection => {
        console.log(`✅ Đã kết nối tới Database: ${process.env.DB_NAME}`);
        connection.release();
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối MySQL:', err.message);
    });

module.exports = pool;