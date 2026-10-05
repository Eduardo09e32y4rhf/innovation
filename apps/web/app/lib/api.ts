'use client';

import { clearAuthSession, persistAuthSession, readAuthSession, readParsedAuthSession } from './auth-session';
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
  code?: string;
  fields?: Array<{ field: string; message: string }>;
  constructor(status: number, message: string, body?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = code;
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
  let retriedAfterRefresh = false;
  const serializedBody = body !== undefined ? (typeof FormData !== 'undefined' && body instanceof FormData ? body : JSON.stringify(body)) : undefined;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: serializedBody,
      credentials: 'include',
      signal: controller?.signal,
    });
  } catch (err) {
    if (controller?.signal.aborted) {
      throw new ApiError(0, `O sistema demorou mais que ${Math.round((timeoutMs ?? 0) / 1000)}s para responder. Tente novamente.`, err);
    }
    throw new ApiError(0, 'Não foi possível conectar ao sistema. Verifique sua internet e tente novamente.', err);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }

  if (res.status === 401 && path !== '/auth/refresh') {
    try {
      const refresh = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refresh.ok) {
        const refreshed = await refresh.json().catch(() => null);
        const nextToken = refreshed?.data?.access_token ?? refreshed?.access_token;
        if (nextToken && typeof window !== 'undefined') {
          const session = readParsedAuthSession();
          if (session.user && session.company) {
            persistAuthSession(nextToken, session.user, session.company, session.passwordChangeRequired, session.isIsolatedTab);
          }
          headers.Authorization = `Bearer ${nextToken}`;
          res = await fetch(`${API_URL}${path}`, { method, headers, body: serializedBody, credentials: 'include', signal: controller?.signal });
          retriedAfterRefresh = true;
        }
      }
    } catch { /* cai para o fluxo normal de sessão expirada */ }
  }

  if (res.status === 401 && !retriedAfterRefresh) {
    if (!keepSessionOn401) {
      clearSession();
      if (!silent && typeof window !== 'undefined') window.location.href = '/login';
    }
    throw new ApiError(401, 'Sua sessão expirou. Entre novamente para continuar.');
  }

  if (res.status === 402) {
    if (!silent && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/');
      const tenant = parts.length > 1 && parts[1] ? parts[1] : null;
      if (tenant && !window.location.pathname.includes('fatura-pendente')) {
        window.location.href = `/${tenant}/fatura-pendente`;
      }
    }
  }

  const text = await res.clone().text();
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
    const code = nested && typeof nested === 'object' && 'code' in nested ? String((nested as any).code) : undefined;
    const apiError = new ApiError(res.status, parsedMessage || 'Não foi possível concluir a ação. Tente novamente.', data, code);
    const fields = nested && typeof nested === 'object' ? (nested as any).fields : undefined;
    if (Array.isArray(fields)) apiError.fields = fields;
    throw apiError;
  }

  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return (data as { data: T }).data;
  }

  return data as T;
}

function parseDownloadName(disposition: string): string {
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (star) { try { return decodeURIComponent(star.trim()); } catch { /* tenta as outras formas */ } }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(disposition)?.[1];
  if (quoted) { try { return decodeURIComponent(quoted); } catch { return quoted; } }
  const bare = /filename\s*=\s*([^;]+)/i.exec(disposition)?.[1];
  return bare ? bare.trim() : 'anexo';
}

async function downloadRequest(path: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers });
  } catch (err) {
    throw new ApiError(0, 'Não foi possível conectar ao sistema. Verifique sua internet e tente novamente.', err);
  }
  if (response.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new ApiError(401, 'Sua sessão expirou. Entre novamente para continuar.');
  }
  if (!response.ok) {
    const data = safeJson(await response.text());
    const nested = data && typeof data === 'object' && 'error' in data ? (data as any).error : data;
    const raw = nested && typeof nested === 'object' && 'message' in nested ? (nested as any).message : data && typeof data === 'object' && 'message' in data ? (data as any).message : null;
    const message = Array.isArray(raw) ? raw.join(', ') : raw ? String(raw) : `Nao foi possivel baixar o arquivo (erro ${response.status}).`;
    throw new ApiError(response.status, message, data);
  }
  const blob = await response.blob();
  if (blob.size === 0) throw new ApiError(500, 'O servidor devolveu um arquivo vazio.');
  const filename = parseDownloadName(response.headers.get('content-disposition') || '');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
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

