import axiosClient from './axiosClient';

const orderApi = {
    getOrders: (params) => axiosClient.get('/orders', { params }),
    getRefundAlerts: () => axiosClient.get('/orders/alerts'),
    getCheckoutPreview: (payload = {}) => axiosClient.post('/orderpayment/preview', payload),
    getCheckoutProfile: () => axiosClient.get('/orderpayment/profile'),
    placeOrder: (payload = {}) => axiosClient.post('/orderpayment/place', payload),
    confirmOnlinePayment: (payload) => axiosClient.post('/orderpayment/confirm-online', payload),
    getOnlinePaymentStatus: (orderId) => axiosClient.get(`/orderpayment/status/${orderId}`),
    cancelUnpaidOrder: (payload) => axiosClient.post('/orderpayment/cancel-unpaid', payload),
    getMyOrderHistory: (params = {}) => axiosClient.get('/orderhistory/my-orders', { params }),
    getOrderDetails: (orderId) => axiosClient.get(`/orderdetails/${orderId}`),
    getOrderLogs: (orderId) => axiosClient.get(`/orderdetails/${orderId}/logs`),
    cancelOrder: (payload) => axiosClient.post('/orderpayment/cancel-order', payload)
};

export default orderApi;