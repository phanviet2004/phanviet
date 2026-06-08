const express = require("express");
const router = express.Router();

// Import controller vào route
const notificationController = require("../controllers/notificationController");

// 1. Lấy danh sách thông báo của 1 user
// Route: GET /api/notifications/:userId
router.get("/:userId", notificationController.getUserNotifications);

// 2. Đánh dấu 1 thông báo là đã đọc
// Route: PUT /api/notifications/:notifId/read
router.put("/:notifId/read", notificationController.markAsRead);

// 3. Đánh dấu tất cả thông báo của user là đã đọc
// Route: PUT /api/notifications/user/:userId/read-all
router.put("/user/:userId/read-all", notificationController.markAllAsRead);

module.exports = router;
