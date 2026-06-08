// src/services/categoryApi.js
import axiosClient from './axiosClient';

export const categoryApi = {
    // Chỉ cần ghi endpoint tương đối, axiosClient sẽ tự cộng với BASE_URL
    getAll: (search) => axiosClient.get('/categories', { params: { search } }),
    
    create: (data) => axiosClient.post('/categories', data),
    
    update: (id, data) => axiosClient.put(`/categories/${id}`, data),
    
    delete: (id) => axiosClient.delete(`/categories/${id}`),
    
    // Riêng tải file xuất Excel thì phải dùng window.location nên cần gọi biến môi trường
    exportExcel: () => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        window.location.href = `${baseUrl}/categories/export`;
    }
};