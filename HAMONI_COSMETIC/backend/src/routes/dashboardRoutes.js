const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/filters', dashboardController.getFilters);
router.get('/overview', dashboardController.getOverview);
router.get('/charts', dashboardController.getCharts);
router.get('/export', dashboardController.exportExcel);

module.exports = router;