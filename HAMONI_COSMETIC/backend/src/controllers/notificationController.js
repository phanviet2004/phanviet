const db = require("../config/db"); // Đường dẫn trỏ tới file config MySQL của bạn

const formatNotification = (row) => ({
  id: row.MaTB,
  title: row.TieuDe,
  content: row.NoiDung,
  isRead: row.TrangThaiDoc === 1,
  // ĐIỂM THAY ĐỔI: Trả về thẳng thời gian gốc để Frontend tự hiển thị cả Ngày lẫn Giờ cho đẹp
  time: row.NgayTao,
});

const createNotification = async ({ userId, title, content, io }) => {
  const recipientId = Number(userId);

  if (
    !Number.isInteger(recipientId) ||
    recipientId <= 0 ||
    !title ||
    !content
  ) {
    return null;
  }

  const [result] = await db.query(
    `INSERT INTO ThongBao (MaND, TieuDe, NoiDung, TrangThaiDoc, NgayTao)
         VALUES (?, ?, ?, 0, NOW())`,
    [recipientId, title, content],
  );

  const [rows] = await db.query(
    `SELECT MaTB, TieuDe, NoiDung, TrangThaiDoc, NgayTao
         FROM ThongBao
         WHERE MaTB = ?`,
    [result.insertId],
  );

  const notification = rows[0] ? formatNotification(rows[0]) : null;

  if (notification && io) {
    io.to(`NOTIF_${recipientId}`).emit("new_notification", notification);
  }

  return notification;
};

const notificationController = {
  // 1. LẤY DANH SÁCH THÔNG BÁO CỦA MỘT USER
  getUserNotifications: async (req, res) => {
    const userId = req.params.userId;
    try {
      const [rows] = await db.query(
        `SELECT MaTB, TieuDe, NoiDung, TrangThaiDoc, NgayTao 
                 FROM ThongBao 
                 WHERE MaND = ? 
                 ORDER BY NgayTao DESC`,
        [userId],
      );

      const formattedNotifs = rows.map(formatNotification);

      res.status(200).json(formattedNotifs);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách thông báo:", error);
      res.status(500).json({ error: "Lỗi máy chủ khi lấy thông báo" });
    }
  },

  // 2. ĐÁNH DẤU 1 THÔNG BÁO LÀ ĐÃ ĐỌC
  markAsRead: async (req, res) => {
    const notifId = req.params.notifId;
    try {
      await db.query(`UPDATE ThongBao SET TrangThaiDoc = 1 WHERE MaTB = ?`, [
        notifId,
      ]);
      res.status(200).json({ message: "Đã cập nhật trạng thái đọc" });
    } catch (error) {
      console.error(`Lỗi khi đánh dấu đã đọc cho thông báo ${notifId}:`, error);
      res.status(500).json({ error: "Lỗi máy chủ khi cập nhật thông báo" });
    }
  },

  // 3. ĐÁNH DẤU TẤT CẢ THÔNG BÁO LÀ ĐÃ ĐỌC
  markAllAsRead: async (req, res) => {
    const userId = req.params.userId;
    try {
      await db.query(
        `UPDATE ThongBao SET TrangThaiDoc = 1 WHERE MaND = ? AND TrangThaiDoc = 0`,
        [userId],
      );
      res.status(200).json({ message: "Đã đánh dấu đọc tất cả" });
    } catch (error) {
      console.error(`Lỗi khi đánh dấu đọc tất cả cho user ${userId}:`, error);
      res
        .status(500)
        .json({ error: "Lỗi máy chủ khi cập nhật tất cả thông báo" });
    }
  },
};

notificationController.createNotification = createNotification;

module.exports = notificationController;
