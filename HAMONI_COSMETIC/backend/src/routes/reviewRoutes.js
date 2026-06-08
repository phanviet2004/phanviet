const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// ===== STATS =====
router.get('/stats', reviewController.getReviewStats); 

// 🔥 [MỚI THÊM] ===== SIDEBAR SẢN PHẨM =====
// Lưu ý: Đặt route này trước các route chung hoặc route có /:id
router.get('/sidebar-products', reviewController.getSidebarProducts);

// ===== GET ALL REVIEWS =====
router.get('/', reviewController.getAllReviews);

// ===== UPDATE STATUS & REPLY =====
router.put('/:id/status', reviewController.updateStatus);
router.put('/:id/reply', reviewController.replyReview);

module.exports = router;
module.exports = router;

