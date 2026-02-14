import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Pointing to FastAPI
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to add Token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Enterprise Services
export const EnterpriseService = {
    getRealtimeAnalytics: async () => {
        const response = await api.get('/enterprise/analytics/realtime');
        return response.data;
    },
    sendSupportMessage: async (message: string) => {
        const response = await api.post('/enterprise/support/chat', { message, context: {} });
        return response.data;
    }
};

// Payment Services
export const PaymentService = {
    createPreference: async (title: string, price: number) => {
        const response = await api.post('/payments/create_preference', { title, price });
        return response.data;
    }
}

export default api;
