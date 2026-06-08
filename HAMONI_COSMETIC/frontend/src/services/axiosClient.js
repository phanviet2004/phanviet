// src/services/axiosClient.js
import axios from 'axios';

// 1. Khởi tạo cấu hình mặc định
const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. Interceptor cho Request: Tự động gắn Token trước khi gửi lên Backend
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 3. Interceptor cho Response: Xử lý dữ liệu trả về
axiosClient.interceptors.response.use(
    (response) => {
        // Nếu API trả về thành công, ta chỉ lấy phần data (bỏ qua headers, status của HTTP)
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    (error) => {
        // Nếu Token hết hạn hoặc sai (lỗi 401), xử lý tập trung ở đây
        if (error.response && error.response.status === 401) {
            console.warn("Phiên đăng nhập hết hạn!");
            // localStorage.clear();
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default axiosClient;