export type EmployeeStatus = 'ACTIVE' | 'ONBOARDING' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type UserRole = 'DEV' | 'CEO' | 'CONTABIL' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';
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
  blockedAt?: string | null;
  blockedReason?: string | null;
  canceledAt?: string | null;
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
export interface LinkableEmployee { id: string; name: string; email?: string | null; registration?: string | null; position?: string | null; department?: string | null }
export interface ActivityChange { field: string; from: string | null; to: string | null }
export interface ActivityItem { id: string; at: string; ip: string | null; type: 'PAGE' | 'LOGIN' | 'CHANGE' | 'SECURITY' | 'ACCESS'; title: string; target: string | null; changes: ActivityChange[]; by: string | null }
export interface UserActivity { user: { id: string; name: string; email: string; registration: string | null; role: UserRole }; days: number; total: number; truncated: boolean; generatedAt: string; items: ActivityItem[] }
export type CreatedUser = AppUser & { temporaryPassword?: string; temporaryPasswordExpiresAt?: string }
export interface CreateUserInput { name: string; email: string; password?: string; role?: UserRole; customPermissions?: string[] | null; companyId?: string; employeeId?: string; }
export interface UpdateUserInput extends Partial<CreateUserInput> { isActive?: boolean; forcePasswordChange?: boolean; }

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
  requireFacialRecognition?: boolean;
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
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT';
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
  billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT';
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
  asaasPaymentId?: string | null; invoiceUrl?: string | null; paidAt?: string | null; provider?: string | null; mpPaymentId?: string | null; receiptUrl?: string | null;
  invoiceNumber?: string | null; invoiceSeries?: string | null; invoiceStatus?: string | null; nfeStatus?: string | null; fiscalPdfUrl?: string | null; fiscalXmlUrl?: string | null; invoiceAuthorizedAt?: string | null;
  createdAt: string; updatedAt: string;
  company: { id: string; name: string; legalName?: string | null; document?: string | null; asaasCustomerId?: string | null };
  plan?: { id: string; name: string } | null;
}
export interface InvoiceAdjustment {
  id: string; companyId: string; invoiceId?: string | null; createdAt: string; reason: string;
  type: 'DISCOUNT' | 'RECURRING_DISCOUNT' | 'FREE_DAYS' | 'PARTIAL_REFUND' | 'PRORATION' | 'FISCAL_ATTACHED';
  amount?: number | string | null; days?: number | null; metadata?: Record<string, unknown> | null;
}
export interface FaturasRolePermissions {
  catalog: string[];
  roles: Array<{ role: string; permissions: string[]; customized: boolean; locked: boolean }>;
}

export interface PlanQuote {
  currentPlan?: string; nextPlan: string; currentTotal: number; nextTotal: number; kind: 'UPGRADE' | 'DOWNGRADE';
  prorationAmount: number; remainingDays: number; cycleDays: number; effectiveAt?: string | null;
}

