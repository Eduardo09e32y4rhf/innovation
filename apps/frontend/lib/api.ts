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

