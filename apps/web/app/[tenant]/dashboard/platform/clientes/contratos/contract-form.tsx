'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import type { ContractForm, ContractLookups, ContractStatus } from './contract-model';

const control = 'mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 text-base text-fg outline-none focus:border-violet-500 sm:text-sm';

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <label className={`text-xs font-bold text-fg-sub ${wide ? 'xl:col-span-2' : ''}`}>{label}{children}</label>;
}

interface ContractFormProps {
  form: ContractForm; onChange: (form: ContractForm) => void; lookups: ContractLookups;
  editing: boolean; saving: boolean; error: string; onSubmit: (event: FormEvent) => void; onReset: () => void;
}

/** Formulário de criar/editar contrato manual. */
export function ContractFormPanel({ form, onChange, lookups, editing, saving, error, onSubmit, onReset }: ContractFormProps) {
  const set = <K extends keyof ContractForm>(key: K, value: ContractForm[K]) => onChange({ ...form, [key]: value });
  return (
    <form onSubmit={onSubmit} className="card-v2 space-y-4 p-4 sm:p-5" aria-label={editing ? 'Editar contrato' : 'Novo contrato'}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Empresa"><select required value={form.companyId} onChange={(e) => set('companyId', e.target.value)} className={control}>
          <option value="">Selecione a empresa</option>{lookups.companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Plano"><select value={form.planId} onChange={(e) => set('planId', e.target.value)} className={control}>
          <option value="">Sem plano vinculado</option>{lookups.plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Licenças"><input required type="number" min={1} value={form.seatQuantity} onChange={(e) => set('seatQuantity', e.target.value)} className={control} /></Field>
        <Field label="Valor acordado"><input required type="number" min="0.01" step="0.01" value={form.agreedAmount} onChange={(e) => set('agreedAmount', e.target.value)} className={control} placeholder="R$ 0,00" /></Field>
        <Field label="Início"><input required type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={control} /></Field>
        <Field label="Fim (opcional)"><input type="date" value={form.endsAt} onChange={(e) => set('endsAt', e.target.value)} className={control} /></Field>
        <Field label="Pagamento"><select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)} className={control}>
          <option value="ASAAS">Asaas</option><option value="BANK_TRANSFER">Transferência</option><option value="EXTERNAL">Externo</option></select></Field>
        <Field label="Situação"><select value={form.status} onChange={(e) => set('status', e.target.value as ContractStatus)} className={control}>
          <option value="ACTIVE">Ativo</option><option value="ENDED">Encerrado</option><option value="CANCELED">Cancelado</option></select></Field>
        <Field label="Número externo" wide><input value={form.externalContractNumber} onChange={(e) => set('externalContractNumber', e.target.value)} className={control} placeholder="Contrato Asaas ou documento interno" /></Field>
        <Field label="Endereço do PDF" wide><input value={form.documentUrl} onChange={(e) => set('documentUrl', e.target.value)} className={control} placeholder="https://..." /></Field>
      </div>
      <label className="block text-xs font-bold text-fg-sub">Observações
        <textarea required value={form.notes} onChange={(e) => set('notes', e.target.value)} className={`${control} min-h-[110px] py-2`} placeholder="Motivo e observações" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={saving} className="btn btn-primary inline-flex min-h-11 items-center gap-2 text-sm disabled:opacity-60">
          {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar contrato'}
        </button>
        {editing && <button type="button" onClick={onReset} className="min-h-11 text-sm font-semibold text-fg-sub hover:text-fg">Cancelar edição</button>}
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
    </form>
  );
}
