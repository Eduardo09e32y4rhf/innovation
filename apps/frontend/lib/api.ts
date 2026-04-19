/**
 * Innovation.ia — Centralized API Layer
 * Automatically injects JWT from localStorage into every request.
 * Handles 401 by redirecting to /login.
 */

const normalizeBaseUrl = (url: string): string => {
    if (url.startsWith('/') && !url.includes('://')) return '';
    return url.replace(/\/+$/, '');
};

export const getApiBaseUrl = (): string => {
    // Browser: force relative paths to enable Next.js rewrites and avoid Mixed Content.
    if (typeof window !== 'undefined') {
        return '';
    }

    // Server-side: use internal service name (docker-compose service name)
    const serverUrl = process.env.API_URL || 'http://api_monolith:8000';
    return normalizeBaseUrl(serverUrl);
};

/** URL absoluta para uso com fetch manual (ex.: streaming SSE). */
export const buildApiUrl = (path: string): string => {
    const base = getApiBaseUrl();
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
};

function getToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
}

type FetchOptions = RequestInit & {
    skipAuth?: boolean;
};

/**
 * Wrapper over fetch() that:
 * - Injects Authorization: Bearer <token> header
 * - Redirects to /login on 401
 * - Throws on non-ok responses with structured error
 */
export async function apiFetch<T = unknown>(
    path: string,
    options: FetchOptions = {}
): Promise<T> {
    const { skipAuth = false, headers = {}, ...rest } = options;

    const token = getToken();

    if (!skipAuth && !token) {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('No authentication token found');
    }

    const authHeader: Record<string, string> = !skipAuth && token
        ? { Authorization: `Bearer ${token}` }
        : {};

    const isFormData =
        typeof FormData !== 'undefined' && rest.body instanceof FormData;

    const url = `${getApiBaseUrl()}${path}`;
    
    try {
        const response = await fetch(url, {
            ...rest,
            headers: {
                ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
                ...authHeader,
                ...(headers as Record<string, string>),
            },
        });
        
        // Redirect to login on unauthorized
        if (response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            throw new Error('Unauthorized — redirecting to login');
        }

        if (!response.ok) {
            let detail = `HTTP ${response.status}`;
            try {
                const body = await response.json();
                detail = body.detail || body.message || detail;
            } catch {
                // ignore parse errors
            }
            throw new Error(detail);
        }

        // Handle empty responses (204 No Content)
        if (response.status === 204) {
            return undefined as unknown as T;
        }

        return response.json() as Promise<T>;

    } catch (error: any) {
        if (typeof window !== 'undefined') {
            console.error(`[API ERROR] Failed to fetch: ${url}`, error);
        }
        throw error;
    }
}

/**
 * Convenience wrappers
 */
export const api = {
    get: <T = unknown>(path: string, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'GET', ...options }),

    post: <T = unknown>(path: string, body: unknown, options?: FetchOptions) => {
        const isForm =
            typeof FormData !== 'undefined' && body instanceof FormData;
        return apiFetch<T>(path, {
            method: 'POST',
            body: isForm ? (body as BodyInit) : JSON.stringify(body),
            ...options,
        });
    },

    patch: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...options }),

    put: <T = unknown>(path: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),

    delete: <T = unknown>(path: string, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'DELETE', ...options }),
};

/**
 * Auth Service
 */
export const AuthService = {
    me: () => api.get<any>('/api/users/me'),
    login: (credentials: any) => api.post<any>('/api/auth/login', credentials, { skipAuth: true }),
    register: (payload: any) => api.post<any>('/api/auth/register', payload, { skipAuth: true }),
};

/**
 * Dashboard Service
 */
export const DashboardService = {
    getMetrics: () => api.get<any>('/api/dashboard/metrics'),
    getRecentActivity: () => api.get<any>('/api/dashboard/recent-activity'),
};

/**
 * Notification Service
 */
export const NotificationService = {
    getNotifications: (unreadOnly = false) => 
        api.get<any[]>(`/api/notifications${unreadOnly ? '?unread=true' : ''}`),
    markAsRead: (id: number) => api.patch(`/api/notifications/${id}/read`),
    markAllAsRead: () => api.post('/api/notifications/read-all', {}),
    clearAll: () => api.delete('/api/notifications/clear'),
};

/**
 * System Configuration Service
 */
