'use client';

import { Edit3, Trash2, RotateCcw, Users, Briefcase, Layers, EyeOff, Gift } from 'lucide-react';
import { MODULES, CYCLE_LABEL, parseMoney, formatBRL } from './plan-helpers';

// ─── CARD ────────────────────────────────────────────────────────────────────

export function PlanCard({ plan, readOnly, onEdit, onDeactivate, onReactivate, onDelete }: {
  plan: any;
  readOnly?: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const price = parseMoney(plan.price);
  const cycleLabel = CYCLE_LABEL[plan.cycle as string] ?? 'ciclo';
  const moduleNames = (plan.activeModules as string[]).map(id => MODULES.find(m => m.id === id)?.label ?? id);
  const isActive = plan.isActive !== false;
  const paidPlanWithoutPrice = !plan.isFree && price <= 0;

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
          <span className={`text-3xl font-black leading-none ${paidPlanWithoutPrice ? 'text-rose-600' : 'text-indigo-600'}`}>
            {plan.isFree ? '0,00' : formatBRL(plan.price)}
          </span>
          <span className="text-xs font-medium text-slate-400 mb-0.5">/{cycleLabel}</span>
        </div>
        {paidPlanWithoutPrice && (
          <p className="mt-3 rounded-[8px] border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
            Este plano esta pago, mas foi salvo com valor zero no banco. Clique em Editar e informe o preco correto.
          </p>
        )}
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
      {!readOnly && <div className="mt-auto p-4 pt-3 flex gap-2">
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
      </div>}
    </div>
  );
}
