const express = require('express');
const router = express.Router();
// Đảm bảo tên file controller chính xác (ví dụ: shoppingcartController.js)
const shoppingcartController = require('../controllers/shoppingcartController');

// GET CART
router.get('/:maKhachHang', shoppingcartController.getCartItems);

// ADD
router.post('/add', shoppingcartController.addToCart);

// UPDATE
router.put('/update', shoppingcartController.updateCartItem);

// DELETE - Sửa từ .post('/delete') thành .delete('/remove') để khớp với Service Frontend của bạn
router.delete('/remove', shoppingcartController.removeCartItem);

// HOLD STOCK
router.post('/hold-stock', shoppingcartController.holdStockFromCart);

// MOVE TO WISHLIST
router.post('/move-to-wishlist', shoppingcartController.moveToWishlist);

module.exports = router;