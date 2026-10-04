'use client';

import { request } from '@/app/lib/api';

export type ComplianceState = 'NO_ASO' | 'EXPIRED' | 'INAPTO' | 'EXPIRING' | 'VALID';
export type AsoRecordState = 'OPEN' | 'VALID' | 'EXPIRING' | 'EXPIRED' | 'INAPTO' | 'CANCELED';

export interface ComplianceRow {
  employee: { id: string; name: string; position: string | null; department: string | null; admissionDate: string | null };
  state: ComplianceState;
  dueDate: string | null;
  daysLeft: number | null;
  openRecordId: string | null;
}

export interface SstOverview {
  windowDays: number;
  aso: { total: number; valid: number; expiring: number; expired: number; noAso: number; inapto: number; open: number; regularPercent: number };
  agendaNext7Days: number;
  queue: ComplianceRow[];
}

export interface AsoHistoryRecord {
  id: string;
  asoType: string;
  status: string;
  result: 'APTO' | 'INAPTO' | null;
  examDate: string | null;
  dueDate: string | null;
  clinicName: string | null;
  doctorName: string | null;
  documentNumber: string | null;
  observation: string | null;
  restrictions: string | null;
  examsPerformed: string[] | null;
  periodicityMonths: number | null;
  state: AsoRecordState;
}

export interface CompleteAsoInput {
  examDate: string;
  result: 'APTO' | 'INAPTO';
  periodicityMonths?: number;
  clinicName?: string;
  doctorName?: string;
  documentNumber?: string;
  observation?: string;
  restrictions?: string;
  examsPerformed?: string[];
}

export const sstApi = {
  overview: () => request<SstOverview>('/management/sst/overview'),
  compliance: (query: { state?: string; search?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') qs.set(key, String(value)); });
    return request<{ total: number; page: number; pageSize: number; items: ComplianceRow[] }>(`/management/sst/aso/compliance?${qs.toString()}`);
  },
  history: (employeeId: string) => request<{ employee: { id: string; name: string; position: string | null }; records: AsoHistoryRecord[] }>(`/management/sst/aso/employee/${employeeId}`),
  complete: (id: string, body: CompleteAsoInput) => request<unknown>(`/management/sst/aso/${id}/complete`, { method: 'POST', body }),
};

export const COMPLIANCE_LABEL: Record<ComplianceState, { label: string; tone: 'danger' | 'warn' | 'ok' }> = {
  NO_ASO: { label: 'Sem ASO', tone: 'danger' },
  EXPIRED: { label: 'Vencido', tone: 'danger' },
  INAPTO: { label: 'Inapto', tone: 'danger' },
  EXPIRING: { label: 'A vencer', tone: 'warn' },
  VALID: { label: 'Em dia', tone: 'ok' },
};

export const ASO_TYPE_LABEL: Record<string, string> = {
  ADMISSIONAL: 'Admissional',
  PERIODICO: 'Periódico',
  RETORNO_AO_TRABALHO: 'Retorno ao trabalho',
  MUDANCA_DE_FUNCAO: 'Mudança de função',
  DEMISSIONAL: 'Demissional',
  COMPLEMENTAR: 'Complementar',
};

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function describeDays(daysLeft: number | null) {
  if (daysLeft === null) return '';
  if (daysLeft === 0) return 'vence hoje';
  return daysLeft > 0 ? `em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}` : `há ${-daysLeft} ${daysLeft === -1 ? 'dia' : 'dias'}`;
}
