import { request } from '@/app/lib/api';

const enc = encodeURIComponent;

export type Recommendation = 'STRONG_YES' | 'YES' | 'NO' | 'STRONG_NO';
export const RECOMMENDATION_LABEL: Record<Recommendation, string> = { STRONG_YES: 'Contrataria com certeza', YES: 'Contrataria', NO: 'Não contrataria', STRONG_NO: 'Não contrataria de jeito nenhum' };

export interface SlotOffer { id: string; slots: string[]; mode: 'PRESENCIAL' | 'ONLINE'; status: string; expiresAt: string; bookedAt?: string | null; interviewId?: string | null; createdAt: string }
export interface InterviewFeedbackItem { id: string; interviewId: string; userId: string; authorName?: string | null; ratings: { criterionId: string; name: string; score: number }[]; recommendation: Recommendation; notes?: string | null; average: number | null; createdAt: string }
export interface Offer {
  id: string; status: string; positionTitle: string; contractType: string; salary: number | null; startDate?: string | null; workSchedule?: string | null; workMode?: string | null;
  benefits: string[]; message?: string | null; expiresAt?: string | null; createdByName?: string | null; approvedByName?: string | null; approvedAt?: string | null; rejectionNote?: string | null;
  sentAt?: string | null; viewedAt?: string | null; respondedAt?: string | null; declineReason?: string | null; createdAt: string; canApprove: boolean;
}
export interface OfferPayload { positionTitle?: string; contractType: string; salary?: number | null; startDate?: string | null; workSchedule?: string | null; workMode?: string | null; benefits?: string[]; message?: string | null; validDays?: number }
export interface TechnicalQuestion { id?: string; text: string; options: string[]; correct: number; weight: number }
export interface JobAssessment { id?: string; title?: string; instructions?: string | null; timeLimitMinutes?: number | null; passingScore?: number; autoReject?: boolean; questions: TechnicalQuestion[] }
export interface AssessmentResult {
  id: string; kind: 'TECHNICAL' | 'BEHAVIORAL'; status: string; title: string; expiresAt: string; startedAt?: string | null; completedAt?: string | null; score?: number | null; passed?: boolean | null; passingScore?: number | null; createdAt: string;
  result?: { percent?: Record<string, number>; dominant?: string; dominantLabel?: string; secondaryLabel?: string | null; correct?: number; total?: number; late?: boolean } | null;
  profiles?: Record<string, { label: string; summary: string; strengths: string; attention: string }>;
}

export const processApi = {
  slotOffers: (id: string) => request<SlotOffer[]>(`/jobs/applications/${enc(id)}/slot-offers`),
  createSlotOffer: (id: string, body: { slots: string[]; mode: 'PRESENCIAL' | 'ONLINE'; location?: string; meetingUrl?: string; durationMinutes?: number; interviewerRole?: 'RH' | 'GESTOR'; interviewer?: string; candidateMessage?: string; validDays?: number }) =>
    request<{ id: string; emailed: boolean }>(`/jobs/applications/${enc(id)}/slot-offers`, { method: 'POST', body }),
  cancelSlotOffer: (id: string, offerId: string) => request<unknown>(`/jobs/applications/${enc(id)}/slot-offers/${enc(offerId)}/cancel`, { method: 'POST' }),
  feedback: (id: string) => request<{ items: InterviewFeedbackItem[]; hidden: number }>(`/jobs/applications/${enc(id)}/interview-feedback`),
  saveFeedback: (id: string, interviewId: string, body: { ratings: { criterionId: string; score: number }[]; recommendation: Recommendation; notes?: string }) =>
    request<unknown>(`/jobs/applications/${enc(id)}/interviews/${enc(interviewId)}/feedback`, { method: 'PUT', body }),
  offers: (id: string) => request<Offer[]>(`/jobs/applications/${enc(id)}/offers`),
  createOffer: (id: string, body: OfferPayload) => request<{ id: string; status: string }>(`/jobs/applications/${enc(id)}/offers`, { method: 'POST', body }),
  approveOffer: (offerId: string) => request<unknown>(`/jobs/offers/${enc(offerId)}/approve`, { method: 'POST' }),
  returnOffer: (offerId: string, note: string) => request<unknown>(`/jobs/offers/${enc(offerId)}/return`, { method: 'POST', body: { note } }),
  sendOffer: (offerId: string) => request<unknown>(`/jobs/offers/${enc(offerId)}/send`, { method: 'POST' }),
  cancelOffer: (offerId: string) => request<unknown>(`/jobs/offers/${enc(offerId)}/cancel`, { method: 'POST' }),
  jobAssessment: (jobId: string) => request<JobAssessment>(`/jobs/${enc(jobId)}/assessment`),
  saveJobAssessment: (jobId: string, body: JobAssessment) => request<JobAssessment>(`/jobs/${enc(jobId)}/assessment`, { method: 'PUT', body: { title: body.title, instructions: body.instructions ?? undefined, timeLimitMinutes: body.timeLimitMinutes ?? null, passingScore: body.passingScore, autoReject: body.autoReject, questions: body.questions } }),
  assessments: (id: string) => request<AssessmentResult[]>(`/jobs/applications/${enc(id)}/assessments`),
  sendAssessment: (id: string, kind: 'TECHNICAL' | 'BEHAVIORAL') => request<{ id: string; emailed: boolean }>(`/jobs/applications/${enc(id)}/assessments`, { method: 'POST', body: { kind } }),
  cancelAssessment: (id: string, inviteId: string) => request<unknown>(`/jobs/applications/${enc(id)}/assessments/${enc(inviteId)}/cancel`, { method: 'POST' }),
};

/** Sala gratuita do Jitsi Meet (sem conta e sem custo): nome aleatorio dificil de adivinhar. */
export function freeMeetingLink(): string {
  const bytes = new Uint8Array(9);
  globalThis.crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 14);
  return `https://meet.jit.si/InnovationRH-${code}`;
}
