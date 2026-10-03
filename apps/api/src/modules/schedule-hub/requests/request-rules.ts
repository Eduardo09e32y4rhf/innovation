import { BadRequestException } from '@nestjs/common';
import type { ResolvedDay } from '../calendar/day-resolver';

export type RequestType = 'TROCA_FOLGA' | 'TROCA_TURNO' | 'NOVA_ESCALA' | 'AJUSTE_BATIDA' | 'JUSTIFICATIVA' | 'FOLGA_COMPENSACAO';

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  TROCA_FOLGA: 'Troca de folga',
  TROCA_TURNO: 'Troca de turno',
  NOVA_ESCALA: 'Nova escala',
  AJUSTE_BATIDA: 'Ajuste de batida',
  JUSTIFICATIVA: 'Justificativa',
  FOLGA_COMPENSACAO: 'Folga por compensação',
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const isDate = (value: unknown): value is string => typeof value === 'string' && DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isTime = (value: unknown): value is string => typeof value === 'string' && TIME.test(value);

export interface NormalizedPayload {
  dates: string[];
  data: Record<string, unknown>;
}

/** Valida e normaliza o payload de cada tipo; lança 400 com mensagem clara. */
export function normalizePayload(type: RequestType, raw: unknown): NormalizedPayload {
  const payload = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const fail = (message: string): never => { throw new BadRequestException(message); };

  switch (type) {
    case 'TROCA_FOLGA': {
      if (!isDate(payload.offDate)) fail('Informe o dia em que quer folgar.');
      if (!isDate(payload.workDate)) fail('Informe o dia de folga que voce vai trabalhar no lugar.');
      if (payload.offDate === payload.workDate) fail('Os dois dias precisam ser diferentes.');
      return { dates: [payload.offDate as string, payload.workDate as string], data: { offDate: payload.offDate, workDate: payload.workDate } };
    }
    case 'TROCA_TURNO': {
      if (!isDate(payload.date)) fail('Informe a data do turno.');
      return { dates: [payload.date as string], data: { date: payload.date } };
    }
    case 'NOVA_ESCALA': {
      if (typeof payload.scheduleId !== 'string' || !payload.scheduleId) fail('Escolha a escala desejada.');
      if (!isDate(payload.startDate)) fail('Informe a data de inicio da nova escala.');
      return { dates: [payload.startDate as string], data: { scheduleId: payload.scheduleId, startDate: payload.startDate } };
    }
    case 'AJUSTE_BATIDA': {
      if (!isDate(payload.date)) fail('Informe a data do ajuste.');
      const fields = ['entry', 'lunchStart', 'lunchReturn', 'exit'] as const;
      const data: Record<string, unknown> = { date: payload.date };
      let any = false;
      for (const field of fields) {
        const value = payload[field];
        if (value === undefined || value === null || value === '') continue;
        if (!isTime(value)) fail('Use horarios no formato HH:MM.');
        data[field] = value; any = true;
      }
      if (!any) fail('Informe ao menos um horario para ajustar.');
      return { dates: [payload.date as string], data };
    }
    case 'JUSTIFICATIVA': {
      if (!isDate(payload.date)) fail('Informe a data.');
      if (!['FALTA', 'ATRASO', 'ATESTADO'].includes(String(payload.kind))) fail('Escolha o tipo da justificativa.');
      const minutes = payload.minutes === undefined || payload.minutes === '' ? 0 : Number(payload.minutes);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) fail('Minutos invalidos.');
      return { dates: [payload.date as string], data: { date: payload.date, kind: payload.kind, minutes } };
    }
    case 'FOLGA_COMPENSACAO': {
      if (!isDate(payload.date)) fail('Informe o dia da folga.');
      return { dates: [payload.date as string], data: { date: payload.date } };
    }
    default:
      return fail('Tipo de solicitacao invalido.');
  }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Minutos de descanso entre o fim de um dia de trabalho e o início do próximo (dias consecutivos). */
export function restBetweenMinutes(previous: Pick<ResolvedDay, 'entry' | 'exit'>, next: Pick<ResolvedDay, 'entry'>): number | null {
  if (!previous.exit || !previous.entry || !next.entry) return null;
  const end = toMinutes(previous.exit) <= toMinutes(previous.entry) ? toMinutes(previous.exit) + 1440 : toMinutes(previous.exit);
  return 1440 + toMinutes(next.entry) - end;
}

/** Maior sequência de dias trabalhados consecutivos. */
export function longestWorkStreak(days: Pick<ResolvedDay, 'working'>[]): number {
  let best = 0;
  let current = 0;
  for (const day of days) {
    current = day.working ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}

export interface Finding { level: 'error' | 'warning'; code: string; message: string }

/** Aplica um override hipotético (tipo de dia) sobre uma lista de dias já resolvidos. */
export function withOverride(days: ResolvedDay[], date: string, patch: Partial<ResolvedDay>): ResolvedDay[] {
  return days.map((day) => (day.date === date ? { ...day, ...patch } : day));
}

export function checkClt(days: ResolvedDay[]): Finding[] {
  const findings: Finding[] = [];
  if (longestWorkStreak(days) > 6) {
    findings.push({ level: 'error', code: 'SEXTO_DIA', message: 'A troca deixaria mais de 6 dias seguidos de trabalho sem descanso semanal (DSR).' });
  }
  for (let i = 1; i < days.length; i += 1) {
    const rest = restBetweenMinutes(days[i - 1], days[i]);
    if (days[i - 1].working && days[i].working && rest !== null && rest < 660) {
      findings.push({
        level: 'error',
        code: 'INTERJORNADA',
        message: `Descanso de ${Math.floor(rest / 60)}h${String(rest % 60).padStart(2, '0')} entre ${days[i - 1].date} e ${days[i].date}; a CLT exige no minimo 11h.`,
      });
    }
  }
  return findings;
}
