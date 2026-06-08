import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ==========================================
// 0. IMPORT COMPONENTS
// ==========================================
import ScrollRestoration from "../components/ScrollRestoration";

// ==========================================
// 1. IMPORT LAYOUTS
// ==========================================
import AdminLayout from "../layouts/AdminLayout/AdminLayout";
import ClientLayout from "../layouts/ClientLayout/ClientLayout";

// ==========================================
// 2. IMPORT CLIENT PAGES (Khách hàng)
// ==========================================

import Home from "../pages/client/home/Home";
import ClientProducts from "../pages/client/products/ClientProducts";
import ProductDetailView from "../pages/client/ProductDetailView/ProductDetailView";
import ShoppingCart from "../pages/client/Cart/ShoppingCart";
import OrderPayment from "../pages/client/Payment/orderpayment";
import OrderHistory from "../pages/client/Orderhistory/Orderhistory";
import ClientOrderDetail from "../pages/client/Orderhistory/OrderDetails";
import CustomerProfile from "../pages/client/Profile/CustomerProfile";
import PromotionClient from "../pages/client/PromotionClient/PromotionClient";
import PromotionDetailClient from "../pages/client/PromotionClient/PromotionDetailClient";

// ==========================================
// 3. IMPORT AUTH PAGES (Xác thực)
// ==========================================
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import AuthPage from "../pages/auth/AuthPage";
import OTP from "../pages/auth/OTP";
import ForgotPassword from "../pages/auth/ForgotPassword";

// ==========================================
// 4. IMPORT ADMIN PAGES (Quản trị)
// ==========================================
import RoleManagement from "../pages/admin/RoleManagement";
import CustomerManagement from "../pages/admin/Customer/CustomerManagement";
import CustomerDetail from "../pages/admin/Customer/CustomerDetail";
import CategoryManagement from "../pages/admin/category/CategoryManagement";
import CategoryForm from "../pages/admin/category/CategoryForm";
import EmployeeManagement from "../pages/admin/Employee/EmployeeManagement";
import EmployeeDetail from "../pages/admin/Employee/EmployeeDetail";
import EmployeeForm from "../pages/admin/Employee/EmployeeForm";
import Profile from "../pages/admin/Profile/Profile";
import OrderManagement from "../pages/admin/Order/OrderManagement";
import OrderDetail from "../pages/admin/Order/OrderDetailModal";
import OrderLogsPage from "../pages/admin/Order/OrderLogsPage";
import ProductManagement from "../pages/admin/Product/ProductManagement";
import ProductCreate from "../pages/admin/Product/ProductCreate";
import ProductDetail from "../pages/admin/Product/ProductDetail";
import Dashboard from "../pages/admin/Dashboard/DashboardOverview";
import ProductInventoryReport from "../pages/admin/Dashboard/ProductInventoryReport";
import ReviewManagement from "../pages/admin/Reviews/ReviewManagement";
import VoucherManagement from "../pages/admin/Voucher/VoucherManagement";
import VoucherDetail from "../pages/admin/Voucher/VoucherDetail";
import PromotionManagement from "../pages/admin/Promotion/PromotionManagement";
import PromotionCreate from "../pages/admin/Promotion/PromotionCreate";
import PromotionDetail from "../pages/admin/Promotion/PromotionDetail";
import WarehouseManagement from "../pages/admin/Warehouse/WarehouseManagement";
import WarehouseLog from "../pages/admin/Warehouse/WarehouseLog";
import BannerManagement from "../pages/admin/Banner/BannerManagement";
import AiConfigPage from "../pages/admin/AI/AiConfigPage";
import AdminChat from "../pages/admin/AI/AdminChatPage";
import ProductReview from "../pages/client/ProductReview/ProductReview";

const NotFound = () => (
  <div className="flex justify-center items-center h-screen text-2xl font-bold text-gray-500">
    404 - Không tìm thấy trang
  </div>
);

const ADMIN_ROLES = new Set(["ADMIN", "STAFF"]);

const getStoredAuth = () => {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (!token || !userRaw) {
    return { token: null, user: null };
  }

  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { token: null, user: null };
  }
};

const getRoleCode = (user) =>
  String(user?.maQuyen || user?.MaQuyen || user?.role || "").toUpperCase();

const getPostLoginPath = (user) =>
  ADMIN_ROLES.has(getRoleCode(user)) ? "/admin/dashboard" : "/";

const AuthRoute = ({ children }) => {
  const { token, user } = getStoredAuth();

  if (token && user) {
    return <Navigate to={getPostLoginPath(user)} replace />;
  }

  return children;
};

