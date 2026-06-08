const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Route lấy dữ liệu JSON báo cáo
router.get('/inventory', reportController.getInventoryReport);

// Route xuất file Excel (Lưu ý: Route này được gọi trực tiếp bằng thẻ <a> hoặc window.open trên Frontend)
router.get('/export', reportController.exportExcel);

module.exports = router;