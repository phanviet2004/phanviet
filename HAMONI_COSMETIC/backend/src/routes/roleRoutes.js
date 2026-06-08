// src/routes/roleRoutes.js
const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Khai báo 3 đường dẫn API tương ứng với axios trong roleApi.js ở Frontend
router.get('/', verifyToken, roleController.getRoleAndPermissions); 
router.get('/:maQuyen/permissions', verifyToken, roleController.getPermissionsByRole); 
router.post('/:maQuyen/permissions', verifyToken, roleController.updateRolePermissions);

module.exports = router;