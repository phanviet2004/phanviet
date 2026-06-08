// src/services/shoppingCartApi.js
import axiosClient from './axiosClient';

const shoppingCartApi = {
  // Lấy danh sách sản phẩm trong giỏ của khách hàng
  getCartItems: (maKhachHang) => {
    return axiosClient.get(`/shopping-cart/${maKhachHang}`);
  },

  // Thêm sản phẩm vào giỏ
  addToCart: (data) => {
    // data bao gồm: { maKhachHang, maBienThe, soLuong }
    return axiosClient.post('/shopping-cart/add', data);
  },

  // Cập nhật số lượng hoặc trạng thái tick chọn (IsSelected)
  updateCartItem: (data) => {
    // data bao gồm: { maKhachHang, maBienThe, soLuong, isSelected }
    return axiosClient.put('/shopping-cart/update', data);
  },

  // Xóa sản phẩm khỏi giỏ
  removeCartItem: (data) => {
    // data bao gồm: { maKhachHang, maBienThe }
    return axiosClient.delete('/shopping-cart/remove', { data });
  },
  holdStock: (data) => {
  return axiosClient.post('/shopping-cart/hold-stock', data);
},
moveToWishlist: (data) => {
    return axiosClient.post('/shopping-cart/move-to-wishlist', data);
  }
};

export default shoppingCartApi;