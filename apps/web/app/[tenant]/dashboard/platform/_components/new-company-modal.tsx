'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type CreatePlatformCompanyInput } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

function F({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
    </label>
  );
}

export function NewCompanyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const plansData = useQuery(() => api.platform.listPlans(), []);

  const [form, setForm] = useState<CreatePlatformCompanyInput & { planId?: string }>({
    name: '', document: '', slug: '', maxUsers: 10, maxEmployees: 20,
    adminName: '', adminEmail: '', adminPassword: '',
  });
  
  const create = useMutation(() => api.platform.createCompany({
    ...form,
    name: normalizeDisplayName(form.name),
    document: form.document?.replace(/\D/g, ''),
    adminName: normalizeDisplayName(form.adminName),
    adminEmail: form.adminEmail.trim().toLowerCase(),
    planId: form.planId,
  }), { onSuccess: (result) => {
    if (result.paymentUrl) {
      window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      toast.success('Empresa criada. Checkout Asaas aberto em nova aba.');
    } else if (result.billingSetupPending) {
      toast.warning('Empresa criada, mas o checkout precisa ser retomado em Detalhes.');
    } else {
      toast.success('Empresa criada e ativada.');
    }
    onDone();
  } });
  
  const valid = form.name && form.adminName && form.adminEmail && form.adminPassword.length >= 8;

  function set<K extends keyof (CreatePlatformCompanyInput & { planId?: string })>(k: K, v: any) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Nova empresa</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {create.error && <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{create.error}</p>}
        <div className="grid gap-3 sm:grid-cols-2 mb-3">
          <F label="Nome da empresa" value={form.name} onChange={(v) => set('name', v)} required />
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">CNPJ</label>
            <div className="flex gap-2">
              <input type="text" value={form.document ?? ''} onChange={(e) => set('document', e.target.value)} className="h-10 flex-1 rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
              <button 
                type="button"
                onClick={async () => {
                  if (!form.document || form.document.length < 14) return alert('Digite um CNPJ válido');
                  try {
                    const res = await api.platform.getReceitaCnpj(form.document.replace(/\D/g, ''));
                    if (res.nome) set('name', res.nome);
                    if (res.email) set('adminEmail', res.email);
                  } catch (e: any) {
                    alert(e.message || 'Erro ao buscar CNPJ');
                  }
                }}
                className="btn-outline px-3 rounded-[8px] text-xs font-bold whitespace-nowrap h-10"
              >
                Buscar
              </button>
            </div>
          </div>
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Plano (Opcional)</span>
            <select value={form.planId || ''} onChange={e => {
              const pId = e.target.value;
              set('planId', pId);
              const plan = plansData.data?.find(p => p.id === pId);
              if (plan) {
                set('maxUsers', plan.maxUsers);
                set('maxEmployees', plan.maxEmployees);
              }
            }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="">Sem plano (Limites manuais)</option>
              {plansData.data?.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isHidden ? '(Uso Interno)' : ''} - {p.isFree ? 'FREE' : `R$ ${parseFloat(String(p.price || 0)).toFixed(2)}`}
                </option>
              ))}
            </select>
          </label>
          <F label="Max. usuarios" type="number" value={String(form.maxUsers)} onChange={(v) => set('maxUsers', Number(v) || 6)} />
          <F label="Max. funcionarios" type="number" value={String(form.maxEmployees)} onChange={(v) => set('maxEmployees', Number(v) || 50)} />
        </div>
        <p className="mb-2 mt-4 text-[11px] font-black uppercase tracking-wider text-slate-400">Admin inicial</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Nome" value={form.adminName} onChange={(v) => set('adminName', v)} required />
          <F label="E-mail" type="email" value={form.adminEmail} onChange={(v) => set('adminEmail', v)} required />
          <div className="sm:col-span-2">
            <F label="Senha (min. 8 chars)" type="password" value={form.adminPassword} onChange={(v) => set('adminPassword', v)} required />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button onClick={() => valid && create.mutate().catch(() => {})} disabled={!valid || create.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
            {create.loading ? 'Criando...' : 'Criar empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}
