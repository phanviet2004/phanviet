const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

// ⭐ ROUTES CỤ THỂ (không có :id) PHẢI ĐẶT TRÊN CÙNG
router.get('/variants-for-promo', promotionController.getVariantsForPromo);

// Lấy danh sách chương trình khuyến mãi đang hoạt động (dùng cho dropdown gợi ý)
router.get('/active', promotionController.getActivePromotions);

// ⭐ ROUTES CÓ :id/path PHẢI TRƯỚC :id ĐƠN GIẢN
router.get('/:id/products', promotionController.getPromotionProducts);

// ⭐ ROUTES CHUNG (GET list, POST)
router.get('/', promotionController.getAllPromotions);
router.post('/', promotionController.createPromotion);

// ⭐ ROUTES CÓ :id ĐƠN GIẢN ĐẶT CUỐI CÙNG
router.get('/:id', promotionController.getPromotionDetail);
router.put('/:id', promotionController.updatePromotion);
router.delete('/:id', promotionController.deletePromotion);

module.exports = router;    