export interface SeatsQuote {
  currentSeats: number; nextSeats: number; currentTotal: number; nextTotal: number; kind: 'UPGRADE' | 'DOWNGRADE' | 'SEM_MUDANCA';
  prorationAmount: number; remainingDays: number; cycleDays: number; periodEnd?: string | null; downgradeEffectiveAt?: string | null;
}
export interface FaturasCompaniesQuery { page?: number; limit?: number; search?: string; status?: string; billingStatus?: string }
export interface FaturasCompanyRow {
  id: string; name: string; document?: string | null; status: string; billingStatus: string; plan: string; trialEndsAt?: string | null;
  subscription?: { status: string; seatQuantity: number; nextDueDate?: string | null; billingPaused: boolean; couponType?: string | null; couponValue?: number | null; couponCyclesLeft?: number | null } | null;
  open: { total: number; count: number }; overdue: { total: number; count: number };
}
export interface FaturasCompanyList { items: FaturasCompanyRow[]; pagination: { page: number; limit: number; total: number; pages: number } }
export interface PlatformFinanceSummary {
  totals: { billed: number; received: number; open: number; overdue: number; canceled: number };
  count: number; conversionRate: number;
  monthly: Array<{ month: string; billed: number; received: number }>;
  mrr: number;
  activeSubscriptions: number;
}
export interface PlatformBillingAuditLog {
  id: string;
  companyId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    document?: string | null;
    plan?: string | null;
    status?: CompanyStatus;
    billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT';
    asaasCustomerId?: string | null;
    asaasSubscriptionId?: string | null;
    subscriptionStartedAt?: string | null;
  } | null;
  user?: { id: string; name: string; email: string; role?: UserRole } | null;
}
export interface PlatformInvoiceList {
  items: PlatformInvoice[];
  pagination: { page: number; limit: number; total: number; pages: number };
}
export interface AsaasWebhookEvent {
  id: string;
  asaasEventId: string;
  eventType: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'IGNORED' | string;
  attempts: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt?: string | null;
  company?: { id: string; name: string } | null;
  paymentId?: string | null;
}
export interface PlatformInvoiceQuery {
  page?: number; limit?: number; status?: PlatformInvoiceStatus | ''; search?: string; from?: string; to?: string; companyId?: string;
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
  code?: string;
  commitmentMonths?: number;
  discountPercent?: number;
  baseMonthlyPrice?: number;
  userMonthlyPrice?: number;
  asaasCycle?: string;
  pricingVersion?: string;
  isRecommended?: boolean;
}
export interface CompanyBillingResult {
  company?: { id: string; name: string; status: CompanyStatus; billingStatus: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT'; suspensionReason?: string | null };
  invoice?: PlatformInvoice | null;
  currentInvoice?: PlatformInvoice | null;
  active: boolean;
  paymentUrl?: string | null;
  plan?: PublicPlatformPlan | null;
  subscription?: { status: string; seatQuantity: number; pendingSeatQuantity?: number | null; trialEndsAt?: string | null; currentPeriodEnd?: string | null; nextDueDate?: string | null } | null;
  usage?: { users: number; maxUsers: number; employees: number; maxEmployees: number };
}
export interface PlatformStats { companies: number; users: number; employees: number; messages: number; activeCompanies: number; suspendedCompanies: number; pastDueCompanies: number; }
export interface AccountingCompanyRow {
  id: string; name: string; document?: string | null; status: string; billingStatus?: string;
  closings: number; closingsInReview: number; payrolls: number; payrollsPending: number;
  invoices: number; invoicesOverdue: number; invoiceTotal: number;
}
export interface AccountingClosing {
  id: string; companyId: string; status: string; periodStart: string; periodEnd: string;
  salaryBase?: number | string; grossPay?: number | string; netPay?: number | string;
  overtime50?: number | string; overtime100?: number | string; nightShift?: number | string;
  absenceMinutes?: number; lateMinutes?: number; earlyLeaveMinutes?: number; updatedAt: string;
  company?: { name: string }; employee?: { name: string; position?: string | null };
  adjustments?: Array<{ id: string; field: string; oldValue: string; newValue: string; reason: string; createdAt: string }>;
}
export interface AccountingPayroll {
  id: string; companyId: string; status: string; baseSalary: number | string; grossSalary: number | string;
  netSalary: number | string; inssAmount: number | string; irrfAmount: number | string; fgtsAmount: number | string;
  overtimeAmount?: number | string; nightShiftAmount?: number | string; observations?: string | null; updatedAt: string;
  employee?: { name: string; position?: string | null };
}
export interface AccountingOverview {
  period: { year: number; month: number; key: string };
  metrics: { companies: number; closings: number; closingsInReview: number; payrolls: number; payrollsPending: number; invoiceTotal: number; invoicesOverdue: number; invoicesWithoutFiscalNumber: number };
  companies: AccountingCompanyRow[];
  recentClosings: AccountingClosing[];
  recentPayrolls: AccountingPayroll[];
  recentInvoices: PlatformInvoice[];
}
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
  status: string; result?: 'APTO' | 'INAPTO' | null; clinicName?: string | null; doctorName?: string | null;
  documentUrl?: string | null; documentNumber?: string | null;
  observation?: string | null;
  createdBy?: string | null; createdAt: string; updatedAt: string;
  employee?: { id: string; name: string; cpf?: string | null; role?: string | null; admissionDate?: string | null; department?: string | null } | null;
}
export interface EmployeeDeletionImpact {
  timeTracks: number;
  vacations: number;
  asoRecords: number;
  timeOccurrences: number;
  timeClosings: number;
  userSchedules: number;
  scheduleExceptions: number;
  supportTicketsAffected: number;
  total: number;
}
export interface EmployeeDeleteResult {
  deleted: boolean;
  archived: boolean;
  employeeId: string;
  message: string;
  deletionImpact: EmployeeDeletionImpact;
}
export interface EmployeeDossier {
  employee: Employee;
  asoRecords: EmployeeAsoRecord[];
  vacations: Vacation[];
  recentTimeTracks: TimeTrack[];
  occurrences: any[];
  deletionImpact: EmployeeDeletionImpact;
}
export interface AsoClinicPreset {
  id: string; companyId: string;
  name: string; cep?: string | null; address?: string | null;
  city?: string | null; state?: string | null; phone?: string | null;
  doctorName?: string | null; active: boolean;
  createdAt: string; updatedAt: string;
}
export interface CreateAsoInput {
  employeeId: string; asoType: string; status?: string; result?: 'APTO' | 'INAPTO' | null;
  examDate?: string; dueDate?: string;
  clinicName?: string; doctorName?: string; documentUrl?: string;
  observation?: string;
  saveClinicPreset?: boolean; clinicCep?: string; clinicAddress?: string;
  clinicCity?: string; clinicState?: string; clinicPhone?: string;
}
export interface UpdateAsoInput {
  asoType?: string; examDate?: string; dueDate?: string;
  status?: string; result?: 'APTO' | 'INAPTO' | null; clinicName?: string; doctorName?: string;
  documentUrl?: string; observation?: string;
  saveClinicPreset?: boolean; clinicCep?: string; clinicAddress?: string;
  clinicCity?: string; clinicState?: string; clinicPhone?: string;
}
export interface SessionInfo { id: string; createdAt: string; lastUsedAt?: string; ip?: string; userAgent?: string; current?: boolean; }

// Module API

