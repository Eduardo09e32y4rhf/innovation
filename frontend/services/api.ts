import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
});

// Interceptor: inject token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor: handle 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── AUTH ────────────────────────────────────────────────────────────────
export const AuthService = {
    login: async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        return res.data;
    },
    register: async (data: Record<string, string>) => {
        const res = await api.post('/auth/register', data);
        return res.data;
    },
    me: async () => {
        const res = await api.get('/auth/me');
        return res.data;
    },
    forgotPassword: async (email: string) => {
        const res = await api.post('/auth/forgot-password', { email });
        return res.data;
    },
    resetPassword: async (data: Record<string, string>) => {
        const res = await api.post('/auth/reset-password', data);
        return res.data;
    },
};

// ── DASHBOARD ────────────────────────────────────────────────────────────
export const DashboardService = {
    getMetrics: async () => {
        const res = await api.get('/dashboard/metrics');
        return res.data;
    },
    getRecentActivity: async () => {
        const res = await api.get('/dashboard/recent-activity');
        return res.data;
    },
    getKanban: async () => {
        const res = await api.get('/dashboard/kanban');
        return res.data;
    },
    getHeatmap: async () => {
        const res = await api.get('/dashboard/heatmap');
        return res.data;
    },
    getMissions: async () => {
        const res = await api.get('/dashboard/missions');
        return res.data;
    },
};

// ── JOBS / ATS ────────────────────────────────────────────────────────────
export const ATSService = {
    getJobs: async (params?: { status?: string; search?: string }) => {
        const res = await api.get('/jobs', { params });
        return res.data;
    },
    getPublicJobs: async () => {
        const res = await api.get('/jobs');
        return res.data;
    },
    getCompanyJobs: async () => {
        const res = await api.get('/jobs/company');
        return res.data;
    },
    createJob: async (data: Record<string, unknown>) => {
        const res = await api.post('/jobs', data);
        return res.data;
    },
    updateJob: async (id: number, data: Record<string, unknown>) => {
        const res = await api.patch(`/jobs/${id}`, data);
        return res.data;
    },
    deleteJob: async (id: number) => {
        await api.delete(`/jobs/${id}`);
    },
    getJobApplications: async (jobId: number) => {
        const res = await api.get(`/jobs/${jobId}/applications`);
        return res.data;
    },
    applyToJob: async (jobId: number, data: Record<string, unknown>) => {
        const res = await api.post('/applications', { job_id: jobId, ...data });
        return res.data;
    },
    analyzeCandidate: async (resumeText: string, jobDescription: string) => {
        const res = await api.post('/ai/rank-candidate', { resume_text: resumeText, job_description: jobDescription });
        return res.data;
    },
};

// ── FINANCE ──────────────────────────────────────────────────────────────
export const FinanceService = {
    getSummary: async () => {
        const res = await api.get('/finance/summary');
        return res.data;
    },
    getTransactions: async () => {
        const res = await api.get('/finance/transactions');
        return res.data;
    },
    getPrediction: async () => {
        const res = await api.get('/finance/prediction');
        return res.data;
    },
    getAnomalies: async () => {
        const res = await api.get('/finance/anomalies');
        return res.data;
    },
    createTransaction: async (data: { description: string; amount: number; type: string; due_date: string }) => {
        const res = await api.post('/finance/transactions', data);
        return res.data;
    },
    getLogs: async () => {
        const res = await api.get('/finance/logs');
        return res.data;
    },
};

// ── PROJECTS ─────────────────────────────────────────────────────────────
export const ProjectService = {
    getProjects: async () => {
        const res = await api.get('/projects/');
        return res.data;
    },
    createProject: async (data: { name: string; description?: string }) => {
        const res = await api.post('/projects/', data);
        return res.data;
    },
    deleteProject: async (id: number) => {
        await api.delete(`/projects/${id}`);
    },
    getTasks: async () => {
        const res = await api.get('/projects/all-tasks');
        return res.data;
    },
    createTask: async (data: Record<string, unknown>) => {
        const res = await api.post('/projects/tasks', data);
        return res.data;
    },
    updateTask: async (id: number, data: Record<string, unknown>) => {
        const res = await api.patch(`/projects/tasks/${id}`, data);
        return res.data;
    },
    startTimeTracking: async (taskId: number) => {
        const res = await api.post(`/projects/tasks/${taskId}/start`);
        return res.data;
    },
    stopTimeTracking: async (entryId: number) => {
        const res = await api.post(`/projects/time-entries/${entryId}/stop`);
        return res.data;
    },
    getProjectStats: async (projectId: number) => {
        const res = await api.get(`/projects/${projectId}/stats`);
        return res.data;
    },
};

// ── SUPPORT ──────────────────────────────────────────────────────────────
export const SupportService = {
    getTickets: async () => {
        const res = await api.get('/support/tickets');
        return res.data;
    },
    createTicket: async (data: { title: string; description: string }) => {
        const res = await api.post('/support/tickets', data);
        return res.data;
    },
    getSystemStatus: async () => {
        const res = await api.get('/support/system-status');
        return res.data;
    },
    getSmartReply: async (ticketId: number, description: string) => {
        const res = await api.get(`/support/tickets/${ticketId}/smart-reply`, { params: { description } });
        return res.data;
    },
};

// ── RH ───────────────────────────────────────────────────────────────────
export const RHService = {
    getLeaveRequests: async () => {
        const res = await api.get('/rh/leave-requests');
        return res.data;
    },
    requestLeave: async (data: { start_date: string; end_date: string; reason: string }) => {
        const res = await api.post('/rh/leave-requests', data);
        return res.data;
    },
    submitPulse: async (score: number, comment?: string) => {
        const res = await api.post('/rh/pulse', { score, comment });
        return res.data;
    },
    getBadges: async (employeeId: number) => {
        const res = await api.get(`/rh/employees/${employeeId}/badges`);
        return res.data;
    },
};

// ── PAYMENTS ─────────────────────────────────────────────────────────────
export const PaymentService = {
    createCheckout: async (plan: string) => {
        const res = await api.post('/payments/checkout', { plan });
        return res.data;
    },
};

// ── ENTERPRISE ───────────────────────────────────────────────────────────
export const EnterpriseService = {
    getRealtimeAnalytics: async () => {
        const res = await api.get('/enterprise/analytics/realtime');
        return res.data;
    },
    sendSupportMessage: async (message: string) => {
        const res = await api.post('/enterprise/support/chat', { message, context: {} });
        return res.data;
    },
};

export default api;
