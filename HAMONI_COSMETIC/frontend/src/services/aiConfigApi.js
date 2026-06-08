import axiosClient from './axiosClient';

export const aiConfigApi = {
    getConfig: () => axiosClient.get('/ai-config/config'),

    train: (formData) => axiosClient.post('/ai-config/train', formData)
};

export default aiConfigApi;