// src/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadCloud = require('../config/cloudinaryConfig'); // Import middleware đã cấu hình sẵn

// Gọi uploadCloud.single theo dạng callback để bắt lỗi rõ ràng
router.post('/', (req, res) => {
    uploadCloud.single('image')(req, res, (err) => {
        if (err) {
            console.error('[UploadRoutes] Multer/Cloudinary error:', err);
            return res.status(500).json({ message: 'Lỗi khi upload ảnh', error: err.message });
        }

        // Nếu multer không tạo ra req.file
        if (!req.file) {
            console.warn('[UploadRoutes] No file found in request', { body: req.body });
            return res.status(400).json({ message: "Không tìm thấy file ảnh!" });
        }

        // Log thông tin file trả về để debug
        console.debug('[UploadRoutes] Uploaded file info:', req.file);

        // Trả link Cloudinary về cho client
        res.status(200).json({ url: req.file.path });
    });
});

module.exports = router;