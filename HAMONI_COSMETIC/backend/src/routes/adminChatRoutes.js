const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Đảm bảo đường dẫn này trỏ đúng tới file cấu hình MySQL của bạn

// 1. API Lấy danh sách các hộp thoại chat (Cho cột bên trái)
// Mounted at '/api/admin/chats' so use '/' here
router.get('/', async (req, res) => {
    try {
        // Truy vấn lấy các phiên chat, gộp tên người dùng và lấy tin nhắn cuối cùng
        const query = `
            SELECT 
                p.MaPhien, 
                p.SessionID, 
                p.TrangThai as status, 
                p.NgayCapNhat,
                p.MaND,
                COALESCE(u.HoTen, 'Khách vãng lai') as customerName,
                (SELECT NoiDung FROM ChiTietChat c WHERE c.MaPhien = p.MaPhien ORDER BY NgayGui DESC LIMIT 1) as lastMessage,
                (SELECT NgayGui FROM ChiTietChat c WHERE c.MaPhien = p.MaPhien ORDER BY NgayGui DESC LIMIT 1) as lastMessageTime
            FROM PhienChat p
            LEFT JOIN NguoiDung u ON p.MaND = u.MaND
            ORDER BY 
                CASE WHEN p.TrangThai = 'pending' THEN 1 ELSE 2 END, 
                lastMessageTime DESC,
                p.NgayCapNhat DESC
        `;
        
        const [rows] = await db.query(query);
        
        // Format lại dữ liệu để khớp 100% với Frontend đang chờ
        const formattedSessions = rows.map(r => {
            const timeToUse = r.lastMessageTime || r.NgayCapNhat;
            return {
                maPhien: r.MaPhien,
                roomName: r.MaND ? `CUST_${r.MaND}` : `GUEST_${r.SessionID}`,
                customerName: r.customerName,
                status: r.status,
                lastMessage: r.lastMessage || 'Bắt đầu chat...',
                time: new Date(timeToUse).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
        });
        
        res.status(200).json(formattedSessions);
    } catch (error) {
        console.error("Lỗi lấy danh sách chat:", error);
        res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách chat' });
    }
});

// 2. API Lấy chi tiết lịch sử tin nhắn của 1 phiên chat (Khi click vào 1 người)
// Mounted at '/api/admin/chats' so use '/:maPhien' here
router.get('/:maPhien', async (req, res) => {
    const maPhien = req.params.maPhien;
    
    try {
        const query = `
            SELECT MaTinNhan as id, VaiTro, NoiDung as text, NgayGui 
            FROM ChiTietChat 
            WHERE MaPhien = ? 
            ORDER BY NgayGui ASC
        `;
        
        const [rows] = await db.query(query, [maPhien]);
        
        // Format lại quyền gửi tin nhắn cho Frontend dễ render màu sắc
        const formattedMessages = rows.map(r => ({
            id: r.id,
            // Chuyển đổi quyền từ DB sang quyền của Giao diện
            senderType: r.VaiTro === 'CUST' ? 'USER' : r.VaiTro, // 'BOT', 'STAFF', hoặc 'ADMIN'
            text: r.text,
            time: new Date(r.NgayGui).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        
        res.status(200).json(formattedMessages);
    } catch (error) {
        console.error(`Lỗi lấy chi tiết chat của phiên ${maPhien}:`, error);
        res.status(500).json({ error: 'Lỗi máy chủ khi lấy chi tiết tin nhắn' });
    }
});

module.exports = router;