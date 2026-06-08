// routes/homeRoutes.js
const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// "Lễ tân" chỉ đường: Khi ai đó gọi GET /api/home, hãy để "bếp trưởng" getHomeData xử lý
router.get('/', homeController.getHomeData);

module.exports = router;