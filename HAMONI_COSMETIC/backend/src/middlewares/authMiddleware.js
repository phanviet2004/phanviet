const jwt = require('jsonwebtoken');
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Truy cập bị từ chối. Không tìm thấy Token xác thực!" });
    }

    const token = authHeader.split(' ')[1];

    try {
        const jwtSecret = process.env.JWT_SECRET || 'HAMONI_SECRET_KEY_2026';
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;

        next();
    } catch (error) {
        return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại!" });
    }
};

module.exports = {
    verifyToken
};