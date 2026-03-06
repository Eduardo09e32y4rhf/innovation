import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '',
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
        const res = await api.post('/api/auth/login', { email, password });
        return res.data;
    },
    register: async (data: Record<string, string>) => {
        const res = await api.post('/api/auth/register', data);
        return res.data;
    },
    me: async () => {
        const res = await api.get('/api/auth/me');
        return res.data;
    },
    forgotPassword: async (email: string) => {
        const res = await api.post('/api/auth/forgot-password', { email });
        return res.data;
    },
    resetPassword: async (data: Record<string, string>) => {
        const res = await api.post('/api/auth/reset-password', data);
        return res.data;
    },
};

// ── DASHBOARD ────────────────────────────────────────────────────────────
export const DashboardService = {
    getMetrics: async () => {
        const res = await api.get('/api/dashboard/metrics');
        return res.data;
    },
    getRecentActivity: async () => {
        const res = await api.get('/api/dashboard/recent-activity');
        return res.data;
    },
    getKanban: async () => {
        const res = await api.get('/api/dashboard/kanban');
        return res.data;
    },
    getHeatmap: async () => {
        const res = await api.get('/api/dashboard/heatmap');
        return res.data;
    },
    getMissions: async () => {
        const res = await api.get('/api/dashboard/missions');
        return res.data;
    },
};

// ── JOBS / ATS ────────────────────────────────────────────────────────────
export const ATSService = {
    getJobs: async (params?: { status?: string; search?: string }) => {
        const res = await api.get('/api/jobs', { params });
        return res.data;
    },
    getPublicJobs: async () => {
        const res = await api.get('/api/jobs');
        return res.data;
    },
    getCompanyJobs: async () => {
        const res = await api.get('/api/jobs/company');
        return res.data;
    },
    createJob: async (data: Record<string, unknown>) => {
        const res = await api.post('/api/jobs', data);
        return res.data;
    },
    updateJob: async (id: number, data: Record<string, unknown>) => {
        const res = await api.patch(`/api/jobs/${id}`, data);
        return res.data;
    },
    deleteJob: async (id: number) => {
        await api.delete(`/api/jobs/${id}`);
    },
    getJobApplications: async (jobId: number) => {
        const res = await api.get(`/api/jobs/${jobId}/applications`);
        return res.data;
    },
    applyToJob: async (jobId: number, data: Record<string, unknown>) => {
        const res = await api.post('/api/applications', { job_id: jobId, ...data });
        return res.data;
    },
    analyzeCandidate: async (resumeText: string, jobDescription: string) => {
        const res = await api.post('/api/ai/rank-candidate', { resume_text: resumeText, job_description: jobDescription });
        return res.data;
    },
};

// ── FINANCE ──────────────────────────────────────────────────────────────
export const FinanceService = {
    getSummary: async () => {
        const res = await api.get('/api/finance/summary');
        return res.data;
    },
    getTransactions: async (params?: { type?: string; status?: string; search?: string }) => {
        const res = await api.get('/api/finance/transactions', { params });
        return res.data;
    },
    getPrediction: async () => {
        const res = await api.get('/api/finance/prediction');
        return res.data;
    },
    getAnomalies: async () => {
        const res = await api.get('/api/finance/anomalies');
        return res.data;
    },
    createTransaction: async (data: {
        description: string; amount: number; type: string;
        due_date: string; category?: string; status?: string;
        attachment_url?: string; ai_metadata?: string; tax_type?: string;
    }) => {
        const res = await api.post('/api/finance/transactions', data);
        return res.data;
    },
    updateTransaction: async (id: number, data: Record<string, unknown>) => {
        const res = await api.patch(`/api/finance/transactions/${id}`, data);
        return res.data;
    },
    deleteTransaction: async (id: number) => {
        await api.delete(`/api/finance/transactions/${id}`);
    },
    bulkUpdateStatus: async (ids: number[], status: string) => {
        const res = await api.post('/api/finance/transactions/bulk-status', { ids, status });
        return res.data;
    },
    exportTransactions: async (params?: { type?: string; status?: string }) => {
        const res = await api.get('/api/finance/transactions/export', { params, responseType: 'blob' });
        return res.data;
    },
    getLogs: async () => {
        const res = await api.get('/api/finance/logs');
        return res.data;
    },
    getCashflowChart: async (period: 'week' | 'month' | 'year' = 'month') => {
        const res = await api.get('/api/finance/cashflow', { params: { period } });
        return res.data;
    },
};

// ── PROJECTS ─────────────────────────────────────────────────────────────
export const ProjectService = {
    getProjects: async () => {
        const res = await api.get('/api/projects/');
        return res.data;
    },
    createProject: async (data: { name: string; description?: string }) => {
        const res = await api.post('/api/projects/', data);
        return res.data;
    },
    deleteProject: async (id: number) => {
        await api.delete(`/api/projects/${id}`);
    },
    getTasks: async () => {
        const res = await api.get('/api/projects/all-tasks');
        return res.data;
    },
    createTask: async (data: Record<string, unknown>) => {
        const res = await api.post('/api/projects/tasks', data);
        return res.data;
    },
    updateTask: async (id: number, data: Record<string, unknown>) => {
        const res = await api.patch(`/api/projects/tasks/${id}`, data);
        return res.data;
    },
    startTimeTracking: async (taskId: number) => {
        const res = await api.post(`/api/projects/tasks/${taskId}/start`);
        return res.data;
    },
    stopTimeTracking: async (entryId: number) => {
        const res = await api.post(`/api/projects/time-entries/${entryId}/stop`);
        return res.data;
    },
    getProjectStats: async (projectId: number) => {
        const res = await api.get(`/api/projects/${projectId}/stats`);
        return res.data;
    },
};

