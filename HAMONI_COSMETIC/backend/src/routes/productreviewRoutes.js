const express = require('express');
const router = express.Router();
const productreviewController = require('../controllers/productreviewController');
const uploadCloud = require('../config/cloudinaryConfig');

// Bọc Multer vào hàm để tự tay bắt lỗi, chấm dứt lỗi HTML [object Object]
router.post('/create', function (req, res, next) {
  // BẮT BUỘC phải là 'HinhAnh' (Khớp 100% với formData.append("HinhAnh", file) ở Frontend)
  const upload = uploadCloud.array('HinhAnh', 10); 
  
  upload(req, res, function (err) {
    if (err) {
      console.error("🔥 LỖI TỪ CLOUDINARY/MULTER:");
      console.dir(err, { depth: null }); 
      
      return res.status(500).json({ 
        success: false, 
        message: "Lỗi tải ảnh/video lên mây: " + (err.message || JSON.stringify(err))
      });
    }
    next();
  });
}, productreviewController.createReview);

module.exports = router;