export const api = {
  request,

  auth: {
    verifyEmail: (token: string) => request<{ verified: boolean }>('/auth/verify-email', { method: 'POST', body: { token } }),
    refresh: () => request<{ access_token: string }>('/auth/refresh', { method: 'POST' }),
    verifyMfa: (mfaToken: string, code?: string, recoveryCode?: string) => request<any>('/auth/mfa/verify', { method: 'POST', body: { mfaToken, code: code || undefined, recoveryCode: recoveryCode || undefined } }),
    mfaStatus: () => request<{ enabled: boolean; enabledAt?: string; required: boolean; recoveryCodesLeft: number }>('/auth/mfa/status'),
    mfaSetup: () => request<{ secret: string; otpauthUrl: string; issuer?: string; account?: string }>('/auth/mfa/setup', { method: 'POST' }),
    mfaEnable: async (code: string) => {
      const result = await request<{ access_token?: string; recoveryCodes: string[]; user?: unknown; company?: unknown }>('/auth/mfa/enable', { method: 'POST', body: { code } });
      if (result.access_token && typeof window !== 'undefined') {
        const session = readParsedAuthSession();
        if (session.user && session.company) persistAuthSession(result.access_token, session.user, session.company, session.passwordChangeRequired, session.isIsolatedTab);
      }
      return result;
    },
    sessions: () => request<SessionInfo[]>('/auth/sessions'),
    revokeSession: (id: string) => request<{ revoked: boolean }>(`/auth/sessions/${id}`, { method: 'DELETE' }),
    revokeOtherSessions: () => request<{ revoked: number }>('/auth/sessions/revoke-others', { method: 'POST' }),
    requestPasswordReset: (email: string, website?: string) => request<{ requested: boolean; demoCode?: string }>('/auth/password-reset/request', { method: 'POST', body: { email, website } }),
    validateResetCode: (email: string, code: string, cpfStart?: string, registration?: string) => request<{ valid: boolean; resetToken: string }>('/auth/password-reset/validate-code', { method: 'POST', body: { email, code, cpfStart: cpfStart || undefined, registration: registration || undefined } }),
    resetPassword: (token: string, newPassword: string) => request<{ changed: boolean }>('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } }),
    publicPlans: () => request<PublicPlatformPlan[]>('/auth/public-plans'),
    quotePublicPlan: (data: { planId: string; seatQuantity: number; couponCode?: string }) => request<{ total: number; monthlyEquivalent?: number; commitmentMonths: number; seatQuantity: number; couponApplied: boolean; trialDays: number }>('/auth/public-plans/quote', { method: 'POST', body: data }),
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

  lookup: {
    cep: (cep: string) => request<{ street: string; neighborhood: string; city: string; state: string }>(`/lookup/cep/${cep.replace(/\D/g, '')}`, { silent: true, timeoutMs: 15000 }),
    cnpj: (cnpj: string) => request<{ legalName: string; tradeName: string; street: string; streetNumber: string; addressComplement: string; neighborhood: string; city: string; state: string; cep: string; phone: string; email: string }>(`/lookup/cnpj/${cnpj.replace(/\D/g, '')}`, { silent: true, timeoutMs: 20000 }),
  },

  dashboard: {
    summary: () => request<DashboardSummary>('/dashboard/summary'),
    insights: () => request<DashboardInsights>('/dashboard/insights'),
    rhAlerts: () => request<{ asoExpired: number; asoExpiringSoon: number; pendingAdmissionAso: number; inaptoCount: number; items: { type: string; employeeId: string; employeeName: string; message: string; target: string }[] }>('/management/aso/alerts/rh'),
  },

  employees: {
    list: (page?: number, pageSize?: number, search?: string, status?: string) => request<Employee[]>('/employees' + makeQuery({ page, pageSize, search, status })),
    swapCandidates: () => request<any[]>('/employees/swap-candidates'),
    get: (id: string) => request<Employee>(`/employees/${id}`),
    dossier: (id: string) => request<EmployeeDossier>(`/employees/${id}/dossier`),
    create: (input: CreateEmployeeInput) => request<Employee>('/employees', { method: 'POST', body: input }),
    update: (id: string, input: Partial<CreateEmployeeInput>) => request<Employee>(`/employees/${id}`, { method: 'PATCH', body: input }),
    terminate: (id: string) => request<Employee>(`/employees/${id}`, { method: 'DELETE' }),
    delete: (id: string) => request<EmployeeDeleteResult>(`/employees/${id}/permanent`, { method: 'DELETE' }),
    createAccess: (id: string, input: { email: string; role?: string; name?: string }) => request<{ success: boolean; userId?: string; temporaryPassword?: string; email: string; role: string }>(`/employees/${id}/access`, { method: 'POST', body: input }),
    linkAccess: (id: string, userId: string) => request<{ success: boolean; employeeId: string; userId: string }>(`/employees/${id}/access/link`, { method: 'POST', body: { userId } }),
    unlinkAccess: (id: string) => request<{ success: boolean; employeeId: string }>(`/employees/${id}/access/link`, { method: 'DELETE' }),
    bulkAccess: (input: { employeeIds: string[]; action: string; role?: string }) => request<Array<{ employeeId?: string; row?: number; success: boolean; error?: string; temporaryPassword?: string; role?: string }>>('/employees/access/bulk', { method: 'POST', body: input }),
    validateImport: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return request<{ valid: boolean; importToken: string | null; totalRows: number; validRows: number; invalidRows: number; preview: Array<Record<string, unknown>>; errors: Array<{ row: number; column: string; message: string }>; invalidRowsData?: any[] }>('/employees/import/validate', { method: 'POST', body: form, timeoutMs: 30000 });
    },
    confirmImport: (importToken: string) => request<{ imported: number; totalProcessed: number; invalidRows: number; results: any[] }>('/employees/import/confirm', { method: 'POST', body: { importToken }, timeoutMs: 30000 }),
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
    downloadCollectivePdf: (month: string, employeeIds: string[] = []) =>
      downloadRequest(`/time-closing/collective/pdf${makeQuery({
        month,
        employeeIds: employeeIds.length ? employeeIds.join(',') : undefined,
      })}`),
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
  timeTrack: {
    list: (month?: string) =>
      request<TimeTrack[]>(`/time-track${month ? `?month=${encodeURIComponent(month)}` : ''}`, { timeoutMs: 12000 }),
    listEmployeeMonth: (employeeId: string, month?: string) =>
      request<TimeTrack[]>(`/time-track/${employeeId}/month${month ? `?month=${encodeURIComponent(month)}` : ''}`, { timeoutMs: 12000 }),
    register: (input: RegisterTimeInput) => request<TimeTrack>('/time-track/register', { method: 'POST', body: input }),
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

  documents: {
    list: () => request<any[]>('/time-closing'),
    generate: (input: { month: number; year: number }) => request<any>('/time-closing/generate', { method: 'POST', body: input }),
    downloadIndividual: (closingId: string) => downloadRequest(`/time-closing/${closingId}/pdf`),
    downloadCollective: (month: string, employeeIds?: string[]) => {
      const params = new URLSearchParams({ month });
      if (employeeIds && employeeIds.length) {
        employeeIds.forEach(id => params.append('employeeIds', id));
      }
      return downloadRequest(`/time-closing/collective/pdf?${params.toString()}`);
    },
  },

  users: {
    list: () => request<AppUser[]>('/users'),
    usage: () => request<UsersUsage>('/users/usage'),
    get: (id: string) => request<AppUser>(`/users/${id}`),
    create: (input: CreateUserInput) => request<CreatedUser>('/users', { method: 'POST', body: input }),
    linkableEmployees: (search: string, companyId?: string) => request<LinkableEmployee[]>(`/users/linkable-employees${makeQuery({ search, companyId })}`),
    linkEmployee: (id: string, employeeId: string | null) => request<AppUser>(`/users/${id}/employee`, { method: 'PUT', body: { employeeId } }),
    block: (id: string, reason?: string) => request<AppUser>(`/users/${id}/block`, { method: 'POST', body: { reason } }),
    unblock: (id: string) => request<AppUser>(`/users/${id}/unblock`, { method: 'POST' }),
    deletePermanently: (id: string) => request<{ deleted: boolean }>(`/users/${id}/permanent`, { method: 'DELETE' }),
    cancel: (id: string, reason?: string) => request<AppUser>(`/users/${id}/cancel`, { method: 'POST', body: { reason } }),
    activity: (id: string, query: { days?: number; since?: string; limit?: number } = {}) => request<UserActivity>(`/users/${id}/activity${makeQuery(query)}`, { silent: true }),
    activityPdf: (id: string, days = 30) => downloadRequest(`/users/${id}/activity/pdf?days=${days}`),
    pageView: (path: string) => request<void>('/users/activity/page-view', { method: 'POST', body: { path }, silent: true }),
    update: (id: string, input: UpdateUserInput) => request<AppUser>(`/users/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
    resetPassword: (id: string, body: { newPassword: string }) => request<AppUser>(`/users/${id}/reset-password`, { method: 'POST', body }),
    revealTemporaryPassword: (id: string) => request<{ temporaryPassword: string; expiresAt: string }>(`/users/${id}/temporary-password/reveal`, { method: 'POST' }),
    reissueTemporaryPassword: (id: string) => request<{ temporaryPassword: string; expiresAt: string }>(`/users/${id}/temporary-password/reissue`, { method: 'POST' }),
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
    listCompanies: (params?: { page?: number; limit?: number; search?: string }) => request<{ data: PlatformCompany[]; total: number; page: number; limit: number }>(`/platform/companies${makeQuery(params || {})}`, { timeoutMs: 12000 }),
    getCompany: (id: string) => request<PlatformCompany>(`/platform/companies/${id}`),
    getCompanyAuditLogs: (id: string) => request<any[]>(`/platform/companies/${id}/audit-logs`),
    createCompany: (input: CreatePlatformCompanyInput) => request<PlatformCompany & { paymentUrl?: string | null; billingSetupPending?: boolean }>('/platform/companies', { method: 'POST', body: input }),
    updateCompany: (id: string, input: Partial<Omit<CreatePlatformCompanyInput, 'adminName' | 'adminEmail' | 'adminPassword'>> & { isActive?: boolean; status?: CompanyStatus; suspensionReason?: string | null; plan?: string; platformPlanId?: string; billingStatus?: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'PENDING_PAYMENT'; trialEndsAt?: string; activeModules?: string[]; asaasCustomerId?: string; asaasSubscriptionId?: string; internalNotes?: string }) =>
      request<PlatformCompany>(`/platform/companies/${id}`, { method: 'PATCH', body: input }),
    deleteCompany: (id: string) => request<void>(`/platform/companies/${id}`, { method: 'DELETE' }),
    purgeCompany: (id: string) => request<void>(`/platform/companies/${id}/purge`, { method: 'DELETE' }),
    listPlans: () => request<any[]>('/platform/plans'),
    listManualContracts: (query?: any) => request<any[]>(`/manual-contracts${makeQuery(query || {})}`),
    listCompanyUsers: (companyId: string) => request<AppUser[]>(`/platform/company-users/${companyId}`),
    createCompanyUser: (companyId: string, input: CreatePlatformCompanyUserInput) => request<AppUser>(`/platform/company-users/${companyId}`, { method: 'POST', body: input }),
    updateCompanyUser: (companyId: string, userId: string, input: UpdatePlatformCompanyUserInput) => request<AppUser>(`/platform/company-users/${companyId}/${userId}`, { method: 'PATCH', body: input }),
    deleteCompanyUser: (companyId: string, userId: string) => request<void>(`/platform/company-users/${companyId}/${userId}`, { method: 'DELETE' }),
    getOnlineUsers: () => request<AppUser[]>('/platform/online-users'),
    getReceitaCnpj: (cnpj: string) => request<any>(`/platform/receita/${cnpj}`),
    ghostMode: (companyId: string) => request<{ token: string }>(`/platform/ghost-mode/${companyId}`, { method: 'POST' }),
    finance: {
      summary: (query: Pick<PlatformInvoiceQuery, 'from' | 'to' | 'companyId'> = {}) => request<PlatformFinanceSummary>(`/finance/platform/summary${makeQuery(query)}`),
      list: (query: PlatformInvoiceQuery = {}) => request<PlatformInvoiceList>(`/finance/platform/invoices${makeQuery(query)}`),
      listCompany: (companyId: string) => request<PlatformInvoice[]>(`/finance/platform/companies/${companyId}/invoices`),
      checkoutCompany: (companyId: string) => request<CompanyBillingResult>(`/finance/platform/companies/${companyId}/checkout`, { method: 'POST', timeoutMs: 20000 }),
      create: (input: CreatePlatformInvoiceInput) => request<PlatformInvoice>('/finance/platform/invoices', { method: 'POST', body: input }),
      update: (id: string, input: UpdatePlatformInvoiceInput) => request<PlatformInvoice>(`/finance/platform/invoices/${id}`, { method: 'PATCH', body: input }),
      sync: (id: string) => request<PlatformInvoice>(`/finance/platform/invoices/${id}/sync`, { method: 'POST' }),
      refund: (id: string) => request<PlatformInvoice>(`/finance/platform/invoices/${id}/refund`, { method: 'POST' }),
      webhookEvents: (query: { companyId?: string; limit?: number } = {}) => request<AsaasWebhookEvent[]>(`/finance/platform/webhook-events${makeQuery(query)}`),
      retryWebhookEvent: (id: string) => request<{ queued: boolean; id: string }>(`/finance/platform/webhook-events/${id}/retry`, { method: 'POST' }),
      billingAuditLogs: (query: { companyId?: string; limit?: number } = {}) => request<PlatformBillingAuditLog[]>(`/finance/platform/audit-logs${makeQuery(query)}`),
      delete: (id: string) => request<{ id: string }>(`/finance/platform/invoices/${id}`, { method: 'DELETE' }),
      downloadStatementPdf: (query: Pick<PlatformInvoiceQuery, 'status' | 'search' | 'from' | 'to' | 'companyId'> = {}) =>
        downloadRequest(`/finance/platform/statements/pdf${makeQuery(query)}`),
    },
  },

  manualContracts: {
    list: (query?: { companyId?: string }) => request<any[]>(`/manual-contracts${makeQuery(query || {})}`),
    create: (input: any) => request<any>('/manual-contracts', { method: 'POST', body: input }),
    update: (id: string, input: any) => request<any>(`/manual-contracts/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) => request<any>(`/manual-contracts/${id}`, { method: 'DELETE' }),
    downloadPdf: (id: string) => downloadRequest(`/manual-contracts/${id}/pdf`),
  },

  companyBilling: {
    status: () => request<CompanyBillingResult>('/finance/company/status', { silent: true, keepSessionOn401: true, timeoutMs: 10000 }),
    invoices: () => request<PlatformInvoice[]>('/finance/company/invoices', { silent: true, keepSessionOn401: true }),
    checkout: () => request<CompanyBillingResult>('/finance/company/checkout', { method: 'POST', silent: true, keepSessionOn401: true, timeoutMs: 25000 }),
    changeSeats: (seatQuantity: number) => request<{ changed: boolean; scheduled: boolean; seatQuantity: number; pendingSeatQuantity?: number | null; effectiveAt?: string | null }>('/finance/company/change-seats', { method: 'POST', body: { seatQuantity } }),
    changePlan: (planId: string) => request<{ message: string }>('/finance/company/change-plan', { method: 'POST', body: { planId } }),
  },
  faturas: {
    empresaStatus: () => request<CompanyBillingResult>('/faturas/empresa/status', { silent: true, keepSessionOn401: true, timeoutMs: 10000 }),
    empresaInvoices: () => request<PlatformInvoice[]>('/faturas/empresa/invoices', { silent: true, keepSessionOn401: true }),
    empresaCheckout: () => request<CompanyBillingResult>('/faturas/empresa/checkout', { method: 'POST', silent: true, keepSessionOn401: true, timeoutMs: 25000 }),
    summary: (query: Pick<PlatformInvoiceQuery, 'from' | 'to' | 'companyId'> = {}) => request<PlatformFinanceSummary>(`/faturas/plataforma/summary${makeQuery(query)}`),
    companies: (query: FaturasCompaniesQuery = {}) => request<FaturasCompanyList>(`/faturas/plataforma/companies${makeQuery(query)}`),
    companyInvoices: (companyId: string) => request<PlatformInvoice[]>(`/faturas/plataforma/companies/${companyId}/invoices`),
    adjustments: (companyId: string) => request<InvoiceAdjustment[]>(`/faturas/plataforma/companies/${companyId}/adjustments`),
    charge: (input: CreatePlatformInvoiceInput) => request<PlatformInvoice>('/faturas/plataforma/invoices', { method: 'POST', body: input }),
    cancelInvoice: (id: string, reason: string) => request<{ id: string }>(`/faturas/plataforma/invoices/${id}`, { method: 'DELETE', body: { reason } }),
    discountInvoice: (id: string, input: { kind: 'PERCENT' | 'FIXED'; value: number; reason: string }) => request<PlatformInvoice>(`/faturas/plataforma/invoices/${id}/discount`, { method: 'POST', body: input }),
    refundPartial: (id: string, input: { amount: number; reason: string }) => request<InvoiceAdjustment>(`/faturas/plataforma/invoices/${id}/refund-partial`, { method: 'POST', body: input }),
    refundFull: (id: string, reason: string) => request<PlatformInvoice>(`/faturas/plataforma/invoices/${id}/refund`, { method: 'POST', body: { reason } }),
    attachFiscal: (id: string, input: { reason: string; invoiceNumber?: string; fiscalPdfUrl?: string; fiscalXmlUrl?: string; receiptUrl?: string }) => request<PlatformInvoice>(`/faturas/plataforma/invoices/${id}/fiscal`, { method: 'POST', body: input }),
    recurringDiscount: (companyId: string, input: { kind: 'PERCENT' | 'FIXED'; value: number; cycles: number; reason: string }) => request<{ total: number; discountPerCycle: number; cycles: number; providerSynced: boolean }>(`/faturas/plataforma/companies/${companyId}/recurring-discount`, { method: 'POST', body: input }),
    freeDays: (companyId: string, input: { days: number; reason: string }) => request<{ nextDueDate: string; movedInvoices: number; providerSynced: boolean }>(`/faturas/plataforma/companies/${companyId}/free-days`, { method: 'POST', body: input }),
    quoteSeats: (companyId: string, seatQuantity: number) => request<SeatsQuote>(`/faturas/plataforma/companies/${companyId}/seats/quote?seatQuantity=${seatQuantity}`),
    changeSeats: (companyId: string, input: { seatQuantity: number; reason: string }) => request<{ prorationAmount: number; scheduled?: boolean }>(`/faturas/plataforma/companies/${companyId}/seats`, { method: 'POST', body: input }),
    pauseBilling: (companyId: string) => request<unknown>(`/faturas/plataforma/companies/${companyId}/billing/pause`, { method: 'POST' }),
    quotePlan: (companyId: string, planId: string) => request<PlanQuote>(`/faturas/plataforma/companies/${companyId}/plan/quote?planId=${planId}`),
    changePlan: (companyId: string, input: { planId: string; reason: string }) => request<{ scheduled: boolean; prorationAmount: number }>(`/faturas/plataforma/companies/${companyId}/plan`, { method: 'POST', body: input }),
    syncInvoice: (id: string) => request<PlatformInvoice>(`/faturas/plataforma/invoices/${id}/sync`, { method: 'POST' }),
    downloadStatementPdf: (query: Pick<PlatformInvoiceQuery, 'status' | 'search' | 'from' | 'to' | 'companyId'> = {}) => downloadRequest(`/faturas/plataforma/statements/pdf${makeQuery(query)}`),
    plans: () => request<Array<{ id: string; name: string; isActive?: boolean; commitmentMonths?: number }>>('/platform/plans'),
    releaseAccess: (companyId: string, input: { method: 'TRUST' | 'RECEIVED'; reason: string }) => request<{ released: boolean; method: string; invoicesSettled: number }>(`/faturas/plataforma/companies/${companyId}/liberar-acesso`, { method: 'POST', body: input }),
    activateSubscription: (companyId: string, input: { planId: string; seatQuantity: number; chargeNow: boolean; reason: string }) => request<{ activated: boolean; total: number; invoiceId: string | null }>(`/faturas/plataforma/companies/${companyId}/activate-subscription`, { method: 'POST', body: input }),
    applyCoupon: (companyId: string, input: { code: string; reason: string }) => request<Record<string, unknown>>(`/faturas/plataforma/companies/${companyId}/coupon`, { method: 'POST', body: input }),
    cancelSubscription: (companyId: string, input: { mode: 'NOW' | 'END_OF_CYCLE'; reason: string }) => request<{ canceled: boolean; cancelAt?: string }>(`/faturas/plataforma/companies/${companyId}/cancel-subscription`, { method: 'POST', body: input }),
    minhasPermissoes: () => request<{ permissions: string[] }>('/faturas/permissoes/minhas', { silent: true, keepSessionOn401: true }),
    rolePermissions: () => request<FaturasRolePermissions>('/faturas/permissoes'),
    setRolePermissions: (role: string, permissions: string[]) => request<{ role: string; permissions: string[] }>(`/faturas/permissoes/${role}`, { method: 'PUT', body: { permissions } }),
    resetRolePermissions: (role: string) => request<{ role: string; permissions: string[] }>(`/faturas/permissoes/${role}`, { method: 'DELETE' }),
    empresaSeatsQuote: (seatQuantity: number) => request<SeatsQuote>(`/faturas/empresa/seats/quote?seatQuantity=${seatQuantity}`),
    empresaChangeSeats: (seatQuantity: number) => request<{ prorationAmount: number; scheduled?: boolean; prorationInvoice?: { invoiceUrl?: string | null } | null }>('/faturas/empresa/seats', { method: 'POST', body: { seatQuantity } }),
    empresaPlanQuote: (planId: string) => request<PlanQuote>(`/faturas/empresa/plan/quote?planId=${planId}`),
    empresaChangePlan: (planId: string) => request<{ scheduled: boolean; prorationAmount: number }>('/faturas/empresa/plan', { method: 'POST', body: { planId } }),
    resumeBilling: (companyId: string) => request<unknown>(`/faturas/plataforma/companies/${companyId}/billing/resume`, { method: 'POST' }),
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

  support: {
    stats: () => request<{ open: number; resolved: number; closed: number }>('/support/stats'),
    list: (status?: string) => request<any[]>(`/support/tickets${status ? `?status=${status}` : ''}`),
    get: (id: string) => request<any>(`/support/tickets/${id}`),
    create: (data: any) => request<any>('/support/tickets', { method: 'POST', body: data }),
    reply: (id: string, data: any) => request<any>(`/support/tickets/${id}/messages`, { method: 'POST', body: data }),
    close: (id: string) => request<any>(`/support/tickets/${id}/close`, { method: 'POST' }),
    reopen: (id: string) => request<any>(`/support/tickets/${id}/reopen`, { method: 'POST' }),
    uploadAttachment: (id: string, file: File) => {
      const body = new FormData();
      body.append('file', file);
      return request<any>(`/support/tickets/${id}/attachments`, { method: 'POST', body, timeoutMs: 120000 });
    },
    downloadAttachment: (ticketId: string, attachmentId: string) =>
      downloadRequest(`/support/tickets/${ticketId}/attachments/${attachmentId}/download`),
  },

  platformSupport: {
    stats: () => request<any>('/platform/support/stats'),
    list: (params?: any) => request<any[]>(`/platform/support/tickets${makeQuery(params || {})}`),
    get: (id: string) => request<any>(`/platform/support/tickets/${id}`),
    reply: (id: string, data: any) => request<any>(`/platform/support/tickets/${id}/messages`, { method: 'POST', body: data }),
    internalNote: (id: string, data: any) => request<any>(`/platform/support/tickets/${id}/internal-notes`, { method: 'POST', body: data }),
    updateStatus: (id: string, status: string) => request<any>(`/platform/support/tickets/${id}/status`, { method: 'PATCH', body: { status } }),
    updatePriority: (id: string, priority: string) => request<any>(`/platform/support/tickets/${id}/priority`, { method: 'PATCH', body: { priority } }),
    assign: (id: string, userId?: string) => request<any>(`/platform/support/tickets/${id}/assign`, { method: 'PATCH', body: { userId } }),
    resolve: (id: string) => request<any>(`/platform/support/tickets/${id}/resolve`, { method: 'POST' }),
  },

  publicSupport: {
    createTicket: (data: any) => request<{ success: boolean; message: string; ticketNumber: string }>('/support/public/tickets', { method: 'POST', body: data }),
    passwordReset: (data: any) => request<{ success: boolean; message: string; ticketNumber: string }>('/support/public/password-reset', { method: 'POST', body: data }),
  },

  ai: {
    usage: () => request<any>('/ai/usage'),
    platform: {
      companySummary: (id: string) => request<any>(`/ai/platform/company/${id}/summary`, { method: 'POST' }),
      companyRisk: (id: string) => request<any>(`/ai/platform/company/${id}/risk`, { method: 'POST' }),
      assistant: (question: string) => request<any>('/ai/platform/assistant', { method: 'POST', body: { question } }),
    },
    support: {
      classify: (title: string, description?: string) => request<any>('/ai/support/classify', { method: 'POST', body: { title, description } }),
      summarizeTicket: (id: string) => request<any>(`/ai/support/ticket/${id}/summarize`, { method: 'POST' }),
      suggestReply: (id: string) => request<any>(`/ai/support/ticket/${id}/suggest-reply`, { method: 'POST' }),
    },
  },
};

export default api;

