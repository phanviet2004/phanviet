const express = require('express');
const router = express.Router();

const warehouseController = require('../controllers/warehouseController');
const warehouseLogController = require('../controllers/warehouseLogController');

// ===== DASHBOARD =====
router.get('/dashboard', warehouseController.getDashboard);

// ===== INVENTORY =====
router.get('/products', warehouseLogController.getProducts);
router.get('/stock/:id', warehouseLogController.getStock);

router.post('/inbound', warehouseLogController.createInbound);
router.post('/outbound', warehouseLogController.createOutbound);

module.exports = router;