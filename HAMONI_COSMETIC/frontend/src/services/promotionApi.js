import axiosClient from './axiosClient';

const promotionApi = {
    // Lấy danh sách tất cả chương trình khuyến mãi
    getAll: () => axiosClient.get('/promotions'),
    
    // Lấy chi tiết 1 chương trình khuyến mãi
    getDetail: (id) => axiosClient.get(`/promotions/${id}`),
    
    // Lấy sản phẩm của chương trình khuyến mãi
    getProducts: (id) => axiosClient.get(`/promotions/${id}/products`),
};

export default promotionApi;
