'use client';

/**
 * Cliente HTTP central do Innovation RH Connect.
 * Injeta JWT, trata 401 automaticamente, expoe api.modulo.metodo() tipado.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

function clearSession() {
  if (typeof window === 'undefined') return;
  ['token', 'user', 'company'].forEach((k) => window.localStorage.removeItem(k));
}

type Opts = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; silent?: boolean };

async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, silent } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(0, 'Sem conexao com a API. Verifique se o backend esta rodando.', err);
  }

  if (res.status === 401) {
    clearSession();
    if (!silent && typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Sessao expirada. Faca login novamente.');
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const nested = data && typeof data === 'object' && 'error' in data ? (data as any).error : data;
    const rawMessage =
      nested && typeof nested === 'object' && 'message' in nested
        ? (nested as any).message
        : data && typeof data === 'object' && 'message' in data
          ? (data as any).message
          : null;
    const parsedMessage = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage ? String(rawMessage) : '';
    const friendly = res.status === 403 || res.status === 409
      ? 'Seu acesso foi alterado ou suspenso. Procure o administrador do sistema.'
      : parsedMessage || `Erro ${res.status}`;
    throw new ApiError(res.status, friendly, data);
  }

  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { data: T }).data;
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try { return JSON.parse(text); } catch { return text; }
}

// Types

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type UserRole = 'DEV' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';
export type PunchType = 'ENTRY' | 'LUNCH_START' | 'LUNCH_RETURN' | 'EXIT';

export type ContractType = 'CLT' | 'PJ' | 'ESTAGIO' | 'TEMPORARIO' | 'JOVEM_APRENDIZ' | 'TERCEIRIZADO';
export type WorkScale = '5X2' | '6X1' | '12X36' | '4X2' | 'OUTRO';
export type DailyWorkload = '08:00' | '07:20' | '06:00' | '12:00' | 'OUTRO';
export interface Employee {
  id: string; companyId: string; userId?: string | null; name: string; cpf: string; email: string;
  phone?: string | null; birthDate?: string | null; registration?: string | null;
  position: string; department: string; managerId?: string | null;
  admissionDate: string; terminationDate?: string | null; status: EmployeeStatus;
  salary?: string | number | null; contractType?: ContractType | null;
  cnpj?: string | null; legalName?: string | null; tradeName?: string | null;
  unit?: string | null;
  workScale?: WorkScale | null; customWorkScale?: string | null; dailyWorkload?: DailyWorkload | null;
  standardEntry?: string | null; standardLunchStart?: string | null; standardLunchReturn?: string | null; standardExit?: string | null;
  user?: { id: string; role: UserRole; isActive: boolean; forcePasswordChange?: boolean } | null;
  createdAt: string; updatedAt: string;
}
export interface CreateEmployeeInput {
  name: string; cpf: string; email: string; phone?: string; birthDate?: string; registration?: string;
  position: string; department: string; managerId?: string; admissionDate: string; terminationDate?: string;
  salary?: number; status?: EmployeeStatus; contractType?: ContractType;
  cnpj?: string; legalName?: string; tradeName?: string; unit?: string;
  workScale?: WorkScale; customWorkScale?: string; dailyWorkload?: DailyWorkload;
  standardEntry?: string; standardLunchStart?: string; standardLunchReturn?: string; standardExit?: string;
  accessEnabled?: 'NO' | 'YES'; accessProfile?: 'FUNCIONARIO' | 'GESTOR' | 'RH' | 'ADMIN' | 'CONSULTA';
}
export interface TimeTrack {
  id: string; employeeId: string; date: string;
  entry?: string | null; lunchStart?: string | null;
  lunchReturn?: string | null; exit?: string | null;
  totalWorked?: number | null; dailyBalance?: number | null;
  observation?: string | null; employee?: Employee;
  latitude?: number | null; longitude?: number | null;
  manualReason?: string | null; manualStatus?: string | null;
}
export type TimeTrackAdjustmentReason = 'ajuste_abono_atestado_horas' | 'ajuste_atestado_integral' | 'ajuste_folga_dsr' | 'ajuste_abono_folga' | 'ajuste_erro_marcacao' | 'ajuste_feriado';
export interface RegisterTimeInput { employeeId: string; type: PunchType; timestamp?: string; observation?: string; latitude?: number; longitude?: number; manualReason?: string; }
export interface ManualTimeTrackInput { employeeId: string; date: string; entry?: string | null; lunchStart?: string | null; lunchReturn?: string | null; exit?: string | null; reason: TimeTrackAdjustmentReason; observation?: string; }
export type RestDayMode = 'employee_scale' | 'fixed_weekly' | 'cycle';
export interface BulkManualTimeTrackInput { employeeIds: string[]; date?: string; startDate?: string; endDate?: string; entry?: string | null; lunchStart?: string | null; lunchReturn?: string | null; exit?: string | null; reason: TimeTrackAdjustmentReason; observation?: string; restDayMode?: RestDayMode; daysOff?: number[]; cycleStartDate?: string; cycleWorkDays?: number; cycleOffDays?: number; }
export interface UpdateTimeTrackInput { entry?: string | null; lunchStart?: string | null; lunchReturn?: string | null; exit?: string | null; observation?: string | null; }
export interface Vacation {
  id: string; employeeId: string; acquisitionPeriod: string;
  startDate: string; endDate: string; daysUsed: number;
  status: VacationStatus; observation?: string | null; employee?: Employee;
}
export interface CreateVacationInput {
  employeeId: string; acquisitionPeriod: string;
  startDate: string; endDate: string; daysUsed: number; observation?: string;
}
export interface DashboardSummary {
  activeEmployees: number; timeTracksToday: number; pendingVacations: number;
  whatsappMessages: number; totalTimeBalance: number;
}
export interface AppUser {
  id: string; name: string; email: string; role: UserRole;
  companyId: string; isActive?: boolean; createdAt?: string;
}
export interface UsersUsage { used: number; max: number; }
export interface CreateUserInput { name: string; email: string; password: string; role?: UserRole; }

export interface WhatsappStatus {
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'QR_CODE' | string;
  qrCode?: string | null; phone?: string | null; displayName?: string | null;
}
export interface Chat {
  id: string; name: string; isGroup: boolean;
  unreadCount: number; time: string; lastMessage: string; avatarUrl?: string | null;
}
export interface ChatMessage {
  id: string; sender: string; participantId?: string; participantName?: string;
  media?: unknown; text: string; time: string;
}
export interface SendMessageInput { phone: string; body: string; contactName?: string; }

export type CompanyStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export interface Company {
  id: string; name: string; legalName?: string | null; document?: string | null; logoUrl?: string | null;
  phone?: string | null; email?: string | null; address?: string | null;
  primaryColor?: string | null; theme?: string | null;
  commercialOwnerId?: string | null; maxUsers: number; maxEmployees: number;
  isActive: boolean; status?: CompanyStatus; createdAt: string;
  subscriptionStartedAt?: string; suspensionReason?: string | null;
}
export interface PlatformCompany extends Company { usersCount: number; employeesCount: number; }
export interface PlatformStats { companies: number; users: number; employees: number; messages: number; }
export interface CreatePlatformCompanyInput {
  name: string; document?: string; maxUsers?: number; maxEmployees?: number;
  adminName: string; adminEmail: string; adminPassword: string;
}
export type PlatformCompanyUserRole = 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';
export interface CreatePlatformCompanyUserInput { name: string; email: string; password: string; role?: PlatformCompanyUserRole; }
export interface UpdatePlatformCompanyUserInput { name?: string; email?: string; password?: string; role?: PlatformCompanyUserRole; isActive?: boolean; }

// Module API

export const api = {
  request,

  auth: {
    requestPasswordReset: (email: string) => request<{ requested: boolean; resetToken?: string }>('/auth/password-reset/request', { method: 'POST', body: { email } }),
    resetPassword: (token: string, newPassword: string) => request<{ changed: boolean }>('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } }),
  },

  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard/summary'),
  },

  employees: {
    list: () => request<Employee[]>('/employees'),
    get: (id: string) => request<Employee>(`/employees/${id}`),
    create: (input: CreateEmployeeInput) => request<Employee>('/employees', { method: 'POST', body: input }),
    update: (id: string, input: Partial<CreateEmployeeInput>) => request<Employee>(`/employees/${id}`, { method: 'PATCH', body: input }),
    terminate: (id: string) => request<Employee>(`/employees/${id}`, { method: 'DELETE' }),
    delete: (id: string) => request<void>(`/employees/${id}/permanent`, { method: 'DELETE' }),  },

  timeTrack: {
    list: () => request<TimeTrack[]>('/time-track'),
    listEmployeeMonth: (employeeId: string, month?: string) =>
      request<TimeTrack[]>(`/time-track/${employeeId}/month${month ? `?month=${encodeURIComponent(month)}` : ''}`),
    register: (input: RegisterTimeInput) => request<TimeTrack>('/time-track/register', { method: 'POST', body: input }),
    manual: (input: ManualTimeTrackInput) => request<TimeTrack>('/time-track/manual', { method: 'POST', body: input }),
    manualBulk: (input: BulkManualTimeTrackInput) => request<{ count: number; items: TimeTrack[] }>('/time-track/manual/bulk', { method: 'POST', body: input }),
    update: (id: string, input: UpdateTimeTrackInput) => request<TimeTrack>(`/time-track/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) => request<void>(`/time-track/${id}`, { method: 'DELETE' }),
    listPending: () => request<TimeTrack[]>('/time-track/pending'),
    approve: (id: string, approved: boolean) => request<TimeTrack>(`/time-track/${id}/approve`, { method: 'PATCH', body: { approved } }),
  },
  vacations: {
    list: () => request<Vacation[]>('/vacations'),
    listByEmployee: (employeeId: string) => request<Vacation[]>(`/vacations/employee/${employeeId}`),
    create: (input: CreateVacationInput) => request<Vacation>('/vacations', { method: 'POST', body: input }),
    updateStatus: (id: string, status: VacationStatus, observation?: string) =>
      request<Vacation>(`/vacations/${id}/status`, { method: 'PATCH', body: { status, observation } }),
  },

  users: {
    list: () => request<AppUser[]>('/users'),
    usage: () => request<UsersUsage>('/users/usage'),
    get: (id: string) => request<AppUser>(`/users/${id}`),
    create: (input: CreateUserInput) => request<AppUser>('/users', { method: 'POST', body: input }),
    update: (id: string, input: Partial<CreateUserInput>) => request<AppUser>(`/users/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  },

  companies: {
    me: () => request<Company>('/companies/me'),
    update: (data: { name?: string; legalName?: string; document?: string; logoUrl?: string | null; phone?: string; email?: string; address?: string; primaryColor?: string; theme?: string }) => request<Company>('/companies/me', { method: 'PATCH', body: data }),
  },

  whatsapp: {
    connect: () => request<WhatsappStatus>('/communication/whatsapp/connect', { method: 'POST' }),
    qrcode: () => request<WhatsappStatus>('/communication/whatsapp/qrcode'),
    status: () => request<WhatsappStatus>('/communication/whatsapp/status', { silent: true }),
    disconnect: () => request<WhatsappStatus>('/communication/whatsapp/disconnect', { method: 'POST' }),
    chats: () => request<Chat[]>('/communication/chats'),
    chatMessages: (chatId: string) => request<ChatMessage[]>(`/communication/chats/${encodeURIComponent(chatId)}/messages`),
    sendMessage: (input: SendMessageInput) => request<unknown>('/communication/messages/send', { method: 'POST', body: input }),
    settings: () => request<Record<string, unknown>>('/communication/settings'),
    updateSettings: (data: Record<string, unknown>) => request<Record<string, unknown>>('/communication/settings', { method: 'PATCH', body: data }),
  },

  platform: {
    stats: () => request<PlatformStats>('/platform/stats'),
    listCompanies: () => request<PlatformCompany[]>('/platform/companies'),
    getCompany: (id: string) => request<PlatformCompany>(`/platform/companies/${id}`),
    createCompany: (input: CreatePlatformCompanyInput) => request<unknown>('/platform/companies', { method: 'POST', body: input }),
    updateCompany: (id: string, input: Partial<Omit<CreatePlatformCompanyInput, 'adminName' | 'adminEmail' | 'adminPassword'>> & { isActive?: boolean; status?: CompanyStatus; suspensionReason?: string | null }) =>
      request<unknown>(`/platform/companies/${id}`, { method: 'PATCH', body: input }),
    deleteCompany: (id: string) => request<void>(`/platform/companies/${id}`, { method: 'DELETE' }),
    listCompanyUsers: (companyId: string) => request<AppUser[]>(`/platform/company-users/${companyId}`),
    createCompanyUser: (companyId: string, input: CreatePlatformCompanyUserInput) => request<AppUser>(`/platform/company-users/${companyId}`, { method: 'POST', body: input }),
    updateCompanyUser: (companyId: string, userId: string, input: UpdatePlatformCompanyUserInput) => request<AppUser>(`/platform/company-users/${companyId}/${userId}`, { method: 'PATCH', body: input }),
    deleteCompanyUser: (companyId: string, userId: string) => request<void>(`/platform/company-users/${companyId}/${userId}`, { method: 'DELETE' }),
  },
};

export default api;
