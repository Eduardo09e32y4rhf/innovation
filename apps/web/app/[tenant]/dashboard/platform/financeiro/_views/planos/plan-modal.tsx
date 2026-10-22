'use client';

import { useState } from 'react';
import { X, EyeOff, Gift } from 'lucide-react';
import { useMutation } from '../../../_components/use-platform-query';
import { request } from '@/app/lib/api';
import { useOverlay } from '@/app/components/ui/use-overlay';
import { MODULES, parseMoney } from './plan-helpers';

// ─── MODAL ───────────────────────────────────────────────────────────────────

export function PlanModal({ plan, onClose, onDone }: { plan?: any; onClose: () => void; onDone: () => void }) {
  const overlayRef = useOverlay<HTMLDivElement>(true, onClose);
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
    isRecommended: plan?.isRecommended ?? false,
    displayOrder: plan?.displayOrder ?? 0,
    includedUnits: plan?.includedUnits ?? 0,
    userMonthlyPrice: plan ? String(parseMoney(plan.userMonthlyPrice)) : '0',
    extraUnitLabel: (plan?.extraUnitLabel ?? 'colaborador') as string,
    featuresText: ((plan?.features ?? []) as string[]).join('\n'),
  });

  const save = useMutation(() => {
    const { featuresText, ...rest } = form;
    const payload = {
      ...rest,
      price: form.isFree ? 0 : parseMoney(form.price),
      baseMonthlyPrice: form.isFree ? 0 : parseMoney(form.price),
      userMonthlyPrice: parseMoney(form.userMonthlyPrice),
      includedUnits: Number(form.includedUnits) || 0,
      displayOrder: Number(form.displayOrder) || 0,
      features: featuresText.split('\n').map((line) => line.trim()).filter(Boolean),
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

  const parsedPrice = parseMoney(form.price);
  const priceInvalid = !form.isFree && parsedPrice <= 0;
  const isValid = form.name.trim().length > 0 && !priceInvalid;

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="Plano" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-[14px] border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-black text-slate-950">{plan ? 'Editar Plano' : 'Novo Plano'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {save.error && <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{save.error}</p>}
          {priceInvalid && <p className="rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Plano pago precisa ter valor maior que zero. Corrija o preco antes de salvar.</p>}

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
            <span>Subtítulo do card (descrição)</span>
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
                type="text"
                inputMode="decimal"
                placeholder="199,90"
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


          {/* Card de venda: tudo que aparece na landing e no cadastro */}
          <div className="rounded-[10px] border border-violet-200 bg-violet-50/50 p-4 space-y-3">
            <p className="text-xs font-black text-slate-900">Card de venda (landing e cadastro)</p>
            <div className="grid grid-cols-3 gap-3">
              <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
                <span>Incluso no plano</span>
                <input type="number" min={0} value={form.includedUnits} onChange={e => setForm(f => ({ ...f, includedUnits: Number(e.target.value) || 0 }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
                <span>Adicional (R$)</span>
                <input type="text" inputMode="decimal" value={form.userMonthlyPrice} onChange={e => setForm(f => ({ ...f, userMonthlyPrice: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500" />
              </label>
              <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
                <span>Adicional por</span>
                <select value={form.extraUnitLabel} onChange={e => setForm(f => ({ ...f, extraUnitLabel: e.target.value }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm bg-white outline-none focus:border-indigo-500">
                  <option value="colaborador">Colaborador</option>
                  <option value="vaga">Vaga</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
              <span>Itens do card (um por linha, até 12)</span>
              <textarea value={form.featuresText} onChange={e => setForm(f => ({ ...f, featuresText: e.target.value }))} rows={5} placeholder={'10 colaboradores inclusos\n11 acessos: 1 admin + 10 colaboradores'} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 resize-y" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 p-3 border border-slate-200 rounded-[8px] bg-white cursor-pointer">
                <input type="checkbox" checked={form.isRecommended} onChange={e => setForm(f => ({ ...f, isRecommended: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                Mais popular (destaque)
              </label>
              <label className="block space-y-1 text-xs font-semibold text-slate-600">
                <span>Ordem na tela</span>
                <input type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) || 0 }))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 bg-white" />
              </label>
            </div>
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
