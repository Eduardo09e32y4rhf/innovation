'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Edit3, Trash2, X, Check } from 'lucide-react';
import { ErrorState, LoadingState, EmptyState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';

const MODULES = ['employees', 'time-track', 'vacations', 'management', 'whatsapp'];

function PlanModal({ plan, onClose, onDone }: { plan?: any; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    price: plan?.price ?? '0',
    cycle: plan?.cycle ?? 'MONTHLY',
    maxUsers: plan?.maxUsers ?? 9999,
    maxEmployees: plan?.maxEmployees ?? 9999,
    activeModules: plan?.activeModules ?? MODULES,
  });

  const save = useMutation(() => {
    const payload = { ...form, price: Number(form.price), maxUsers: Number(form.maxUsers), maxEmployees: Number(form.maxEmployees) };
    if (plan) {
      return request(`/platform/plans/${plan.id}`, { method: 'PATCH', body: payload });
    }
    return request('/platform/plans', { method: 'POST', body: payload });
  }, { onSuccess: onDone });

  function toggleModule(m: string) {
    setForm(f => ({
      ...f,
      activeModules: f.activeModules.includes(m) ? f.activeModules.filter((x: string) => x !== m) : [...f.activeModules, m]
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">{plan ? 'Editar Plano' : 'Novo Plano'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        
        {save.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}
        
        <div className="space-y-4">
          <label className="block space-y-1 text-xs font-medium text-slate-600">
            <span>Nome do Plano</span>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              <span>Preço (R$)</span>
              <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              <span>Ciclo de Cobrança</span>
              <select value={form.cycle} onChange={e => setForm(f => ({ ...f, cycle: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500">
                <option value="MONTHLY">Mensal</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="YEARLY">Anual</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              <span>Limite de Usuários (Sistemas)</span>
              <input type="number" value={form.maxUsers} onChange={e => setForm(f => ({ ...f, maxUsers: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="block space-y-1 text-xs font-medium text-slate-600">
              <span>Limite de Colaboradores (Ponto/RH)</span>
              <input type="number" value={form.maxEmployees} onChange={e => setForm(f => ({ ...f, maxEmployees: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" />
            </label>
          </div>
          
          <div>
            <span className="block text-xs font-bold text-slate-800 mb-2">Módulos Ativos</span>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map(m => (
                <label key={m} className={`flex items-center gap-2 p-2 rounded-[6px] border cursor-pointer ${form.activeModules.includes(m) ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                  <input type="checkbox" checked={form.activeModules.includes(m)} onChange={() => toggleModule(m)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-xs font-medium text-slate-700">{m}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="rounded-[8px] px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" disabled={save.loading || !form.name} onClick={() => save.mutate()} className="crystal-button rounded-[8px] px-6 py-2 text-sm font-black text-white disabled:opacity-50">Salvar Plano</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlansPage({ params: { tenant } }: { params: { tenant: string } }) {
  const plansData = useQuery(() => request<any[]>('/platform/plans'), []);
  const [editing, setEditing] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const remove = useMutation((id: string) => request(`/platform/plans/${id}`, { method: 'DELETE' }), {
    onSuccess: () => plansData.refetch(),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Gestão da Plataforma</h2>
          <div className="mt-4 flex gap-4 border-b border-slate-200">
            <Link href={`/${tenant}/dashboard/platform`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Empresas</Link>
            <Link href={`/${tenant}/dashboard/platform/plans`} className="border-b-2 border-indigo-600 pb-2 text-sm font-bold text-indigo-600">Planos & Assinaturas</Link>
            <Link href={`/${tenant}/dashboard/platform/finance`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Financeiro (Em Breve)</Link>
            <Link href={`/${tenant}/dashboard/platform/permissions`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Permissões Globais</Link>
          </div>
        </div>
        <button onClick={() => setIsCreating(true)} className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <Plus size={14} /> Novo Plano
        </button>
      </header>

      {plansData.error ? (
        <ErrorState message={plansData.error} onRetry={plansData.refetch} />
      ) : plansData.loading ? (
        <LoadingState label="Carregando planos..." />
      ) : plansData.data?.length === 0 ? (
        <EmptyState message="Nenhum plano cadastrado." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansData.data?.map(plan => (
            <div key={plan.id} className="ops-card flex flex-col justify-between rounded-[12px] border border-slate-200 bg-white p-6 relative">
              {!plan.isActive && <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">Inativo</div>}
              <div>
                <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                <div className="mt-2 text-3xl font-black text-indigo-600">
                  R$ {Number(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-sm font-medium text-slate-400">/{plan.cycle === 'MONTHLY' ? 'mês' : plan.cycle === 'YEARLY' ? 'ano' : 'ciclo'}</span>
                </div>
                <div className="mt-4 space-y-2 text-xs font-medium text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Usuários (Sistemas)</span> <span className="font-bold">{plan.maxUsers}</span></div>
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span>Colaboradores (Ponto)</span> <span className="font-bold">{plan.maxEmployees}</span></div>
                  <div className="flex justify-between pt-1">
                    <span>Módulos ({plan.activeModules.length})</span> 
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <button onClick={() => setEditing(plan)} className="flex-1 btn-outline h-9 inline-flex justify-center items-center gap-2 text-xs font-bold text-slate-700">
                  <Edit3 size={14} /> Editar
                </button>
                {plan.isActive && (
                  <button onClick={() => { if(window.confirm('Desativar este plano?')) remove.mutate(plan.id); }} className="h-9 w-9 flex justify-center items-center rounded-[8px] border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
