import type { PlatformCompany, PublicPlatformPlan } from '@/app/lib/api';

export type ContractStatus = 'ACTIVE' | 'ENDED' | 'CANCELED';

export type ManualContract = {
  id: string; companyId: string; planId?: string | null;
  company?: { id: string; name: string; document?: string | null };
  plan?: { id: string; name: string } | null;
  agreedAmount: number | string; seatQuantity: number; startsAt: string; endsAt?: string | null;
  paymentMethod: string; externalContractNumber?: string | null; notes?: string | null; documentUrl?: string | null;
  status: ContractStatus; createdAt?: string; updatedAt?: string;
};

export type ContractForm = {
  companyId: string; planId: string; seatQuantity: string; agreedAmount: string; startsAt: string; endsAt: string;
  paymentMethod: string; externalContractNumber: string; notes: string; documentUrl: string; status: ContractStatus;
};

export type ContractLookups = { companies: PlatformCompany[]; plans: PublicPlatformPlan[] };

export const EMPTY_FORM: ContractForm = {
  companyId: '', planId: '', seatQuantity: '1', agreedAmount: '', startsAt: '', endsAt: '',
  paymentMethod: 'EXTERNAL', externalContractNumber: '', notes: '', documentUrl: '', status: 'ACTIVE',
};

export const STATUS_LABELS: Record<ContractStatus, string> = { ACTIVE: 'Ativo', ENDED: 'Encerrado', CANCELED: 'Cancelado' };
export const STATUS_TONES: Record<ContractStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ENDED: 'border-slate-200 bg-slate-100 text-slate-600',
  CANCELED: 'border-rose-200 bg-rose-50 text-rose-700',
};
export const PAYMENT_LABELS: Record<string, string> = { ASAAS: 'Asaas', BANK_TRANSFER: 'Transferência', EXTERNAL: 'Externo' };

export function parseMoney(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value).trim();
  const amount = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

export const money = (value: number | string | null | undefined) => parseMoney(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');
export const isoDay = (value?: string | null) => (value ? String(value).slice(0, 10) : '');

export function formFromContract(item: ManualContract): ContractForm {
  return {
    companyId: item.companyId, planId: item.planId || '', seatQuantity: String(item.seatQuantity || 1), agreedAmount: String(parseMoney(item.agreedAmount)),
    startsAt: isoDay(item.startsAt), endsAt: isoDay(item.endsAt), paymentMethod: item.paymentMethod || 'EXTERNAL',
    externalContractNumber: item.externalContractNumber || '', notes: item.notes || '', documentUrl: item.documentUrl || '', status: item.status || 'ACTIVE',
  };
}

export function payloadFromForm(form: ContractForm) {
  const at = (day: string) => (day ? new Date(`${day}T12:00:00`).toISOString() : undefined);
  return {
    companyId: form.companyId, planId: form.planId || undefined, seatQuantity: Number(form.seatQuantity) || 1, agreedAmount: parseMoney(form.agreedAmount),
    startsAt: at(form.startsAt), endsAt: at(form.endsAt), paymentMethod: form.paymentMethod,
    externalContractNumber: form.externalContractNumber || undefined, notes: form.notes, documentUrl: form.documentUrl || undefined, status: form.status,
  };
}
