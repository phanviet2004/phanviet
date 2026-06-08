import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
    persist(
        (set) => ({
            // ==========================================
            // 1. THEME STATE (Giao diện Sáng/Tối)
            // ==========================================
            isDarkMode: false,
            toggleDarkMode: () => set((state) => {
                const newMode = !state.isDarkMode;
                if (newMode) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
                return { isDarkMode: newMode };
            }),

            // ==========================================
            // 2. USER STATE (Quản lý Đăng nhập)
            // ==========================================
            user: null, // null nghĩa là Khách vãng lai (Guest)
            
            // Gọi hàm này khi API Đăng nhập trả về thành công
            loginSuccess: (userData) => set({ user: userData }),
            
            // Gọi hàm này khi bấm Đăng xuất
            logout: () => set({ user: null }),

            // ==========================================
            // 3. CART STATE (Quản lý Giỏ hàng Local)
            // ==========================================
            cartItems: [], // Mảng chứa chi tiết các sản phẩm đã thêm
            cartCount: 0,  // Tổng số lượng sản phẩm (tính cộng tất cả)
            cartVariantCount: 0, // Số loại/biến thể sản phẩm khác nhau
            
            // Hàm thêm vào giỏ (Nâng cấp)
            addToCart: (product = {}, quantity = 1) => set((state) => {
                // Kiểm tra xem sản phẩm này (với đúng ID và Biến thể) đã có trong giỏ chưa
                // Dùng id tạm thời để check. Tuỳ logic DB của bạn có thể dùng MaSP
                const productId = product.id || product.MaSP || Date.now(); 
                
                const existingItemIndex = state.cartItems.findIndex(item => item.id === productId);
                
                let newCartItems = [...state.cartItems];
                
                if (existingItemIndex >= 0) {
                    // Nếu đã có trong giỏ -> Tăng số lượng
                    newCartItems[existingItemIndex].quantity += quantity;
                } else {
                    // Nếu chưa có -> Thêm sản phẩm mới vào mảng
                    newCartItems.push({ ...product, id: productId, quantity });
                }

                // Tính lại tổng số lượng hiển thị trên Icon Navbar
                const newCount = newCartItems.reduce((total, item) => total + item.quantity, 0);
                // Tính số loại sản phẩm (số phần tử trong mảng)
                const newVariantCount = newCartItems.length;

                return { cartItems: newCartItems, cartCount: newCount, cartVariantCount: newVariantCount };
            }),

            // Hàm Dọn dẹp: Dùng ngay sau khi đồng bộ (Merge Cart) lên DB thành công
            clearLocalCart: () => set({ cartItems: [], cartCount: 0, cartVariantCount: 0 }),

            // Hàm đồng bộ giỏ hàng từ backend (dùng khi lấy data từ API)
            syncCartFromBackend: (backendCartItems = []) => set(() => {
                const processedItems = (Array.isArray(backendCartItems) ? backendCartItems : []).map(item => ({
                    id: item.MaBienThe || item.id,
                    MaSP: item.MaSP,
                    quantity: item.SoLuong || 1,
                }));
                
                const totalCount = processedItems.reduce((total, item) => total + (item.quantity || 1), 0);
                const variantCount = processedItems.length;
                
                return { cartItems: processedItems, cartCount: totalCount, cartVariantCount: variantCount };
            }),
        }),
        {
            name: 'hamoni-storage', // Tên key sẽ xuất hiện trong Application > Local Storage của trình duyệt
            
            // Tùy chọn nâng cao: Chỉ lưu Giỏ hàng và Theme vào LocalStorage, không lưu User (để User phụ thuộc vào Token bảo mật hơn)
            partialize: (state) => ({ 
                cartItems: state.cartItems, 
                cartCount: state.cartCount, 
                cartVariantCount: state.cartVariantCount,
                isDarkMode: state.isDarkMode,
                user: state.user
            }),
        }
    )
);