export const SystemConfigService = {
    getAnnouncements: async () => {
        return [
            { id: 1, message: "🚀 Innovation.ia v2.0 Enterprise: Sistema Omnichannel Ativo!", type: "info" }
        ];
    }
};

/**
 * Check if current session is authenticated
 */
export function isAuthenticated(): boolean {
    return !!getToken();
}

/**
 * Clear auth session and redirect to login
 */
export function logout(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
    }
}

export type FinanceSummary = {
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
};

export type FinanceTransactionPayload = {
    description: string;
    amount: number;
    type: 'income' | 'expense';
    due_date: string;
    category?: string;
    tax_type?: string;
    status?: 'paid' | 'pending' | 'overdue';
    attachment_url?: string;
    ai_metadata?: string;
};

export const FinanceService = {
    // Compatibilidade com telas antigas que chamam getMetrics()
    getMetrics: () => api.get<FinanceSummary>('/api/finance/summary'),
    getSummary: () => api.get<FinanceSummary>('/api/finance/summary'),
    getTransactions: (params?: { skip?: number; limit?: number }) => {
        const q = new URLSearchParams();
        if (typeof params?.skip === 'number') q.set('skip', String(params.skip));
        if (typeof params?.limit === 'number') q.set('limit', String(params.limit));
        const suffix = q.toString() ? `?${q.toString()}` : '';
        return api.get<any[]>(`/api/finance/transactions${suffix}`);
    },
    createTransaction: (payload: FinanceTransactionPayload) =>
        api.post<any>('/api/finance/transactions', payload),
    getBankHub: () => api.get<any>('/api/finance/bank-hub'),
    getBurnRate: () => api.get<any>('/api/finance/burn-rate'),
    getPrediction: () => api.get<any>('/api/finance/prediction'),
    getAnomalies: () => api.get<any[]>('/api/finance/anomalies'),
};
export const CompanyService = { getDetails: async () => ({}) };
export const PaymentService = { getPlans: async () => [] };
export const ProjectService = { getProjects: async () => [] };
export const RHService = { getStats: async () => ({}) };
export const SupportService = { getTickets: async () => [] };

/**
 * ATS — Recrutamento e Vagas
 */
export const ATSService = {
    getPublicJobs: () => api.get<any[]>('/api/ats/jobs/public', { skipAuth: true }),
    getCompanyJobs: () => api.get<any[]>('/api/ats/jobs'),
    createJob: (payload: any) => api.post<any>('/api/ats/jobs', payload),
    applyToJob: (jobId: number, payload: any) =>
        api.post<any>(`/api/ats/jobs/${jobId}/apply`, payload, { skipAuth: true }),
};

/**
 * DAS / MEI Service
 */
export const DasMeiService = {
    getAtual: () => api.get<any>('/api/finance/das/competencia-atual'),
    getGuias: () => api.get<any[]>('/api/finance/das/historico'),
    marcarPago: (payload: { competencia: string; codigo_barras?: string }) =>
        api.post<any>('/api/finance/das/marcar-pago', payload),
    // Alias legado para não quebrar chamadas antigas
    gerarGuia: (payload: any) => api.post<any>('/api/finance/das/marcar-pago', payload),
};

/**
 * Attendance / Ponto Eletrônico Service
 */
export const AttendanceService = {
    /**
     * Busca o saldo do banco de horas do usuário autenticado.
     */
    getPunchBalance: () =>
        api.get<{
            total_credit_hours: number;
            total_debit_hours: number;
            balance_hours: number;
            entries: Array<{
                id: number;
                type: 'credit' | 'debit';
                hours: number;
                reason: string;
                created_at: string;
                status: string;
            }>;
        }>('/api/attendance/balance'),

    /**
     * Registra uma batida de ponto manual (entrada ou saída).
     */
    registerPunch: (payload: {
        type: 'credit' | 'debit';
        hours: number;
        reason: string;
        created_at?: string;
    }) => api.post<{ id: number; message: string }>('/api/attendance/punch', payload),

    /**
     * Registra ponto biométrico com foto, GPS e fingerprint de dispositivo.
     */
    registerBiometricPunch: (payload: {
        photo_base64: string;
        latitude: number;
        longitude: number;
        accuracy: number;
        device_fingerprint: string;
    }) => api.post<{ id: number; message: string; verified: boolean }>('/api/attendance/biometric-punch', payload),
};
