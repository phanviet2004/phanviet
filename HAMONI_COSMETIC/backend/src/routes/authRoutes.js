// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const { verifyToken } = require("../middlewares/authMiddleware");
// Trích xuất thêm forgotPassword, resetPassword
const {
  login,
  register,
  verifyOTP,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

// Khai báo Router
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/login", authController.login);
router.get("/me", verifyToken, authController.getCurrentUser);

router.put("/profile", verifyToken, authController.updateProfile);
router.put("/change-password", verifyToken, authController.changePassword);
router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);

module.exports = router;
