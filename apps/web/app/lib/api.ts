'use client';

import { clearAuthSession, readAuthSession, readParsedAuthSession } from './auth-session';
import { resetAllQueryStates } from '@/app/hooks/use-data';

/**
 * Cliente HTTP central do Innovation RH System.
 * Injeta JWT, trata 401 automaticamente, expoe api.modulo.metodo() tipado.
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || '/api';

export const getImageUrl = (relativePath: string) => {
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_API_URL || '';
  return `${cdnUrl}${relativePath}`;
};

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
  return readAuthSession().token;
}

function clearSession() {
  const { isIsolatedTab } = readParsedAuthSession();
  clearAuthSession(isIsolatedTab);
  // Zera cache em memória imediatamente — evita flash de dados do usuário anterior
  resetAllQueryStates();
}

type Opts = { method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; body?: unknown; silent?: boolean; timeoutMs?: number; keepSessionOn401?: boolean };

export async function request<T>(path: string, opts: Opts = {}): Promise<T> {
  const { method = 'GET', body, silent, timeoutMs, keepSessionOn401 } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      // Deixa o browser setar o Content-Type com o boundary
    } else {
      headers['Content-Type'] = 'application/json';
    }
  }
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = timeoutMs ? new AbortController() : null;
  const timeoutHandle = timeoutMs ? setTimeout(() => controller?.abort(), timeoutMs) : null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? (typeof FormData !== 'undefined' && body instanceof FormData ? body : JSON.stringify(body)) : undefined,
      signal: controller?.signal,
    });
  } catch (err) {
    if (controller?.signal.aborted) {
      throw new ApiError(0, `A API demorou mais que ${Math.round((timeoutMs ?? 0) / 1000)}s para responder. Tente novamente.`, err);
    }
    throw new ApiError(0, 'Sem conexao com a API. Verifique se o backend esta rodando.', err);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  if (res.status === 401) {
    if (!keepSessionOn401) {
      clearSession();
      if (!silent && typeof window !== 'undefined') window.location.href = '/login';
    }
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

function makeQuery(input: object) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
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
  rg?: string | null; rgIssuer?: string | null; rgState?: string | null; rgIssueDate?: string | null;
  cep?: string | null; street?: string | null; streetNumber?: string | null; addressComplement?: string | null;
  neighborhood?: string | null; city?: string | null; state?: string | null;
  secondaryPhone?: string | null; maritalStatus?: string | null; nationality?: string | null; birthplace?: string | null; observations?: string | null;
  gender?: string | null;
  education?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
  pis?: string | null;
  firstJob?: boolean | null;
  voterTitle?: string | null;
  voterZone?: string | null;
  voterSection?: string | null;
  voterState?: string | null;
  reservista?: string | null;
  bankName?: string | null;
  bankAgency?: string | null;
  bankAccount?: string | null;
  bankAccountType?: string | null;
  dependents?: string | null;
  position?: string; department?: string; managerId?: string | null;
  admissionDate: string; terminationDate?: string | null; status: EmployeeStatus;
  salary?: string | number | null; contractType?: ContractType | null;
  cnpj?: string | null; legalName?: string | null; tradeName?: string | null;
  unit?: string | null;
  workScale?: WorkScale | null; customWorkScale?: string | null; dailyWorkload?: DailyWorkload | null;
  standardEntry?: string | null; standardLunchStart?: string | null; standardLunchReturn?: string | null; standardExit?: string | null;
  workScheduleRule?: { restDaysOfWeek?: number[] } | null;
  user?: { id: string; role: UserRole; isActive: boolean; forcePasswordChange?: boolean } | null;
  faceEnrollment?: { active: boolean; vectors?: number[] } | null;
  createdAt: string; updatedAt: string;
}
export interface PasswordResetEmployee {
  id: string;
  name: string;
  registration?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  userId: string;
  user: {
    id: string;
    role: UserRole;
    isActive: boolean;
  };
}

export interface EmployeePasswordResetResult {
  reset: boolean;
  forcePasswordChange: boolean;
  employee: {
    id: string;
    name: string;
    registration?: string | null;
  };
}

export interface CreateEmployeeInput {
  name: string; cpf?: string; email?: string; phone?: string; birthDate?: string; registration?: string;
  rg?: string; rgIssuer?: string; rgState?: string; rgIssueDate?: string;
  cep?: string; street?: string; streetNumber?: string; addressComplement?: string;
  neighborhood?: string; city?: string; state?: string;
  secondaryPhone?: string; maritalStatus?: string; nationality?: string; birthplace?: string; observations?: string;
  gender?: string;
  education?: string;
  motherName?: string;
  fatherName?: string;
  pis?: string;
  firstJob?: boolean;
  voterTitle?: string;
  voterZone?: string;
  voterSection?: string;
  voterState?: string;
  reservista?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: string;
  dependents?: string;
  position?: string; department?: string; managerId?: string; admissionDate?: string; terminationDate?: string;
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
  incidentType?: string | null;
  lateMinutes?: number | null;
  earlyLeaveMinutes?: number | null;
  absenceMinutes?: number | null;
  overtime50Minutes?: number | null;
  overtime100Minutes?: number | null;
  nightShiftMinutes?: number | null;
  overtimeExceedsLimit?: boolean;
  overtimeHandling?: string | null;
  overtimeBankMinutes?: number | null;
  overtimePaymentMinutes?: number | null;
  isFuture: boolean;
  isRest: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  overtimeApprovalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
export type TimeTrackAdjustmentReason = 'ajuste_erro_marcacao' | 'ajuste_atestado_integral' | 'ajuste_feriado' | 'ajuste_abono_atestado_horas' | 'ajuste_folga_dsr' | 'ajuste_abono_folga' | 'ajuste_abono_banco_saida_antecipada' | 'ajuste_abono_atraso' | 'ajuste_suspensao';
export interface RegisterTimeInput { employeeId?: string; type?: PunchType; timestamp?: string; observation?: string; latitude?: number; longitude?: number; manualReason?: string; }
export interface ManualTimeTrackInput { employeeId: string; date: string; entry?: string | null; lunchStart?: string | null; lunchReturn?: string | null; exit?: string | null; reason: TimeTrackAdjustmentReason; observation?: string; }
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
export interface DashboardInsightPerson { id: string; name: string; birthDate?: string | null; }
export interface DashboardInsights {
  birthdaysToday: DashboardInsightPerson[];
  birthdaysThisMonth: DashboardInsightPerson[];
  pending: { timeTracks: number; vacations: number };
  movements: { admissionsThisMonth: number; terminationsThisMonth: number };
  alerts: {
    companyIncomplete: boolean;
    employeesWithoutCpf: number;
    employeesWithoutUser: number;
    employeesWithoutManager: number;
    employeesWithoutWorkScale: number;
    employeesWithoutWorkload: number;
    pendingTimeTracks: number;
  };
}
export interface AppUser {
  id: string; name: string; email: string; role: UserRole;
  companyId: string; isActive?: boolean; createdAt?: string; customPermissions?: string[];
  lastActiveAt?: string | null;
  forcePasswordChange?: boolean;
  failedLoginAttempts?: number;
  passwordChangedAt?: string | null;
  employee?: {
    id: string;
    name: string;
    registration?: string | null;
    position?: string | null;
    department?: string | null;
    status?: string;
  } | null;
  company?: {
    id?: string;
    name: string;
  };
}
export interface UsersUsage { used: number; max: number; }
export interface CreateUserInput { name: string; email: string; password?: string; role?: UserRole; customPermissions?: string[] | null; companyId?: string; }
export interface UpdateUserInput extends Partial<CreateUserInput> { isActive?: boolean; }

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
  cnpj?: string | null; street?: string | null; streetNumber?: string | null;
  neighborhood?: string | null; city?: string | null; state?: string | null; cep?: string | null;
  zipCode?: string | null; addressComplement?: string | null;
  stateRegistration?: string | null; municipalRegistration?: string | null;
  legalRepresentativeName?: string | null; legalRepresentativeCpf?: string | null;
  legalRepresentativeRole?: string | null; legalRepresentativeEmail?: string | null;
  legalRepresentativePhone?: string | null;
  latitude?: number | null; longitude?: number | null; radiusTolerance?: number | null;
  primaryColor?: string | null; theme?: string | null;
  commercialOwnerId?: string | null; maxUsers: number; maxEmployees: number;
  isActive: boolean; status?: CompanyStatus; createdAt: string;
  subscriptionStartedAt?: string; suspensionReason?: string | null;
  plan?: 'FREE' | 'BASE' | 'PRO' | 'ENTERPRISE';
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  trialEndsAt?: string | null;
  activeModules?: string[];
  asaasCustomerId?: string | null;
  asaasSubscriptionId?: string | null;
  internalNotes?: string | null;
}
export interface PlatformCompany {
  id: string; name: string; document: string; slug: string;
  status: CompanyStatus; isActive: boolean;
  maxUsers?: number; maxEmployees?: number; planId?: string;
  asaasCustomerId?: string; asaasSubscriptionId?: string;
  createdAt: string; updatedAt: string;
  usersCount: number; employeesCount: number;
  plan?: 'FREE' | 'BASE' | 'PRO' | 'ENTERPRISE';
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  trialEndsAt?: string | null;
  activeModules?: string[];
  internalNotes?: string | null;
  commercialOwnerId?: string | null;
  suspensionReason?: string | null;
  platformPlanId?: string | null;
  logoUrl?: string | null;
  address?: string | null;
  subscriptionStartedAt?: string | null;
}
export type PlatformInvoiceStatus = 'OPEN' | 'PAID' | 'OVERDUE' | 'CANCELED';
export type PlatformBillingType = 'UNDEFINED' | 'PIX' | 'BOLETO' | 'CREDIT_CARD';
export interface PlatformInvoice {
  id: string; companyId: string; planId?: string | null; description?: string | null;
  amount: number | string; dueDate: string; status: PlatformInvoiceStatus; billingType: PlatformBillingType;
  asaasPaymentId?: string | null; invoiceUrl?: string | null; paidAt?: string | null;
  createdAt: string; updatedAt: string;
  company: { id: string; name: string; legalName?: string | null; document?: string | null; asaasCustomerId?: string | null };
  plan?: { id: string; name: string } | null;
}
export interface PlatformFinanceSummary {
  totals: { billed: number; received: number; open: number; overdue: number; canceled: number };
  count: number; conversionRate: number;
  monthly: Array<{ month: string; billed: number; received: number }>;
}
export interface PlatformInvoiceList {
  items: PlatformInvoice[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
export interface PlatformInvoiceQuery {
  page?: number; limit?: number; status?: PlatformInvoiceStatus | ''; search?: string; from?: string; to?: string;
}
export interface CreatePlatformInvoiceInput {
  companyId: string; planId?: string; description: string; amount: number; dueDate: string;
  billingType?: PlatformBillingType; sendToAsaas?: boolean;
}
export interface UpdatePlatformInvoiceInput {
  description?: string; amount?: number; dueDate?: string; billingType?: PlatformBillingType; status?: PlatformInvoiceStatus;
}
export interface PublicPlatformPlan {
  id: string; name: string; description?: string | null; price: number | string; cycle: string;
  maxUsers: number; maxEmployees: number; activeModules: string[]; isFree: boolean;
}
export interface CompanyBillingResult {
  company?: { id: string; name: string; status: CompanyStatus; billingStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; suspensionReason?: string | null };
  invoice?: PlatformInvoice | null; active: boolean; paymentUrl?: string | null;
}
export interface PlatformStats { companies: number; users: number; employees: number; messages: number; activeCompanies: number; suspendedCompanies: number; pastDueCompanies: number; }
export interface CreatePlatformCompanyInput {
  name: string; document: string; slug: string;
  maxUsers?: number; maxEmployees?: number; planId?: string;
  asaasCustomerId?: string; asaasSubscriptionId?: string;
  adminName: string; adminEmail: string; adminPassword?: string;
}
export type PlatformCompanyUserRole = 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';
export interface CreatePlatformCompanyUserInput { name: string; email: string; password: string; role?: PlatformCompanyUserRole; }
export interface UpdatePlatformCompanyUserInput { name?: string; email?: string; password?: string; role?: PlatformCompanyUserRole; isActive?: boolean; }

export interface ManagementEvent {
  id: string; companyId: string; title: string; description?: string | null;
  eventType: string; startDateTime: string; endDateTime?: string | null;
  responsibleUserId?: string | null; employeeId?: string | null;
  status: string; priority: string; createdBy?: string | null;
  createdAt: string; updatedAt: string;
  employee?: { id: string; name: string } | null;
}
export interface CreateManagementEventInput {
  title: string; description?: string; eventType: string;
  startDateTime: string; endDateTime?: string;
  responsibleUserId?: string; employeeId?: string; priority?: string;
}
export interface UpdateManagementEventInput {
  title?: string; description?: string; eventType?: string;
  startDateTime?: string; endDateTime?: string;
  responsibleUserId?: string; employeeId?: string;
  status?: string; priority?: string;
}

export type AsoType = 'ADMISSIONAL' | 'DEMISSIONAL' | 'PERIODICO' | 'RETORNO_AO_TRABALHO' | 'MUDANCA_DE_FUNCAO' | 'COMPLEMENTAR';
export type AsoStatus = 'PENDENTE' | 'AGENDADO' | 'REALIZADO' | 'APTO' | 'INAPTO' | 'VENCIDO' | 'CANCELADO';
export interface EmployeeAsoRecord {
  id: string; companyId: string; employeeId: string;
  asoType: string; examDate?: string | null; dueDate?: string | null;
  status: string; clinicName?: string | null; doctorName?: string | null;
  documentUrl?: string | null; documentNumber?: string | null;
  observation?: string | null;
  createdBy?: string | null; createdAt: string; updatedAt: string;
  employee?: { id: string; name: string; cpf?: string | null; role?: string | null; admissionDate?: string | null; department?: string | null } | null;
}
export interface AsoClinicPreset {
  id: string; companyId: string;
  name: string; cep?: string | null; address?: string | null;
  city?: string | null; state?: string | null; phone?: string | null;
  doctorName?: string | null; active: boolean;
  createdAt: string; updatedAt: string;
}
export interface CreateAsoInput {
  employeeId: string; asoType: string; status?: string;
  examDate?: string; dueDate?: string;
  clinicName?: string; doctorName?: string; documentUrl?: string;
  observation?: string;
  saveClinicPreset?: boolean; clinicCep?: string; clinicAddress?: string;
  clinicCity?: string; clinicState?: string; clinicPhone?: string;
}
export interface UpdateAsoInput {
  asoType?: string; examDate?: string; dueDate?: string;
  status?: string; clinicName?: string; doctorName?: string;
  documentUrl?: string; observation?: string;
  saveClinicPreset?: boolean; clinicCep?: string; clinicAddress?: string;
  clinicCity?: string; clinicState?: string; clinicPhone?: string;
}

// Module API

export const api = {
  request,

  auth: {
    requestPasswordReset: (email: string) => request<{ requested: boolean; demoCode?: string }>('/auth/password-reset/request', { method: 'POST', body: { email } }),
    validateResetCode: (email: string, code: string, cpfStart: string, registration: string) => request<{ valid: boolean; resetToken: string }>('/auth/password-reset/validate-code', { method: 'POST', body: { email, code, cpfStart, registration } }),
    resetPassword: (token: string, newPassword: string) => request<{ changed: boolean }>('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } }),
    publicPlans: () => request<PublicPlatformPlan[]>('/auth/public-plans'),
    registerCompany: (data: any) => request<any>('/auth/register-company', { method: 'POST', body: data }),
    searchEmployeesForPasswordReset: (search: string) =>
      request<PasswordResetEmployee[]>(
        `/auth/password-reset/employees${makeQuery({ search })}`,
      ),
    resetEmployeePassword: (employeeId: string, newPassword: string) =>
      request<EmployeePasswordResetResult>(
        '/auth/password-reset/employee',
        {
          method: 'POST',
          body: {
            employeeId,
            newPassword,
          },
        },
      ),
  },

  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard/summary'),
    insights: () => request<DashboardInsights>('/dashboard/insights'),
    rhAlerts: () => request<{ asoExpired: number; asoExpiringSoon: number; pendingAdmissionAso: number; inaptoCount: number; items: { type: string; employeeId: string; employeeName: string; message: string; target: string }[] }>('/management/aso/alerts/rh'),
  },

  employees: {
    list: () => request<Employee[]>('/employees'),
    swapCandidates: () => request<any[]>('/employees/swap-candidates'),
    get: (id: string) => request<Employee>(`/employees/${id}`),
    create: (input: CreateEmployeeInput) => request<Employee>('/employees', { method: 'POST', body: input }),
    update: (id: string, input: Partial<CreateEmployeeInput>) => request<Employee>(`/employees/${id}`, { method: 'PATCH', body: input }),
    terminate: (id: string) => request<Employee>(`/employees/${id}`, { method: 'DELETE' }),
    delete: (id: string) => request<void>(`/employees/${id}/permanent`, { method: 'DELETE' }),
  },

  workScheduleRules: {
    list: () => request<any[]>('/time-rules'),
    getActive: () => request<any>('/time-rules/active'),
    getById: (id: string) => request<any>(`/time-rules/${id}`),
    create: (data: any) => request<any>('/time-rules', { method: 'POST', body: data }),
    update: (id: string, data: any) => request<any>(`/time-rules/${id}`, { method: 'PUT', body: data }),
    archive: (id: string) => request<any>(`/time-rules/${id}/archive`, { method: 'PUT' }),
    activate: (id: string) => request<any>(`/time-rules/${id}/activate`, { method: 'PUT' }),
  },
  timeClosing: {
    list: () => request<any[]>('/time-closing'),
    getById: (id: string) => request<any>(`/time-closing/${id}`),
    generate: (input: { month?: number; year?: number; periodStart?: string; periodEnd?: string; employeeIds?: string[]; overtimeHandling?: 'PAYMENT' | 'BANK' }) => request<any[]>('/time-closing/generate', { method: 'POST', body: input }),
    adjust: (id: string, field: string, newValue: number, reason: string) => request<any>(`/time-closing/${id}/adjust`, { method: 'PATCH', body: { field, newValue: String(newValue), reason } }),
    submitReview: (id: string) => request<any>(`/time-closing/${id}/submit-review`, { method: 'POST' }),
    approve: (id: string) => request<any>(`/time-closing/${id}/approve`, { method: 'POST' }),
    close: (id: string) => request<any>(`/time-closing/${id}/close`, { method: 'POST' }),
    reopen: (id: string, reason: string) => request<any>(`/time-closing/${id}/reopen`, { method: 'POST', body: { reason } }),
    delete: (id: string) => request<any>(`/time-closing/${id}`, { method: 'DELETE' }),
  },
  timeOccurrences: {
    list: () => request<any[]>('/time-occurrences'),
    listByEmployee: (employeeId: string) => request<any[]>(`/time-occurrences/employee/${employeeId}`),
    create: (data: any) => request<any>('/time-occurrences', { method: 'POST', body: data }),
    approve: (id: string) => request<any>(`/time-occurrences/${id}/approve`, { method: 'PUT' }),
    reject: (id: string) => request<any>(`/time-occurrences/${id}/reject`, { method: 'PUT' }),
  },
  facialRecognition: {
      enroll: (input: { imageBase64: string, employeeId?: string }) => request('/facial-recognition/enroll', { method: 'POST', body: input }),
    },
    timeTrack: {
    list: (month?: string) =>
      request<TimeTrack[]>(`/time-track${month ? `?month=${encodeURIComponent(month)}` : ''}`, { timeoutMs: 12000 }),
    listEmployeeMonth: (employeeId: string, month?: string) =>
      request<TimeTrack[]>(`/time-track/${employeeId}/month${month ? `?month=${encodeURIComponent(month)}` : ''}`, { timeoutMs: 12000 }),
    register: (input: RegisterTimeInput) => request<TimeTrack>('/time-track/register', { method: 'POST', body: input }),
    enrollFacial: (input: { descriptor: number[] }) => request<void>('/time-track/enroll-facial', { method: 'POST', body: input }),
    clockInFacial: (input: RegisterTimeInput & { imageBase64?: string, faceDescriptor?: number[], fallback?: boolean }) => request<TimeTrack>('/time-track/clock-in-facial', { method: 'POST', body: input }),
    manual: (input: ManualTimeTrackInput) => request<TimeTrack>('/time-track/manual', { method: 'POST', body: input }),

    update: (id: string, input: UpdateTimeTrackInput) => request<TimeTrack>(`/time-track/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) => request<void>(`/time-track/${id}`, { method: 'DELETE' }),
    listPending: () => request<TimeTrack[]>('/time-track/pending', { timeoutMs: 12000 }),
    approve: (id: string, approved: boolean) => request<TimeTrack>(`/time-track/${id}/approve`, { method: 'PATCH', body: { approved } }),
    batchApprove: (ids: string[], approved: boolean) => request<any>(`/time-track/batch-approve`, { method: 'POST', body: { ids, approved } }),
    revoke: (id: string, reason: string) => request<TimeTrack>(`/time-track/${id}/revoke`, { method: 'PATCH', body: { reason } }),
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
    update: (id: string, input: UpdateUserInput) => request<AppUser>(`/users/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
    resetPassword: (id: string, body: { newPassword: string }) => request<void>(`/users/${id}/reset-password`, { method: 'POST', body }),
    ping: () => request<void>('/users/ping', { method: 'POST', silent: true }),
  },

  companies: {
    me: () => request<Company>('/companies/me'),
    update: (data: Partial<Company>) => request<Company>('/companies/me', { method: 'PATCH', body: data }),
    getHolidays: () => request<any[]>('/companies/holidays'),
    updateHolidays: (holidays: any[]) => request<any[]>('/companies/holidays', { method: 'PATCH', body: { holidays } }),
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

  notifications: {
    list: () => request<any[]>('/notifications'),
    unreadCount: () => request<{ count: number }>('/notifications/unread-count'),
    markAsRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllAsRead: () => request<any>('/notifications/read-all', { method: 'PATCH' }),
    archive: (id: string) => request<any>(`/notifications/${id}/archive`, { method: 'PATCH' }),
    delete: (id: string) => request<void>(`/notifications/${id}`, { method: 'DELETE' }),
    createAdminNotice: (input: any) => request<any>('/notifications/admin', { method: 'POST', body: input }),
    respond: (id: string, action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE', reason?: string) =>
      request<any>(`/notifications/${id}/respond`, { method: 'PATCH', body: { action, reason } }),
    dashboardWidget: () => request<{ unreadCount: number; notifications: any[] }>('/notifications/dashboard-widget'),
  },
  management: {
    events: {
      list: () => request<ManagementEvent[]>('/management/events'),
      kanban: () => request<{ OVERDUE: ManagementEvent[]; TODAY: ManagementEvent[]; THIS_WEEK: ManagementEvent[]; UPCOMING: ManagementEvent[]; COMPLETED: ManagementEvent[] }>('/management/events/kanban'),
      get: (id: string) => request<ManagementEvent>(`/management/events/${id}`),
      create: (input: CreateManagementEventInput) => request<ManagementEvent>('/management/events', { method: 'POST', body: input }),
      update: (id: string, input: UpdateManagementEventInput) => request<ManagementEvent>(`/management/events/${id}`, { method: 'PATCH', body: input }),
      delete: (id: string) => request<void>(`/management/events/${id}`, { method: 'DELETE' }),
    },
    aso: {
      list: () => request<EmployeeAsoRecord[]>('/management/aso'),
      listByEmployee: (employeeId: string) => request<EmployeeAsoRecord[]>(`/management/aso/employee/${employeeId}`),
      get: (id: string) => request<EmployeeAsoRecord>(`/management/aso/${id}`),
      create: (input: CreateAsoInput) => request<EmployeeAsoRecord>('/management/aso', { method: 'POST', body: input }),
      update: (id: string, input: UpdateAsoInput) => request<EmployeeAsoRecord>(`/management/aso/${id}`, { method: 'PATCH', body: input }),
      delete: (id: string) => request<void>(`/management/aso/${id}`, { method: 'DELETE' }),
      clinicPresets: {
        list: () => request<AsoClinicPreset[]>('/management/aso/clinic-presets'),
        create: (data: Partial<AsoClinicPreset>) => request<AsoClinicPreset>('/management/aso/clinic-presets', { method: 'POST', body: data }),
        delete: (id: string) => request<void>(`/management/aso/clinic-presets/${id}`, { method: 'DELETE' }),
      },
    },
  },

  platform: {
    stats: () => request<PlatformStats>('/platform/stats'),
    listCompanies: () => request<PlatformCompany[]>('/platform/companies', { timeoutMs: 12000 }),
    getCompany: (id: string) => request<PlatformCompany>(`/platform/companies/${id}`),
    getCompanyAuditLogs: (id: string) => request<any[]>(`/platform/companies/${id}/audit-logs`),
    createCompany: (input: CreatePlatformCompanyInput) => request<PlatformCompany & { paymentUrl?: string | null; billingSetupPending?: boolean }>('/platform/companies', { method: 'POST', body: input }),
    updateCompany: (id: string, input: Partial<Omit<CreatePlatformCompanyInput, 'adminName' | 'adminEmail' | 'adminPassword'>> & { isActive?: boolean; status?: CompanyStatus; suspensionReason?: string | null; plan?: string; platformPlanId?: string; billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'; trialEndsAt?: string; activeModules?: string[]; asaasCustomerId?: string; asaasSubscriptionId?: string; internalNotes?: string }) =>
      request<PlatformCompany>(`/platform/companies/${id}`, { method: 'PATCH', body: input }),
    deleteCompany: (id: string) => request<void>(`/platform/companies/${id}`, { method: 'DELETE' }),
    listPlans: () => request<any[]>('/platform/plans'),
    listCompanyUsers: (companyId: string) => request<AppUser[]>(`/platform/company-users/${companyId}`),
    createCompanyUser: (companyId: string, input: CreatePlatformCompanyUserInput) => request<AppUser>(`/platform/company-users/${companyId}`, { method: 'POST', body: input }),
    updateCompanyUser: (companyId: string, userId: string, input: UpdatePlatformCompanyUserInput) => request<AppUser>(`/platform/company-users/${companyId}/${userId}`, { method: 'PATCH', body: input }),
    deleteCompanyUser: (companyId: string, userId: string) => request<void>(`/platform/company-users/${companyId}/${userId}`, { method: 'DELETE' }),
    getOnlineUsers: () => request<AppUser[]>('/platform/online-users'),
    getReceitaCnpj: (cnpj: string) => request<any>(`/platform/receita/${cnpj}`),
    ghostMode: (companyId: string) => request<{ token: string }>(`/platform/ghost-mode/${companyId}`, { method: 'POST' }),
    finance: {
      summary: (query: Pick<PlatformInvoiceQuery, 'from' | 'to'> = {}) => request<PlatformFinanceSummary>(`/finance/platform/summary${makeQuery(query)}`),
      list: (query: PlatformInvoiceQuery = {}) => request<PlatformInvoiceList>(`/finance/platform/invoices${makeQuery(query)}`),
      listCompany: (companyId: string) => request<PlatformInvoice[]>(`/finance/platform/companies/${companyId}/invoices`),
      checkoutCompany: (companyId: string) => request<CompanyBillingResult>(`/finance/platform/companies/${companyId}/checkout`, { method: 'POST', timeoutMs: 20000 }),
      create: (input: CreatePlatformInvoiceInput) => request<PlatformInvoice>('/finance/platform/invoices', { method: 'POST', body: input }),
      update: (id: string, input: UpdatePlatformInvoiceInput) => request<PlatformInvoice>(`/finance/platform/invoices/${id}`, { method: 'PATCH', body: input }),
      sync: (id: string) => request<PlatformInvoice>(`/finance/platform/invoices/${id}/sync`, { method: 'POST' }),
      delete: (id: string) => request<{ id: string }>(`/finance/platform/invoices/${id}`, { method: 'DELETE' }),
    },
  },

  companyBilling: {
    status: () => request<CompanyBillingResult>('/finance/company/status', { silent: true, keepSessionOn401: true, timeoutMs: 10000 }),
    invoices: () => request<PlatformInvoice[]>('/finance/company/invoices', { silent: true, keepSessionOn401: true }),
    checkout: () => request<CompanyBillingResult>('/finance/company/checkout', { method: 'POST', silent: true, keepSessionOn401: true, timeoutMs: 25000 }),
  },
  proposals: {
    list: () => request<any[]>('/proposals'),
    getCompanyProposals: () => request<any[]>('/proposals/company'),
    getStatus: (id: string) => request<any>(`/proposals/${id}/status`),
    create: (data: any) => request<any>('/proposals', { method: 'POST', body: data }),
    send: (id: string) => request<any>(`/proposals/${id}/send`, { method: 'POST' }),
    acceptTerms: (id: string, data: any) => request<any>(`/proposals/${id}/accept-terms`, { method: 'POST', body: data }),
  },

  schedules: {
    /** Lista todos os templates de escala da empresa */
    list: () => request<any[]>('/schedules'),
    /** Detalhe de um template */
    get: (id: string) => request<any>(`/schedules/${id}`),
    /** Cria novo template (ADM/RH/DEV) */
    create: (data: any) => request<any>('/schedules', { method: 'POST', body: data }),
    /** Atualiza template */
    update: (id: string, data: any) => request<any>(`/schedules/${id}`, { method: 'PATCH', body: data }),
    /** Arquiva template */
    archive: (id: string) => request<any>(`/schedules/${id}/archive`, { method: 'PATCH' }),
    /** Atribui escala a funcionário (ADM/RH/DEV) */
    assign: (data: { employeeId: string; scheduleId: string; startDate: string; endDate?: string; entryTimeOverride?: string; lunchStartTimeOverride?: string; lunchReturnTimeOverride?: string; exitTimeOverride?: string }) =>
      request<any>('/schedules/assign', { method: 'POST', body: data }),
    /** Escala do usuário logado */
    mySchedule: () => request<any>('/schedules/my'),
    /** Calendário do usuário logado (mês no formato "2025-07") */
    myCalendar: (month?: string) =>
      request<any>(`/schedules/calendar/me${month ? `?month=${encodeURIComponent(month)}` : ''}`),
    /** Calendário de um funcionário específico */
    employeeCalendar: (employeeId: string, month?: string) =>
      request<any>(`/schedules/calendar/${employeeId}${month ? `?month=${encodeURIComponent(month)}` : ''}`),
    /** Escala de equipe (GESTOR+) */
    teamSchedule: (month?: string) =>
      request<any>(`/schedules/team${month ? `?month=${encodeURIComponent(month)}` : ''}`),
    /** Cria exceção de escala (folga, atestado, feriado local) */
    createException: (data: { employeeId: string; date: string; exceptionType: string; reason?: string; observation?: string; altEntryTime?: string; altExitTime?: string }) =>
      request<any>('/schedules/exceptions', { method: 'POST', body: data }),
    /** Remove exceção */
    deleteException: (id: string) => request<void>(`/schedules/exceptions/${id}`, { method: 'DELETE' }),
  },

  scheduleSwaps: {
    /** Lista solicitações de troca */
    list: (status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED') =>
      request<any[]>(`/schedule-swaps${status ? `?status=${status}` : ''}`),
    /** Cria solicitação de troca */
    create: (data: { originalDate: string; targetDate: string; justification?: string }) =>
      request<any>('/schedule-swaps', { method: 'POST', body: data }),
    /** Aprova ou rejeita (GESTOR/RH/ADM/DEV) */
    review: (id: string, action: 'APPROVED' | 'REJECTED', rejectionReason?: string) =>
      request<any>(`/schedule-swaps/${id}/review`, { method: 'PATCH', body: { action, rejectionReason } }),
    /** Cancela solicitação */
    cancel: (id: string) => request<any>(`/schedule-swaps/${id}/cancel`, { method: 'PATCH' }),
  },
};

export default api;
