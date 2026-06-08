// src/services/variantApi.js
import axiosClient from './axiosClient';

const variantApi = {
    getAll: (search) => axiosClient.get('/variants', { params: { search } }),

    create: (data) => axiosClient.post('/variants', data),

    update: (id, data) => axiosClient.put(`/variants/${id}`, data),

    delete: (id) => axiosClient.delete(`/variants/${id}`),

    exportExcel: () => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        window.location.href = `${baseUrl}/variants/export`;
    }
};

export default variantApi;