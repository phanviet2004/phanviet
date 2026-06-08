const express = require("express");
const router = express.Router();

// Trỏ đến file controller của bạn
const categoryController = require("../controllers/categoryController");

// Lưu ý: Route /export phải đặt TRƯỚC route /:id để tránh bị nhầm lẫn tham số
router.get("/export", categoryController.exportCategoryExcel);

router.get("/", categoryController.getAllCategories);
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

module.exports = router;