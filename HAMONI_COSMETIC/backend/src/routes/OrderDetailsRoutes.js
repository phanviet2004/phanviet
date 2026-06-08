const express = require('express');
const router = express.Router();
const orderDetailsController = require('../controllers/OrderDetailsControllers');

// GET /api/orderdetails/:id -> order detail
router.get('/:id', orderDetailsController.getOrderDetail);

// GET /api/orderdetails/:id/logs -> order logs
router.get('/:id/logs', orderDetailsController.getOrderLogs);

module.exports = router;