const ClientRoute = ({ children }) => {
  const { token, user } = getStoredAuth();

  if (token && user && ADMIN_ROLES.has(getRoleCode(user))) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// --- BẢO VỆ ĐƯỜNG DẪN ADMIN ---
const AdminRoute = ({ children }) => {
  const { token, user } = getStoredAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAdminAreaAllowed = ADMIN_ROLES.has(getRoleCode(user));

  if (!isAdminAreaAllowed) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const AppRouter = () => {
  // Try to read logged-in user to provide MaND for test route
  let _storedUser = null;
  try {
    _storedUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    _storedUser = null;
  }
  const testMaND =
    _storedUser?.MaND || _storedUser?.id || _storedUser?.MaKhachHang || null;
  return (
    <BrowserRouter>
      <ScrollRestoration />
      <Routes>
        {/* ==========================================

                    KHU VỰC 1: XÁC THỰC (Không cần Layout)
                    ========================================== */}
        <Route
          path="/forgot-password"
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          }
        />
        {/* <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> */}
        <Route path="/otp" element={<OTP />} />
        <Route
          path="/quen-mat-khau"
          element={
            <AuthRoute>
              <ForgotPassword />
            </AuthRoute>
          }
        />
        <Route
          path="/login"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />

        {/* ==========================================
                    KHU VỰC 2: KHÁCH HÀNG (Sử dụng ClientLayout)
                    ========================================== */}

        <Route
          path="/"
          element={
            <ClientRoute>
              <ClientLayout />
            </ClientRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="products" element={<ClientProducts />} />
          <Route path="promotions" element={<PromotionClient />} />
          {/* Thêm đúng 1 dòng Route này để web hiểu link /khuyen-mai/2 */}
          <Route path="khuyen-mai/:id" element={<PromotionDetailClient />} />
          <Route path="gio-hang" element={<ShoppingCart />} />
          <Route path="cart" element={<ShoppingCart />} />
          <Route path="product/:productId" element={<ProductDetailView />} />
          <Route path="orderpayment" element={<OrderPayment />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orderhistory" element={<OrderHistory />} />
          <Route path="order/:id" element={<ClientOrderDetail />} />

          {/* CHÈN NGAY TẠI ĐÂY LÀ CHUẨN NHẤT NÈ */}
          <Route
            path="test-review"
            element={
              <ProductReview
                MaSP={1}
                MaDH={22}
                MaND={testMaND}
                productName="Huile Botanique Éclat"
                trangThaiDonHang="HoanThanh"
              />
            }
          />
        </Route>

        {/* ==========================================
                    KHU VỰC 3: QUẢN TRỊ VIÊN (Sử dụng AdminLayout + Bọc AdminRoute)
                    ========================================== */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<ProductManagement />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="customer-detail/:id" element={<CustomerDetail />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="categories/add" element={<CategoryForm />} />
          <Route path="categories/edit/:id" element={<CategoryForm />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="employee" element={<EmployeeManagement />} />
          <Route path="employee/add" element={<EmployeeForm />} />
          <Route path="employee/edit/:id" element={<EmployeeForm />} />
          <Route path="employee-detail/:id" element={<EmployeeDetail />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="products/add" element={<ProductCreate />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="orders" element={<OrderManagement />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/logs" element={<OrderLogsPage />} />
          <Route path="warehouse" element={<WarehouseManagement />} />
          <Route path="warehouse-logs" element={<WarehouseLog />} />
          <Route path="inventory-report" element={<ProductInventoryReport />} />
          <Route path="banners" element={<BannerManagement />} />
          <Route path="banners/add" element={<BannerManagement />} />
          <Route path="banners/edit/:id" element={<BannerManagement />} />
          <Route path="promotions" element={<PromotionManagement />} />
          <Route path="promotions/create" element={<PromotionCreate />} />
          <Route path="promotions/:id" element={<PromotionDetail />} />
          <Route path="vouchers" element={<VoucherManagement />} />
          <Route path="vouchers/:id" element={<VoucherDetail />} />
          <Route path="voucher-detail/:id" element={<VoucherDetail />} />
          <Route path="voucherdetail/:id" element={<VoucherDetail />} />
          <Route path="reviews" element={<ReviewManagement />} />
          <Route path="ai-config" element={<AiConfigPage />} />
          <Route path="chats" element={<AdminChat />} />
        </Route>

        {/* Trang 404 cho các đường dẫn sai */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
