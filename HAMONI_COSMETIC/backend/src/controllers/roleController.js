// src/controllers/roleController.js
const db = require('../config/db');

// 1. HARDCODE DANH SÁCH QUYỀN (ĐẦY ĐỦ FULL CRUD CHO TẤT CẢ MODULE)
const allPermissions = [
    // ---------------- Nhóm Dashboard ----------------
    { MaChucNang: 'HIDE_MODULE_DASHBOARD', TenChucNang: 'Ẩn Dashboard', NhomChucNang: 'Dashboard' },
    { MaChucNang: 'VIEW_DASHBOARD', TenChucNang: 'Xem Dashboard', NhomChucNang: 'Dashboard' },
    { MaChucNang: 'ADD_DASHBOARD', TenChucNang: 'Thêm Dashboard', NhomChucNang: 'Dashboard' },
    { MaChucNang: 'EDIT_DASHBOARD', TenChucNang: 'Sửa Dashboard', NhomChucNang: 'Dashboard' },
    { MaChucNang: 'DELETE_DASHBOARD', TenChucNang: 'Xoá Dashboard', NhomChucNang: 'Dashboard' },

    // ---------------- Nhóm Danh mục ----------------
    { MaChucNang: 'HIDE_MODULE_CATEGORY', TenChucNang: 'Ẩn Danh mục', NhomChucNang: 'Danh mục' },
    { MaChucNang: 'VIEW_CATEGORY', TenChucNang: 'Xem Danh mục', NhomChucNang: 'Danh mục' },
    { MaChucNang: 'ADD_CATEGORY', TenChucNang: 'Thêm Danh mục', NhomChucNang: 'Danh mục' },
    { MaChucNang: 'EDIT_CATEGORY', TenChucNang: 'Sửa Danh mục', NhomChucNang: 'Danh mục' },
    { MaChucNang: 'DELETE_CATEGORY', TenChucNang: 'Xoá Danh mục', NhomChucNang: 'Danh mục' },

    // ---------------- Nhóm Sản phẩm ----------------
    { MaChucNang: 'HIDE_MODULE_PRODUCT', TenChucNang: 'Ẩn Sản phẩm', NhomChucNang: 'Sản phẩm' },
    { MaChucNang: 'VIEW_PRODUCT', TenChucNang: 'Xem Sản phẩm', NhomChucNang: 'Sản phẩm' },
    { MaChucNang: 'ADD_PRODUCT', TenChucNang: 'Thêm Sản phẩm', NhomChucNang: 'Sản phẩm' },
    { MaChucNang: 'EDIT_PRODUCT', TenChucNang: 'Sửa Sản phẩm', NhomChucNang: 'Sản phẩm' },
    { MaChucNang: 'DELETE_PRODUCT', TenChucNang: 'Xoá Sản phẩm', NhomChucNang: 'Sản phẩm' },

    // ---------------- Nhóm Kho hàng ----------------
    { MaChucNang: 'HIDE_MODULE_INVENTORY', TenChucNang: 'Ẩn Kho hàng', NhomChucNang: 'Kho hàng' },
    { MaChucNang: 'VIEW_INVENTORY', TenChucNang: 'Xem Kho hàng', NhomChucNang: 'Kho hàng' },
    { MaChucNang: 'ADD_INVENTORY', TenChucNang: 'Nhập Kho', NhomChucNang: 'Kho hàng' },
    { MaChucNang: 'EDIT_INVENTORY', TenChucNang: 'Sửa Kho hàng', NhomChucNang: 'Kho hàng' },
    { MaChucNang: 'DELETE_INVENTORY', TenChucNang: 'Xóa Kho hàng', NhomChucNang: 'Kho hàng' },

    // ---------------- Nhóm Khuyến mãi ----------------
    { MaChucNang: 'HIDE_MODULE_PROMOTION', TenChucNang: 'Ẩn Khuyến mãi', NhomChucNang: 'Khuyến mãi' },
    { MaChucNang: 'VIEW_PROMOTION', TenChucNang: 'Xem Khuyến mãi', NhomChucNang: 'Khuyến mãi' },
    { MaChucNang: 'ADD_PROMOTION', TenChucNang: 'Thêm Khuyến mãi', NhomChucNang: 'Khuyến mãi' },
    { MaChucNang: 'EDIT_PROMOTION', TenChucNang: 'Sửa Khuyến mãi', NhomChucNang: 'Khuyến mãi' },
    { MaChucNang: 'DELETE_PROMOTION', TenChucNang: 'Xoá Khuyến mãi', NhomChucNang: 'Khuyến mãi' },

    // ---------------- Nhóm Voucher ----------------
    { MaChucNang: 'HIDE_MODULE_VOUCHER', TenChucNang: 'Ẩn Voucher', NhomChucNang: 'Voucher' },
    { MaChucNang: 'VIEW_VOUCHER', TenChucNang: 'Xem Voucher', NhomChucNang: 'Voucher' },
    { MaChucNang: 'ADD_VOUCHER', TenChucNang: 'Thêm Voucher', NhomChucNang: 'Voucher' },
    { MaChucNang: 'EDIT_VOUCHER', TenChucNang: 'Sửa Voucher', NhomChucNang: 'Voucher' },
    { MaChucNang: 'DELETE_VOUCHER', TenChucNang: 'Xoá Voucher', NhomChucNang: 'Voucher' },

    // ---------------- Nhóm Đơn hàng ----------------
    { MaChucNang: 'HIDE_MODULE_ORDER', TenChucNang: 'Ẩn Đơn hàng', NhomChucNang: 'Đơn hàng' },
    { MaChucNang: 'VIEW_ORDER', TenChucNang: 'Xem Đơn hàng', NhomChucNang: 'Đơn hàng' },
    { MaChucNang: 'ADD_ORDER', TenChucNang: 'Thêm Đơn hàng', NhomChucNang: 'Đơn hàng' },
    { MaChucNang: 'EDIT_ORDER', TenChucNang: 'Sửa Đơn hàng', NhomChucNang: 'Đơn hàng' },
    { MaChucNang: 'DELETE_ORDER', TenChucNang: 'Xóa Đơn hàng', NhomChucNang: 'Đơn hàng' },

    // ---------------- Nhóm Khách hàng ----------------
    { MaChucNang: 'HIDE_MODULE_CUSTOMER', TenChucNang: 'Ẩn Khách hàng', NhomChucNang: 'Khách hàng' },
    { MaChucNang: 'VIEW_CUSTOMER', TenChucNang: 'Xem Khách hàng', NhomChucNang: 'Khách hàng' },
    { MaChucNang: 'ADD_CUSTOMER', TenChucNang: 'Thêm Khách hàng', NhomChucNang: 'Khách hàng' },
    { MaChucNang: 'EDIT_CUSTOMER', TenChucNang: 'Sửa Khách hàng', NhomChucNang: 'Khách hàng' },
    { MaChucNang: 'DELETE_CUSTOMER', TenChucNang: 'Xoá Khách hàng', NhomChucNang: 'Khách hàng' },

    // ---------------- Nhóm Nhân viên ----------------
    { MaChucNang: 'HIDE_MODULE_EMPLOYEE', TenChucNang: 'Ẩn Nhân viên', NhomChucNang: 'Nhân viên' },
    { MaChucNang: 'VIEW_EMPLOYEE', TenChucNang: 'Xem Nhân viên', NhomChucNang: 'Nhân viên' },
    { MaChucNang: 'ADD_EMPLOYEE', TenChucNang: 'Thêm Nhân viên', NhomChucNang: 'Nhân viên' },
    { MaChucNang: 'EDIT_EMPLOYEE', TenChucNang: 'Sửa Nhân viên', NhomChucNang: 'Nhân viên' },
    { MaChucNang: 'DELETE_EMPLOYEE', TenChucNang: 'Xóa Nhân viên', NhomChucNang: 'Nhân viên' },

    // ---------------- Nhóm Tương tác ----------------
    { MaChucNang: 'HIDE_MODULE_FEEDBACK', TenChucNang: 'Ẩn Tương tác', NhomChucNang: 'Tương tác' },
    { MaChucNang: 'VIEW_FEEDBACK', TenChucNang: 'Xem Tương tác', NhomChucNang: 'Tương tác' },
    { MaChucNang: 'ADD_FEEDBACK', TenChucNang: 'Thêm Tương tác', NhomChucNang: 'Tương tác' },
    { MaChucNang: 'EDIT_FEEDBACK', TenChucNang: 'Sửa Tương tác', NhomChucNang: 'Tương tác' },
    { MaChucNang: 'DELETE_FEEDBACK', TenChucNang: 'Xóa Tương tác', NhomChucNang: 'Tương tác' },

    // ---------------- Nhóm Giao diện ----------------
    { MaChucNang: 'HIDE_MODULE_BANNER', TenChucNang: 'Ẩn Banner', NhomChucNang: 'Giao diện' },
    { MaChucNang: 'VIEW_BANNER', TenChucNang: 'Xem Banner', NhomChucNang: 'Giao diện' },
    { MaChucNang: 'ADD_BANNER', TenChucNang: 'Thêm Banner', NhomChucNang: 'Giao diện' },
    { MaChucNang: 'EDIT_BANNER', TenChucNang: 'Sửa Banner', NhomChucNang: 'Giao diện' },
    { MaChucNang: 'DELETE_BANNER', TenChucNang: 'Xóa Banner', NhomChucNang: 'Giao diện' },
];

