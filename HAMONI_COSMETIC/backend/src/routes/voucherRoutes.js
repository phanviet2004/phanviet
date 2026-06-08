// src/routes/voucherRoutes.js
const express = require('express');
const router = express.Router();

// Import 2 file Controller
const voucherController = require('../controllers/voucherController');
const voucherDetailController = require('../controllers/voucherDetailController');

// ==========================================
// API Dành cho Trang Danh Sách (voucherController)
// ==========================================
router.get('/', voucherController.getAllVouchers);
router.post('/', voucherController.createVoucher);

// ==========================================
// API Dành cho Trang Chi Tiết (voucherDetailController)
// Lưu ý: Các route có chứa param /:id phải đặt ở dưới cùng
// ==========================================
router.get('/:id', voucherDetailController.getDetail);
router.put('/:id', voucherDetailController.updateDetail);
router.patch('/:id/status', voucherDetailController.toggleStatus);

module.exports = router;