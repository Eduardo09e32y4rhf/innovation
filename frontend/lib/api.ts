/**
 * Innovation.ia — Centralized API Layer
 * Automatically injects JWT from localStorage into every request.
 * Handles 401 by redirecting to /login.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

    const response = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
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
}

/**
 * Convenience wrappers
 */
export const api = {
    get: <T = unknown>(path: string, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'GET', ...options }),

    post: <T = unknown>(path: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body), ...options }),

    patch: <T = unknown>(path: string, body?: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...options }),

    put: <T = unknown>(path: string, body: unknown, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body), ...options }),

    delete: <T = unknown>(path: string, options?: FetchOptions) =>
        apiFetch<T>(path, { method: 'DELETE', ...options }),
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
