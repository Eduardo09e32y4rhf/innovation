'use client';

import { useState } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CompanyStatus, type PlatformCompany } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

const MODULES = [
  { id: 'employees', label: 'Funcionarios' },
  { id: 'time-track', label: 'Controle de Ponto' },
  { id: 'vacations', label: 'Ferias' },
  { id: 'management', label: 'Gestao' },
  { id: 'support', label: 'Suporte' },
];

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </label>
  );
}

export function CompanyEditModal({ company, onClose, onDone }: { company: PlatformCompany; onClose: () => void; onDone: () => void }) {
  const plansData = useQuery(() => api.platform.listPlans(), []);

  const [form, setForm] = useState({
    name: company.name || '',
    document: company.document || '',
    maxUsers: String(company.maxUsers ?? 6),
    maxEmployees: String(company.maxEmployees ?? 50),
    platformPlanId: company.platformPlanId || '',
    status: company.status || 'ACTIVE',
    billingStatus: company.billingStatus || 'TRIAL',
    suspensionReason: company.suspensionReason || '',
    trialEndsAt: company.trialEndsAt ? String(company.trialEndsAt).slice(0, 10) : '',
    internalNotes: company.internalNotes || '',
    activeModules: Array.isArray(company.activeModules) && company.activeModules.length > 0 ? company.activeModules : MODULES.map((item) => item.id),
  });

  const save = useMutation(
    () => api.platform.updateCompany(company.id, {
      name: normalizeDisplayName(form.name),
      document: form.document.replace(/\D/g, ''),
      maxUsers: Number(form.maxUsers) || 1,
      maxEmployees: Number(form.maxEmployees) || 1,
      platformPlanId: form.platformPlanId || null,
      status: form.status as 'ACTIVE' | 'SUSPENDED' | 'CANCELLED',
      billingStatus: form.billingStatus as 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED',
      suspensionReason: form.suspensionReason || null,
      trialEndsAt: form.trialEndsAt || null,
      activeModules: form.activeModules,
      internalNotes: form.internalNotes || null,
    }),
    {
      onSuccess: () => {
        toast.success('Empresa atualizada.');
        onDone();
      },
    },
  );

  const planOptions = plansData.data ?? [];
  const isDirty = true;

  function toggleModule(id: string) {
    setForm((current) => ({
      ...current,
      activeModules: current.activeModules.includes(id)
        ? current.activeModules.filter((module) => module !== id)
        : [...current.activeModules, id],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-950/50">
      <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Plataforma</p>
            <h2 className="mt-1 text-lg font-black text-slate-950">Editar empresa</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {save.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da empresa" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <Field label="CNPJ" value={form.document} onChange={(value) => setForm((current) => ({ ...current, document: value }))} />
            <Field label="Max. usuarios" type="number" value={form.maxUsers} onChange={(value) => setForm((current) => ({ ...current, maxUsers: value }))} />
            <Field label="Max. funcionarios" type="number" value={form.maxEmployees} onChange={(value) => setForm((current) => ({ ...current, maxEmployees: value }))} />
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Plano da plataforma</span>
              <select
                value={form.platformPlanId}
                onChange={(event) => setForm((current) => ({ ...current, platformPlanId: event.target.value }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500"
              >
                <option value="">Sem plano vinculado</option>
                {planOptions.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Status da empresa</span>
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CompanyStatus }))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500">
                <option value="ACTIVE">Ativa</option>
                <option value="SUSPENDED">Suspensa</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Status financeiro</span>
              <select value={form.billingStatus} onChange={(event) => setForm((current) => ({ ...current, billingStatus: event.target.value as 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' }))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500">
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="PAST_DUE">Past due</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </label>
            <Field label="Fim do trial" type="date" value={form.trialEndsAt} onChange={(value) => setForm((current) => ({ ...current, trialEndsAt: value }))} />
          </div>

          <div className="grid gap-2 rounded-2xl border border-slate-200 p-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Modulos ativos</h3>
              <p className="mt-1 text-xs text-slate-500">Ajuste o pacote funcional sem sair do console.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODULES.map((module) => (
                <label key={module.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${form.activeModules.includes(module.id) ? 'border-violet-300 bg-violet-50/60 text-violet-800' : 'border-slate-200 text-slate-600'}`}>
                  <input type="checkbox" checked={form.activeModules.includes(module.id)} onChange={() => toggleModule(module.id)} className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" />
                  {module.label}
                </label>
              ))}
            </div>
          </div>

          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            <span>Motivo de suspensao / observacoes</span>
            <textarea
              value={form.internalNotes}
              onChange={(event) => setForm((current) => ({ ...current, internalNotes: event.target.value }))}
              rows={4}
              className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="Contexto comercial, bloqueio, negociacao ou observacao interna"
            />
          </label>

          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            <span>Motivo de suspensao</span>
            <select value={form.suspensionReason} onChange={(event) => setForm((current) => ({ ...current, suspensionReason: event.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500">
              <option value="">Sem motivo</option>
              <option value="inadimplencia">Inadimplencia</option>
              <option value="solicitacao_voluntaria">Solicitacao voluntaria</option>
              <option value="não informado">Nao informado</option>
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
            Customer/Subscription IDs nao sao editados aqui para evitar divergencia financeira. O painel faz a conciliacao automaticamente.
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => save.mutate()}
            disabled={save.loading || !isDirty}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {save.loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar empresa
          </button>
        </footer>
      </div>
    </div>
  );
}
