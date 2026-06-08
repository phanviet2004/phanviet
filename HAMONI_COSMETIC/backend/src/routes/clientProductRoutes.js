const express = require('express');
const router = express.Router();
const clientProductController = require('../controllers/clientProductController');

// Route này bản chất là / (root của file này)
router.get('/', clientProductController.getClientProducts); 
router.get('/page', clientProductController.getClientProductsPageData);

module.exports = router;