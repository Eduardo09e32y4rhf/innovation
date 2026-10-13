import { fetchPublic } from './public-jobs';

/** Cliente da Área do candidato (/candidate-portal). A sessão é separada do login de empresa. */
const TOKEN_KEY = 'ir_candidate_token';

export function getCandidateToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setCandidateToken(token: string | null) {
  try { if (token) window.localStorage.setItem(TOKEN_KEY, token); else window.localStorage.removeItem(TOKEN_KEY); } catch { /* navegação privada: sessão só nesta aba */ }
}

export type EducationItem = { level: string; status: string; course: string; school: string };
export const EDUCATION_LEVELS = ['Ensino fundamental', 'Ensino médio', 'Técnico', 'Superior', 'Pós-graduação'] as const;
export const EDUCATION_STATUS = ['Completo', 'Cursando', 'Incompleto'] as const;

export type ExperienceItem = { role: string; company: string; start: string | null; end: string | null; current: boolean; description: string };

export type CandidateProfile = {
  email: string; name: string | null; cpf: string | null; phone: string | null;
  cep: string | null; street: string | null; streetNumber: string | null; addressComplement: string | null; neighborhood: string | null; city: string | null; state: string | null;
  birthDate: string | null; profession: string | null; skills: string[]; hasDriverLicense: boolean | null; driverLicenseCategory: string | null; talentPoolConsent: boolean;
  education: EducationItem[];
  about: string | null; experience: ExperienceItem[];
  resume: { name: string | null; type: string | null; size: number | null } | null;
  consent: boolean; admissionShareConsent: boolean;
  completeness: { percent: number; missing: string[]; complete: boolean };
  checklist: { key: string; label: string; done: boolean }[];
};

export const LICENSE_CATEGORIES = ['A', 'B', 'AB', 'C', 'D', 'E', 'AC', 'AD', 'AE'] as const;

export type CandidateInvite = { id: string; status: 'SENT' | 'APPLIED' | 'DECLINED'; message: string | null; createdAt: string; jobId: string; companyId: string; job: string; company: string; open: boolean };

export type CandidateApplication = {
  id: string; jobId: string; job: string; company: string; appliedAt: string; status: string; statusLabel: string; stage: string | null; closed: boolean;
  timeline: { at: string; label: string }[];
  funnel: { status: string; stage: string; count: number | null; label: string }[] | null;
};

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getCandidateToken();
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  return fetchPublic(`/candidate-portal${path}`, {
    ...init,
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  }) as Promise<T>;
}

export const candidateApi = {
  register: (email: string, password: string, name?: string) => authed<{ token: string; expiresAt: string }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name: name || undefined }) }),
  login: (email: string, password: string) => authed<{ token: string; expiresAt: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) => authed<{ sent: boolean }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, password: string) => authed<{ token: string; expiresAt: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) }),
  logout: () => authed<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => authed<CandidateProfile>('/me'),
  update: (data: Partial<Omit<CandidateProfile, 'email' | 'resume' | 'completeness' | 'checklist'>>) => authed<CandidateProfile>('/me', { method: 'PUT', body: JSON.stringify(data) }),
  uploadResume: (file: File) => { const body = new FormData(); body.append('resume', file, file.name); return authed<CandidateProfile>('/me/resume', { method: 'PUT', body }); },
  remove: () => authed<{ deleted: boolean }>('/me', { method: 'DELETE' }),
  invites: () => authed<CandidateInvite[]>('/invites'),
  declineInvite: (id: string) => authed<{ ok: boolean }>(`/invites/${encodeURIComponent(id)}/decline`, { method: 'POST' }),
  applications: () => authed<{ applications: CandidateApplication[]; appliedJobIds: string[] }>('/applications'),
  applyWithProfile: (jobId: string, input: { answers: Record<string, string | string[]>; coverLetter?: string; consent: boolean }) =>
    authed<{ received: boolean; applicationId?: string }>(`/jobs/${encodeURIComponent(jobId)}/apply`, { method: 'POST', body: JSON.stringify(input) }),
};

/** Sessão inválida/expirada: limpa o token e manda para o login. */
export function isUnauthorized(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { status?: number }).status === 401;
}
