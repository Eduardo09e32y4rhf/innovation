const DEFAULT_TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Browser: relative path → Next.js proxy/rewrites
    return '';
  }
  // Server SSR: direct backend
  return process.env.API_URL || 'http://localhost:8000';
};

interface ApiFetchOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
  retries?: number;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    skipAuth = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = MAX_RETRIES,
    ...fetchOptions
  } = options;

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') 
      : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new ApiError(
          `HTTP ${response.status}: ${errorBody || response.statusText}`,
          response.status
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof ApiError) throw err;

      lastError = err instanceof Error ? err : new Error(String(err));

      const isAbort = lastError.name === 'AbortError';
      const message = isAbort
        ? `Timeout ${timeoutMs}ms — ${url}`
        : `Fetch fail — ${url}: ${lastError!.message}`;

      console.warn(`[apiFetch] Attempt ${attempt + 1}/${retries + 1}: ${message}`);

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error('Falha desconhecida');
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const AuthService = {
  login: (credentials: { email: string; password: string }) => 
    apiFetch<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    }),
};
/**
 * Convenience wrappers for common methods
 */
export const api = {
    get: <T = unknown>(path: string, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { method: 'GET', ...options }),

    post: <T = unknown>(path: string, body: unknown, options?: ApiFetchOptions) => {
        const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
        return apiFetch<T>(path, {
            method: 'POST',
            body: isForm ? (body as BodyInit) : JSON.stringify(body),
            ...options,
        });
    },

    patch: <T = unknown>(path: string, body?: unknown, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...options }),

    put: <T = unknown>(path: string, body: unknown, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),

    delete: <T = unknown>(path: string, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { method: 'DELETE', ...options }),
};

/** Utility functions for URL building and authentication checks */
export const buildApiUrl = (path: string): string => `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
export const isAuthenticated = (): boolean => typeof window !== 'undefined' && !!localStorage.getItem('token');
export const logout = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/login';
    }
};

/**
 * Domain Services
 */
export const DashboardService = {
    getMetrics: () => api.get<any>('/api/dashboard/metrics'),
    getRecentActivity: () => api.get<any>('/api/dashboard/recent-activity'),
};

export const NotificationService = {
    getNotifications: (unreadOnly = false) => api.get<any[]>(`/api/notifications${unreadOnly ? '?unread=true' : ''}`),
    markAsRead: (id: number) => api.patch(`/api/notifications/${id}/read`),
};

export const FinanceService = {
    getSummary: () => api.get<any>('/api/finance/summary'),
    getTransactions: (params?: any) => api.get<any[]>('/api/finance/transactions'),
    createTransaction: (payload: any) => api.post<any>('/api/finance/transactions', payload),
    getBankHub: () => api.get<any>('/api/finance/bank-hub'),
};

export const CompanyService = { getDetails: async () => ({}) };
export const PaymentService = { getPlans: async () => [] };
export const ProjectService = { getProjects: async () => [] };
export const RHService = { getStats: async () => ({}) };
export const SupportService = { getTickets: async () => [] };
export const ATSService = {
    getPublicJobs: () => api.get<any[]>('/api/ats/jobs/public', { skipAuth: true }),
    getCompanyJobs: () => api.get<any[]>('/api/ats/jobs'),
};
export const DasMeiService = { getAtual: () => api.get<any>('/api/finance/das/competencia-atual') };
export const AttendanceService = {
    getPunchBalance: () => api.get<any>('/api/attendance/balance'),
    registerPunch: (payload: any) => api.post<any>('/api/attendance/punch', payload),
};
export const SystemConfigService = { getAnnouncements: async () => [{ id: 1, message: "Innovation.ia Ativo!", type: "info" }] };
