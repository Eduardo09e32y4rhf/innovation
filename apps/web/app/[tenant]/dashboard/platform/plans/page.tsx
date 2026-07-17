'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit3, Trash2, X, RotateCcw, Check, Users, Briefcase, Layers, Eye, EyeOff, Gift } from 'lucide-react';
import { ErrorState, LoadingState, EmptyState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';

const MODULES: { id: string; label: string }[] = [
  { id: 'employees', label: 'Funcionários' },
  { id: 'time-track', label: 'Controle de Ponto' },
  { id: 'vacations', label: 'Férias' },
  { id: 'management', label: 'Painel de Gestão' },
  { id: 'whatsapp', label: 'Integração WhatsApp' },
];

const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: 'mês',
  QUARTERLY: 'trimestre',
  YEARLY: 'ano',
};

// Prisma Decimal vem como string — converte com segurança
function parseMoney(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

function formatBRL(val: any): string {
  return parseMoney(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── MODAL ───────────────────────────────────────────────────────────────────

function PlanModal({ plan, onClose, onDone }: { plan?: any; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan ? String(parseMoney(plan.price)) : '0',
    cycle: plan?.cycle ?? 'MONTHLY',
    maxUsers: plan?.maxUsers ?? 9999,
    maxEmployees: plan?.maxEmployees ?? 9999,
    activeModules: (plan?.activeModules ?? MODULES.map(m => m.id)) as string[],
    isFree: plan?.isFree ?? false,
    isHidden: plan?.isHidden ?? false,
  });

  const save = useMutation(() => {
    const payload = {
      ...form,
      price: form.isFree ? 0 : parseMoney(form.price),
      maxUsers: Number(form.maxUsers),
      maxEmployees: Number(form.maxEmployees),
    };
    if (plan) {
      return request(`/platform/plans/${plan.id}`, { method: 'PATCH', body: payload });
    }
    return request('/platform/plans', { method: 'POST', body: payload });
  }, { onSuccess: onDone });

  function toggleModule(id: string) {
    setForm(f => ({
      ...f,
      activeModules: f.activeModules.includes(id)
        ? f.activeModules.filter(x => x !== id)
        : [...f.activeModules, id],
    }));
  }

  const isValid = form.name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[14px] border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-black text-slate-950">{plan ? 'Editar Plano' : 'Novo Plano'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {save.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}

          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            <span>Nome do Plano <span className="text-rose-500">*</span></span>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Pro, Básico, Enterprise..."
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>

          <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
            <span>Descrição (opcional)</span>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Descreva o que está incluído no plano..."
              rows={2}
              className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Preço (R$)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                disabled={form.isFree}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Ciclo de Cobrança</span>
              <select
                value={form.cycle}
                onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 bg-white"
              >
                <option value="MONTHLY">Mensal</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="YEARLY">Anual</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Limite de Usuários (Sistemas)</span>
              <input
                type="number"
                min="1"
                value={form.maxUsers}
                onChange={e => setForm(f => ({ ...f, maxUsers: Number(e.target.value) || 1 }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Limite de Colaboradores</span>
              <input
                type="number"
                min="1"
                value={form.maxEmployees}
                onChange={e => setForm(f => ({ ...f, maxEmployees: Number(e.target.value) || 1 }))}
                className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          {/* Opções */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 p-3 border border-slate-200 rounded-[8px] cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={e => setForm(f => ({ ...f, isFree: e.target.checked, price: e.target.checked ? '0' : f.price }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Gift size={13} className="text-emerald-600" />
              Plano Gratuito
            </label>
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 p-3 border border-slate-200 rounded-[8px] cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={form.isHidden}
                onChange={e => setForm(f => ({ ...f, isHidden: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <EyeOff size={13} className="text-slate-400" />
              Oculto (Interno)
            </label>
          </div>

          {/* Módulos */}
          <div>
            <span className="block text-xs font-bold text-slate-800 mb-2">Módulos incluídos</span>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map(m => (
                <label
                  key={m.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-[8px] border cursor-pointer transition-all ${
                    form.activeModules.includes(m.id)
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.activeModules.includes(m.id)}
                    onChange={() => toggleModule(m.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-semibold">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-white rounded-b-[14px]">
          <button type="button" onClick={onClose} className="btn-outline h-9 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            type="button"
            disabled={save.loading || !isValid}
            onClick={() => save.mutate()}
            className="crystal-button h-9 rounded-[8px] px-5 text-xs font-black text-white disabled:opacity-50"
          >
            {save.loading ? 'Salvando...' : 'Salvar Plano'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD ────────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onDeactivate, onReactivate, onDelete }: {
  plan: any;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const price = parseMoney(plan.price);
  const cycleLabel = CYCLE_LABEL[plan.cycle as string] ?? 'ciclo';
  const moduleNames = (plan.activeModules as string[]).map(id => MODULES.find(m => m.id === id)?.label ?? id);
  const isActive = plan.isActive !== false;

  return (
    <div className={`ops-card relative flex flex-col rounded-[14px] border bg-white transition-all ${
      isActive ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-100 opacity-60'
    }`}>
      {/* Badges */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        {!isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            Inativo
          </span>
        )}
        {plan.isHidden && isActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-600">
            <EyeOff size={9} /> Oculto
          </span>
        )}
        {plan.isFree && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <Gift size={9} /> FREE
          </span>
        )}
      </div>

      {/* Header */}
      <div className="p-5 pb-0">
        <h3 className="text-base font-black text-slate-900 pr-16">{plan.name}</h3>
        {plan.description && <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">{plan.description}</p>}

        {/* Price */}
        <div className="mt-3 flex items-end gap-1">
          <span className="text-[11px] font-semibold text-slate-500">R$</span>
          <span className="text-3xl font-black text-indigo-600 leading-none">
            {plan.isFree ? '0,00' : formatBRL(plan.price)}
          </span>
          <span className="text-xs font-medium text-slate-400 mb-0.5">/{cycleLabel}</span>
        </div>
      </div>

      {/* Details */}
      <div className="mx-5 mt-4 space-y-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium"><Users size={11} /> Usuários (Sistemas)</span>
          <span className="font-bold text-slate-800">{plan.maxUsers >= 9999 ? 'Ilimitado' : plan.maxUsers}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium"><Briefcase size={11} /> Colaboradores</span>
          <span className="font-bold text-slate-800">{plan.maxEmployees >= 9999 ? 'Ilimitado' : plan.maxEmployees}</span>
        </div>
        <div className="flex items-start justify-between text-xs gap-2">
          <span className="flex items-center gap-1.5 text-slate-500 font-medium whitespace-nowrap"><Layers size={11} /> Módulos</span>
          <span className="font-semibold text-slate-700 text-right text-[10px] leading-relaxed">{moduleNames.join(', ') || '—'}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto p-4 pt-3 flex gap-2">
        {isActive ? (
          <>
            <button
              onClick={onEdit}
              className="flex-1 btn-outline h-9 inline-flex justify-center items-center gap-1.5 text-xs font-bold text-slate-700 rounded-[8px]"
            >
              <Edit3 size={13} /> Editar
            </button>
            <button
              onClick={onDeactivate}
              title="Desativar plano"
              className="h-9 w-9 flex justify-center items-center rounded-[8px] border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onReactivate}
              className="flex-1 btn-outline h-9 inline-flex justify-center items-center gap-1.5 text-xs font-bold text-emerald-700 rounded-[8px] border-emerald-200 hover:bg-emerald-50"
            >
              <RotateCcw size={13} /> Reativar
            </button>
            <button
              onClick={onDelete}
              title="Excluir permanentemente"
              className="h-9 w-9 flex justify-center items-center rounded-[8px] border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function PlansPage({ params: { tenant } }: { params: { tenant: string } }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.profile?.toUpperCase() === 'DEV';

  const plansData = useQuery(() => request<any[]>('/platform/plans'), []);
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const deactivate = useMutation(
    (id: string) => request(`/platform/plans/${id}`, { method: 'DELETE' }),
    { onSuccess: () => plansData.refetch() },
  );

  const reactivate = useMutation(
    (id: string) => request(`/platform/plans/${id}`, { method: 'PATCH', body: { isActive: true } }),
    { onSuccess: () => plansData.refetch() },
  );

  const deletePermanently = useMutation(
    (id: string) => request(`/platform/plans/${id}/permanent`, { method: 'DELETE' }),
    { onSuccess: () => plansData.refetch() },
  );

  const allPlans = plansData.data ?? [];
  const activePlans = allPlans.filter(p => p.isActive !== false);
  const inactivePlans = allPlans.filter(p => p.isActive === false);
  const visiblePlans = showInactive ? allPlans : activePlans;

  function handleDeactivate(plan: any) {
    if (!window.confirm(`Desativar o plano "${plan.name}"?\nEmpresas vinculadas não serão afetadas.`)) return;
    deactivate.mutate(plan.id);
  }

  function handleReactivate(plan: any) {
    reactivate.mutate(plan.id);
  }

  function handleDeletePermanent(plan: any) {
    if (!window.confirm(`EXCLUIR PERMANENTEMENTE o plano "${plan.name}"?\nEsta ação não pode ser desfeita.`)) return;
    deletePermanently.mutate(plan.id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Gestão da Plataforma</h2>
          <div className="mt-4 flex gap-4 border-b border-slate-200">
            <Link href={`/${tenant}/dashboard/platform`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Empresas</Link>
            <Link href={`/${tenant}/dashboard/platform/plans`} className="border-b-2 border-indigo-600 pb-2 text-sm font-bold text-indigo-600">Planos & Assinaturas</Link>
            <Link href={`/${tenant}/dashboard/platform/finance`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Financeiro</Link>
            <Link href={`/${tenant}/dashboard/platform/permissions`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Permissões Globais</Link>
          </div>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"
        >
          <Plus size={14} /> Novo Plano
        </button>
      </header>

      {/* Stats bar */}
      {!plansData.loading && allPlans.length > 0 && (
        <div className="flex items-center gap-6 rounded-[10px] border border-slate-100 bg-white px-5 py-3">
          <div className="text-xs text-slate-500">
            <span className="font-black text-slate-950">{activePlans.length}</span> planos ativos
          </div>
          {inactivePlans.length > 0 && (
            <>
              <div className="h-4 w-px bg-slate-200" />
              <div className="text-xs text-slate-500">
                <span className="font-black text-slate-400">{inactivePlans.length}</span> inativos
              </div>
              <button
                onClick={() => setShowInactive(v => !v)}
                className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                {showInactive ? <EyeOff size={12} /> : <Eye size={12} />}
                {showInactive ? 'Ocultar inativos' : 'Mostrar inativos'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Errors */}
      {(deactivate.error || reactivate.error || deletePermanently.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {deactivate.error || reactivate.error || deletePermanently.error}
        </p>
      )}

      {/* Content */}
      {plansData.error ? (
        <ErrorState message={plansData.error} onRetry={plansData.refetch} />
      ) : plansData.loading ? (
        <LoadingState label="Carregando planos..." />
      ) : visiblePlans.length === 0 ? (
        <EmptyState message={allPlans.length === 0 ? 'Nenhum plano cadastrado. Clique em + Novo Plano para criar.' : 'Nenhum plano ativo no momento.'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visiblePlans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => setEditing(plan)}
              onDeactivate={() => handleDeactivate(plan)}
              onReactivate={() => handleReactivate(plan)}
              onDelete={() => handleDeletePermanent(plan)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {(isCreating || editing) && (
        <PlanModal
          plan={editing}
          onClose={() => { setIsCreating(false); setEditing(null); }}
          onDone={() => { setIsCreating(false); setEditing(null); plansData.refetch(); }}
        />
      )}
    </div>
  );
}
