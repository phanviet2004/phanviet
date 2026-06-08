// src/routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const detailController = require('../controllers/employeeDetailController');
const createController = require('../controllers/employeeCreateController');

// Đặt route /export lên trước để tránh bị nhầm với /:id
router.get('/export', employeeController.exportExcel);
router.get('/', employeeController.getEmployees);
router.delete('/:id', employeeController.deleteEmployee);
router.get('/:id', detailController.getEmployeeById);
router.put('/:id', detailController.updateEmployee);
router.post('/', createController.createEmployee);

module.exports = router;