// 2. Lấy tất cả Vai trò (Role) và Chức năng (Permission) để vẽ bảng Ma trận
const getRoleAndPermissions = async (req, res) => {
    try {
        const [roles] = await db.execute('SELECT MaQuyen, TenQuyen, MoTa FROM PHANQUYEN');
        res.status(200).json({ roles, permissions: allPermissions });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu Role:", error);
        res.status(500).json({ message: "Lỗi server nội bộ", error: error.message });
    }
};

// 3. Lấy danh sách các quyền ĐANG ĐƯỢC TÍCH của 1 Vai trò cụ thể
const getPermissionsByRole = async (req, res) => {
    try {
        const { maQuyen } = req.params;
        
        const [rows] = await db.execute(
            'SELECT DanhSachQuyen FROM PHANQUYEN WHERE MaQuyen = ?', 
            [maQuyen]
        );
        
        let assignedPermissions = [];
        if (rows.length > 0 && rows[0].DanhSachQuyen) {
            try {
                assignedPermissions = JSON.parse(rows[0].DanhSachQuyen);
            } catch (e) {
                console.warn("Lỗi parse JSON quyền từ DB:", e);
                assignedPermissions = [];
            }
        }
        
        res.status(200).json(assignedPermissions);
    } catch (error) {
        console.error("Lỗi lấy quyền theo Role:", error);
        res.status(500).json({ message: "Lỗi server nội bộ", error: error.message });
    }
};

// 4. Xử lý khi bấm nút "Lưu thiết lập"
const updateRolePermissions = async (req, res) => {
    try {
        const { maQuyen } = req.params;
        const { permissions } = req.body;

        const jsonString = JSON.stringify(permissions || []);

        await db.execute(
            'UPDATE PHANQUYEN SET DanhSachQuyen = ? WHERE MaQuyen = ?', 
            [jsonString, maQuyen]
        );

        res.status(200).json({ message: "Cập nhật phân quyền thành công!" });

    } catch (error) {
        console.error("Lỗi cập nhật quyền:", error);
        res.status(500).json({ message: "Lỗi khi cập nhật quyền", error: error.message });
    }
};

module.exports = {
    getRoleAndPermissions,
    getPermissionsByRole,
    updateRolePermissions
};