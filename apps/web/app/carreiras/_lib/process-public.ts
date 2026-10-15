import { fetchPublic } from './public-jobs';

const enc = encodeURIComponent;
const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export interface PublicInterview {
  candidate: string; company: string; logoUrl?: string | null; job: string; scheduledAt: string; when: string; durationMinutes: number;
  mode: 'PRESENCIAL' | 'ONLINE' | null; location?: string | null; meetingUrl?: string | null; meetingProvider?: string | null; interviewer: string; message?: string | null;
  response: 'CONFIRMED' | 'DECLINED' | null; respondedAt?: string | null; canRespond: boolean;
}
export interface PublicSlots {
  candidate: string; company: string; job: string; mode: 'PRESENCIAL' | 'ONLINE'; durationMinutes: number; location?: string | null; interviewer: string; message?: string | null;
  status: string; expiresAt: string; slots: { value: string; label: string }[]; booked: { when: string; responseToken?: string | null } | null;
}
export interface PublicOffer {
  candidate: string; company: string; positionTitle: string; contractType: string; salary: number | null; startDate?: string | null; workSchedule?: string | null; workMode?: string | null;
  benefits: string[]; message?: string | null; expiresAt?: string | null; status: string; respondedAt?: string | null;
}
export interface PublicAssessment {
  candidate: string; company: string; job: string; kind: 'TECHNICAL' | 'BEHAVIORAL'; status: string; title: string; instructions?: string | null; timeLimitMinutes?: number | null;
  questionCount: number; expiresAt: string; deadline?: string | null;
  questions: ({ id: string; text: string; options: string[] } | { id: string; question: string; options: { value: number; text: string }[] })[] | null;
}

export const processPublic = {
  interview: (token: string) => fetchPublic(`/public/recruitment/interview/${enc(token)}`) as Promise<PublicInterview>,
  respondInterview: (token: string, response: 'CONFIRMED' | 'DECLINED', reason?: string) => fetchPublic(`/public/recruitment/interview/${enc(token)}`, json({ response, reason })) as Promise<PublicInterview>,
  slots: (token: string) => fetchPublic(`/public/recruitment/slots/${enc(token)}`) as Promise<PublicSlots>,
  book: (token: string, slot: string) => fetchPublic(`/public/recruitment/slots/${enc(token)}`, json({ slot })) as Promise<PublicSlots>,
  offer: (token: string) => fetchPublic(`/public/recruitment/offer/${enc(token)}`) as Promise<PublicOffer>,
  respondOffer: (token: string, accept: boolean, reason?: string) => fetchPublic(`/public/recruitment/offer/${enc(token)}`, json({ accept, reason })) as Promise<PublicOffer>,
  assessment: (token: string) => fetchPublic(`/public/recruitment/assessment/${enc(token)}`) as Promise<PublicAssessment>,
  startAssessment: (token: string) => fetchPublic(`/public/recruitment/assessment/${enc(token)}/start`, { method: 'POST' }) as Promise<PublicAssessment>,
  submitAssessment: (token: string, answers: Record<string, number>) => fetchPublic(`/public/recruitment/assessment/${enc(token)}/submit`, json({ answers })) as Promise<{ done: boolean }>,
};

/** "sexta-feira, 17 de outubro" -> "Sexta-feira, 17 de outubro" (so a primeira letra). */
export const sentence = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

export const errorMessage = (cause: unknown, fallback: string) => (cause instanceof Error && cause.message ? cause.message : fallback);
