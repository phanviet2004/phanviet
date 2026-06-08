import axiosClient from './axiosClient'; 

const warehouseApi = {
    // dashboard
    getDashboard: () => axiosClient.get('/warehouse/dashboard'),

    // products
    getProducts: () => axiosClient.get('/warehouse/products'),

    getStock: (id) => axiosClient.get(`/warehouse/stock/${id}`),

    // 🔥 đổi tên lại
    createInbound: (data) => axiosClient.post('/warehouse/inbound', data),

    createOutbound: (data) => axiosClient.post('/warehouse/outbound', data),
};

export default warehouseApi;