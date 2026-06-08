import axiosClient from './axiosClient';

const reviewApi = {

    // ===== STATS =====
    getStats: () => {
        return axiosClient.get('/reviews/stats');
    },

    // 🔥 [MỚI THÊM] ===== LẤY DANH SÁCH SẢN PHẨM CHO SIDEBAR =====
    getSidebarProducts: () => {
        return axiosClient.get('/reviews/sidebar-products');
    },

    // ===== GET ALL + FILTER + SEARCH =====
    getAll: (params = {}) => {
        return axiosClient.get('/reviews', { params });
    },

    // ===== UPDATE STATUS =====
    updateStatus: (id, status) => {
        return axiosClient.put(`/reviews/${id}/status`, {
            status
        });
    },

    // ===== REPLY (FIX CHUẨN) =====
    replyReview: (id, replyComment) => {
        return axiosClient.put(`/reviews/${id}/reply`, {
            replyComment: replyComment   // ✅ đúng format BE
        });
    },

};

export default reviewApi;