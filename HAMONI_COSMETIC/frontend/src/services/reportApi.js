import axiosClient from './axiosClient';

const reportApi = {
    getInventoryReport: (params = {}) => {
        return axiosClient.get('/reports/inventory', {
            params
        });
    },
    exportExcel: (params = {}) => {
        return axiosClient.get('/reports/export', {
            params,
            responseType: 'blob'
        });
    }
};

export default reportApi;
