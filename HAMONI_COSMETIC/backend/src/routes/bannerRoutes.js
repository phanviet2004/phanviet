const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');

// Lấy toàn bộ danh sách banner (hỗ trợ search)
router.get('/', bannerController.getBanners);

// Lấy chi tiết 1 banner
router.get('/:id', bannerController.getBannerById);

// Thêm mới banner
router.post('/', bannerController.createBanner);

// Cập nhật banner
router.put('/:id', bannerController.updateBanner);

// Xóa banner
router.delete('/:id', bannerController.deleteBanner);

module.exports = router;