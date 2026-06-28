'use client';

import { Edit3 } from 'lucide-react';
import type { Employee } from '@/app/lib/api';

export function BulkAdjustmentModal({ open, onClose, onSuccess, employees }: { open: boolean; onClose: () => void; onSuccess: () => void; employees: Employee[] }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">LANÇAR EM LOTE</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><Edit3 size={18} className="rotate-45" /></button>
        </div>
        <p className="text-sm text-slate-600">O lançamento em lote continua disponível no modal principal. Esta camada só evita a quebra da página enquanto consolidamos a experiência.</p>
        <div className="mt-4 rounded-[10px] border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          Funcionários ativos disponíveis: <span className="font-black text-slate-900">{employees.length}</span>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
          <button onClick={onSuccess} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white">FECHAR</button>
        </div>
      </div>
    </div>
  );
}
