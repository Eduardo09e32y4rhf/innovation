import { BadRequestException } from '@nestjs/common';
import { InvalidMeetingLinkError, meetingProvider, normalizeMeetingUrl } from '../../common/utils/meeting-link';

export type InterviewMode = 'PRESENCIAL' | 'ONLINE';
export type InterviewerRole = 'RH' | 'GESTOR';

export const INTERVIEW_TIMEZONE = 'America/Sao_Paulo';
export const DEFAULT_INTERVIEW_MINUTES = 60;

export interface InterviewInput {
  scheduledAt: string;
  kind?: string;
  mode?: string;
  location?: string;
  meetingUrl?: string;
  durationMinutes?: number;
  interviewerRole?: string;
  interviewer?: string;
  notes?: string;
  candidateMessage?: string;
  notifyCandidate?: boolean;
}

export interface NormalizedInterview {
  scheduledAt: Date;
  kind: string;
  mode: InterviewMode | null;
  location: string | null;
  meetingUrl: string | null;
  durationMinutes: number;
  interviewerRole: InterviewerRole | null;
  interviewer: string | null;
  notes: string | null;
  candidateMessage: string | null;
  notifyCandidate: boolean;
}

const clean = (value: unknown, max: number) => {
  const text = String(value ?? '').trim().slice(0, max);
  return text || null;
};

/**
 * Regras do agendamento: presencial exige local; online exige link https. Avisar o candidato so faz sentido para
 * entrevista futura (5 min de folga para o relogio). Entrevistas antigas (sem modo) continuam aceitas para registro.
 */
export function normalizeInterview(input: InterviewInput, now: Date = new Date()): NormalizedInterview {
  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Data e hora da entrevista inválidas.');
  const mode = input.mode ? String(input.mode).toUpperCase() : null;
  if (mode && mode !== 'PRESENCIAL' && mode !== 'ONLINE') throw new BadRequestException('Escolha entrevista presencial ou online.');
  const location = clean(input.location, 300);
  let meetingUrl: string | null = null;
  try { meetingUrl = normalizeMeetingUrl(input.meetingUrl); } catch (error) {
    if (error instanceof InvalidMeetingLinkError) throw new BadRequestException(error.message);
    throw error;
  }
  if (mode === 'PRESENCIAL' && !location) throw new BadRequestException('Informe o endereço da entrevista presencial.');
  if (mode === 'ONLINE' && !meetingUrl) throw new BadRequestException('Cole o link da reunião (Teams, Meet, Zoom...).');
  const role = input.interviewerRole ? String(input.interviewerRole).toUpperCase() : null;
  if (role && role !== 'RH' && role !== 'GESTOR') throw new BadRequestException('Entrevista com RH ou com o gestor.');
  const duration = input.durationMinutes === undefined || input.durationMinutes === null ? DEFAULT_INTERVIEW_MINUTES : Math.round(Number(input.durationMinutes));
  if (!Number.isFinite(duration) || duration < 10 || duration > 480) throw new BadRequestException('Duração entre 10 minutos e 8 horas.');
  const notifyCandidate = Boolean(mode) && input.notifyCandidate !== false;
  if (notifyCandidate && scheduledAt.getTime() < now.getTime() - 5 * 60_000) throw new BadRequestException('Essa data já passou. Escolha um horário futuro para enviar o convite.');
  return {
    scheduledAt,
    kind: clean(input.kind, 60) ?? (role === 'GESTOR' ? 'Entrevista com o gestor' : 'Entrevista com o RH'),
    mode: mode as InterviewMode | null,
    location: mode === 'ONLINE' ? null : location,
    meetingUrl: mode === 'PRESENCIAL' ? null : meetingUrl,
    durationMinutes: duration,
    interviewerRole: role as InterviewerRole | null,
    interviewer: clean(input.interviewer, 120),
    notes: clean(input.notes, 1000),
    candidateMessage: clean(input.candidateMessage, 1000),
    notifyCandidate,
  };
}

/** "quinta-feira, 16 de outubro de 2026 às 14:30" no horario de Brasilia (o servidor roda em UTC). */
export function formatInterviewDate(date: Date, timeZone = INTERVIEW_TIMEZONE): { long: string; short: string } {
  const day = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(date);
  const short = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit' }).format(date);
  return { long: `${day} às ${time}`, short: `${short} às ${time}` };
}

const icsStamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** Botao "Adicionar ao Google Agenda" (funciona sem login no Innovation e sem anexo). */
export function googleCalendarUrl(input: { title: string; start: Date; minutes: number; details: string; location?: string | null }): string {
  const end = new Date(input.start.getTime() + input.minutes * 60_000);
  const params = new URLSearchParams({ action: 'TEMPLATE', text: input.title, dates: `${icsStamp(input.start)}/${icsStamp(end)}`, details: input.details, ctz: INTERVIEW_TIMEZONE });
  if (input.location) params.set('location', input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function interviewerLabel(role: string | null | undefined, name: string | null | undefined): string {
  const who = role === 'GESTOR' ? 'o gestor da área' : role === 'RH' ? 'a equipe de RH' : '';
  if (name && who) return `${name} (${who})`;
  return name || who || 'a equipe da empresa';
}

export { meetingProvider };

const icsText = (value: string) => String(value ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Linhas do .ics tem no maximo 75 bytes; o resto continua na linha seguinte comecando com espaco. */
function foldIcs(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  for (const char of line) {
    if (Buffer.byteLength(current + char, 'utf8') > (parts.length ? 74 : 75)) { parts.push(current); current = ''; }
    current += char;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/**
 * Convite de agenda (.ics) anexado ao e-mail: Gmail, Outlook e iPhone mostram "Adicionar a agenda" e tratam o
 * cancelamento (mesmo UID com METHOD:CANCEL). Sem integracao paga nem login no Google/Microsoft.
 */
export function buildInterviewIcs(input: {
  uid: string; start: Date; minutes: number; title: string; description: string; location?: string | null; url?: string | null;
  organizerEmail?: string | null; attendeeEmail?: string | null; cancel?: boolean; sequence?: number;
}): string {
  const end = new Date(input.start.getTime() + input.minutes * 60_000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Innovation RH//Entrevistas//PT-BR',
    'CALSCALE:GREGORIAN',
    `METHOD:${input.cancel ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT',
    `UID:${input.uid}@innovationia.com.br`,
    `SEQUENCE:${input.sequence ?? (input.cancel ? 1 : 0)}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(input.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(input.title)}`,
    `DESCRIPTION:${icsText(input.description)}`,
    ...(input.location ? [`LOCATION:${icsText(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    ...(input.organizerEmail ? [`ORGANIZER;CN=Innovation RH:mailto:${input.organizerEmail}`] : []),
    ...(input.attendeeEmail ? [`ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${input.attendeeEmail}`] : []),
    `STATUS:${input.cancel ? 'CANCELLED' : 'CONFIRMED'}`,
    ...(input.cancel ? [] : ['BEGIN:VALARM', 'TRIGGER:-PT60M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(input.title)}`, 'END:VALARM']),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcs).join('\r\n') + '\r\n';
}

/** Endereco puro do remetente (MAIL_FROM pode vir como "Nome <email>"). */
export function mailFromAddress(): string | null {
  const raw = process.env.MAIL_FROM ?? '';
  const match = raw.match(/<([^>]+)>/);
  const address = (match ? match[1] : raw).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? address : null;
}
