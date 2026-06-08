// src/controllers/uploadController.js
const uploadImage = (req, res) => {
    // Nếu file không tồn tại (do multer không bắt được hoặc lỗi)
    if (!req.file) {
        return res.status(400).json({ message: "Không tìm thấy file ảnh!" });
    }

    // Khi uploadCloud chạy xong, nó sẽ tự động tạo ra một biến req.file.path chứa cái Link Cloudinary
    const imageUrl = req.file.path;

    // Trả cái Link này về cho Frontend
    res.status(200).json({ 
        message: "Upload ảnh thành công!", 
        url: imageUrl 
    });
};

module.exports = { uploadImage };