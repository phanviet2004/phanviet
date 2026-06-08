const express = require('express');
const router = express.Router();
const excelController = require('../controllers/excelController');

router.get('/inventory', excelController.getInventoryListData);
router.get('/export', excelController.exportExcel);

module.exports = router;
