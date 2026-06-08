// frontend/src/services/roleApi.js
import axiosClient from './axiosClient';

const roleApi = {
    getAll: () => {
        return axiosClient.get('/roles');
    },
    
    getPermissions: (maQuyen) => {
        return axiosClient.get(`/roles/${maQuyen}/permissions`);
    },
    
    updatePermissions: (maQuyen, permissions) => {
        return axiosClient.post(`/roles/${maQuyen}/permissions`, { permissions });
    }
};

export default roleApi;