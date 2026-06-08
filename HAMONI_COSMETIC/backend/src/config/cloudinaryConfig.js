// src/config/cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Cấu hình kết nối bằng thông tin trong file .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Cấu hình Kho lưu trữ (Storage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'HAMONI_Uploads', // Tên thư mục nó sẽ tự tạo trên Cloudinary
    resource_type: 'auto', // Tự động nhận diện loại file (ảnh, video...)
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp','mp4','mov'], // Chỉ cho phép up ảnh
    // transformation: [{ width: 500, height: 500, crop: 'limit' }] // Bạn có thể mở comment dòng này nếu muốn tự động thu nhỏ ảnh
  },
});

// 3. Đóng gói thành middleware
const uploadCloud = multer({ storage });

module.exports = uploadCloud;