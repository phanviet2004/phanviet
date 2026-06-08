const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const orderhistoryController = require('../controllers/OrderhistoryController');

router.get('/my-orders', verifyToken, orderhistoryController.getMyOrderHistory);

module.exports = router;
