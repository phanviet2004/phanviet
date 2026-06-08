import axiosClient from './axiosClient';
import axios from 'axios';

export const bannerApi = {
    // Lấy danh sách banner, có hỗ trợ tìm kiếm qua params
    getAll: (params = {}) => axiosClient.get('/banners', { params }),
    
    // Thêm mới banner
    create: (data) => axiosClient.post('/banners', data),
    
    // Cập nhật banner theo ID
    update: (id, data) => axiosClient.put(`/banners/${id}`, data),
    
    // Xóa banner
    delete: (id) => axiosClient.delete(`/banners/${id}`),
    
    uploadImage: (formData) => {
    return axios.post('/api/upload', formData);
}
    
};