// ── SUPPORT ──────────────────────────────────────────────────────────────
export const SupportService = {
    getTickets: async () => {
        const res = await api.get('/api/support/tickets');
        return res.data;
    },
    createTicket: async (data: { title: string; description: string }) => {
        const res = await api.post('/api/support/tickets', data);
        return res.data;
    },
    getSystemStatus: async () => {
        const res = await api.get('/api/support/system-status');
        return res.data;
    },
    getSmartReply: async (ticketId: number, description: string) => {
        const res = await api.get(`/api/support/tickets/${ticketId}/smart-reply`, { params: { description } });
        return res.data;
    },
};

// ── RH ───────────────────────────────────────────────────────────────────
export const RHService = {
    getEmployees: async () => {
        const res = await api.get('/api/rh/v2/employees');
        return res.data;
    },
    getEmployeeTimeline: async (id: number) => {
        const res = await api.get(`/api/rh/v2/employees/${id}/timeline`);
        return res.data;
    },
    getTurnoverAlerts: async () => {
        const res = await api.get('/api/rh/v2/turnover-alerts');
        return res.data;
    },
    createAdmission: async (data: Record<string, unknown>) => {
        const res = await api.post('/api/rh/v2/admission', data);
        return res.data;
    },
    getLeaveRequests: async () => {
        const res = await api.get('/api/rh/leave-requests');
        return res.data;
    },
    requestLeave: async (data: { start_date: string; end_date: string; reason: string }) => {
        const res = await api.post('/api/rh/leave-requests', data);
        return res.data;
    },
    submitPulse: async (score: number, comment?: string) => {
        const res = await api.post('/api/rh/pulse', { score, comment });
        return res.data;
    },
    getBadges: async (employeeId: number) => {
        const res = await api.get(`/api/rh/employees/${employeeId}/badges`);
        return res.data;
    },
};

// ── PAYMENTS ─────────────────────────────────────────────────────────────
export const PaymentService = {
    createCheckout: async (plan: string) => {
        const res = await api.post('/api/payments/checkout', { plan });
        return res.data;
    },
};

// ── ENTERPRISE ───────────────────────────────────────────────────────────
export const EnterpriseService = {
    getRealtimeAnalytics: async () => {
        const res = await api.get('/api/enterprise/analytics/realtime');
        return res.data;
    },
    sendSupportMessage: async (message: string) => {
        const res = await api.post('/api/enterprise/support/chat', { message, context: {} });
        return res.data;
    },
};

export const SystemConfigService = {
    getAnnouncements: async () => {
        try {
            const res = await api.get('/api/system/announcements');
            return res.data;
        } catch {
            // Endpoint may not exist yet — return empty array silently
            return [];
        }
    },
    createAnnouncement: async (data: any) => {
        const res = await api.post('/api/system/announcements', data);
        return res.data;
    },
};

export const NotificationService = {
    getNotifications: async (unreadOnly: boolean = false) => {
        const res = await api.get('/api/notifications', { params: { unread_only: unreadOnly } });
        return res.data;
    },
    markAsRead: async (id: number) => {
        const res = await api.patch(`/api/notifications/${id}/read`);
        return res.data;
    },
    markAllAsRead: async () => {
        const res = await api.post('/api/notifications/read-all');
        return res.data;
    },
    clearAll: async () => {
        const res = await api.delete('/api/notifications');
        return res.data;
    },
};

// ── AI SERVICES ─────────────────────────────────────────────────────────
export const AIService = {
    parseReceipt: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/api/ai/parse-receipt', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
    parseResume: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await api.post('/api/ai/parse-resume', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },
};

export default api;


export const CompanyService = {
    getMyCompany: async () => {
        const res = await api.get('/api/companies/me');
        return res.data;
    },
    createCompany: async (data: Record<string, unknown>) => {
        const res = await api.post('/api/companies', data);
        return res.data;
    },
    updateCompany: async (id: string, data: Record<string, unknown>) => {
        const res = await api.put(`/api/companies/${id}`, data);
        return res.data;
    }
};


export const UsersService = {
    getProfile: async () => {
        const res = await api.get('/api/users/me');
        return res.data;
    },
    updateProfile: async (data: Record<string, unknown>) => {
        const res = await api.put('/api/users/me', data);
        return res.data;
    }
};

export const AnalyticsService = {
    getOverview: async () => {
        const res = await api.get('/api/analytics/overview');
        return res.data;
    }
};

export const SubscriptionsService = {
    getMySubscription: async () => {
        const res = await api.get('/api/subscriptions/me');
        return res.data;
    }
};
