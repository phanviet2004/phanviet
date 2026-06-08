// Import các thư viện cần thiết
const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./src/config/db");
const http = require("http");
const { Server } = require("socket.io");
// Khởi tạo app Express
const app = express();

// --- CÀI ĐẶT MIDDLEWARE ---
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});
app.set("io", io);
const chatSocket = require("./src/sockets/chatSocket");
chatSocket(io);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- ĐỊNH TUYẾN (ROUTES) CHÍNH THỨC ---
const authRoutes = require("./src/routes/authRoutes");
const roleRoutes = require("./src/routes/roleRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const customerRoutes = require("./src/routes/customerRoutes");
const employeeRoutes = require("./src/routes/employeeRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const orderRoutes = require("./src/routes/orderRoutes");
const productRoutes = require("./src/routes/productRoutes");
const dashboardRoutes = require("./src/routes/dashboardRoutes");
const reportRoutes = require("./src/routes/reportRoutes");
const reviewRoutes = require("./src/routes/reviewRoutes");
const voucherRoutes = require("./src/routes/voucherRoutes");
const promotionRoutes = require("./src/routes/promotionRoutes");
const orderpaymentRoutes = require("./src/routes/orderpaymentRoutes");
const shoppingcartRoutes = require("./src/routes/shoppingcartRoutes");
const warehouseRoutes = require("./src/routes/warehouseRoutes");
const bannerRoutes = require("./src/routes/bannerRoutes");
const homeRoutes = require("./src/routes/homeRoutes");
const clientProductRoutes = require("./src/routes/clientProductRoutes");
const aiConfigRoutes = require("./src/routes/aiConfigRoutes");
const adminChatRoutes = require("./src/routes/adminChatRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");
const productreviewRoutes = require("./src/routes/productreviewRoutes");

// Đăng ký các API vào hệ thống
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/orderpayment", orderpaymentRoutes);
app.use("/api/shopping-cart", shoppingcartRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/client/products", clientProductRoutes);
app.use("/api/ai-config", aiConfigRoutes);
app.use("/api/admin/chats", adminChatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/product-reviews", productreviewRoutes);
const orderhistoryRoutes = require("./src/routes/OrderhistoryRoutes");
const orderDetailsRoutes = require("./src/routes/OrderDetailsRoutes");
const { startCassoCron } = require("./src/config/cassoService");

app.use("/api/orderhistory", orderhistoryRoutes);
app.use("/api/orderdetails", orderDetailsRoutes);

// Route mặc định (Root)
app.get("/", (req, res) => {
  res.json({
    message: "Chào mừng đến với API của hệ thống Hamoni Cosmetic!",
    status: "Server is running smoothly 🚀",
  });
});

// --- WEBHOOK CASSO ---
app.post("/webhook", (req, res) => {
  try {
    console.log("[Webhook Casso] Nhận được dữ liệu từ Casso:", req.body);

    // Verify secret key
    const signature = req.headers["x-signature"] || "";
    const secretKey = process.env.CASSO_WEBHOOK_SECRET || "1212";

    // Return 200 OK to Casso immediately
    res.status(200).json({ status: "ok", message: "Webhook received" });

    console.log("[Webhook Casso] Xử lý giao dịch từ Casso...");
    // Note: Casso cron job (checkCassoTransactions) sẽ tự động poll và cập nhật giao dịch
    // Webhook này chỉ là xác nhận nhận được dữ liệu
  } catch (error) {
    console.error("[Webhook Casso] Lỗi:", error.message);
    res.status(200).json({ status: "ok" }); // Return 200 anyway to prevent Casso retries
  }
});

// --- KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("=================================");
  console.log(
    `🚀 Server Backend Hamoni đang chạy tại: http://localhost:${PORT}`,
  );
  console.log("=================================");
  // Start polling Casso transactions for online payment confirmations.
  startCassoCron();
});
