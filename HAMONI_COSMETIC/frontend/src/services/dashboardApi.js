// src/services/dashboardApi.js
import axiosClient from './axiosClient';

const dashboardApi = {
  // Lấy dữ liệu bảng & thống kê
  getOverview: (params = {}) => axiosClient.get('/dashboard/overview', { params }),

  // Lấy dữ liệu chart
  getCharts: (params = {}) => axiosClient.get('/dashboard/charts', { params }),

  // Lấy dữ liệu dropdown bộ lọc
  getFilters: (params = {}) => axiosClient.get('/dashboard/filters', { params }),
  exportExcel: (params) =>
    axiosClient.get('/dashboard/export', {
      params,
      responseType: 'blob'
    })
  
};

export default dashboardApi;