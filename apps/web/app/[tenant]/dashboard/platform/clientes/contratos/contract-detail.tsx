'use client';

import { Edit2, FileSignature, X } from 'lucide-react';
import { useOverlay } from '@/app/components/ui/use-overlay';
import { PAYMENT_LABELS, STATUS_LABELS, date, money, type ManualContract } from './contract-model';

interface ContractDetailProps { contract: ManualContract; onClose: () => void; onEdit: (contract: ManualContract) => void; onPdf: (contract: ManualContract) => void }

/** Painel lateral com todos os dados do contrato. */
export function ContractDetail({ contract, onClose, onEdit, onPdf }: ContractDetailProps) {
  const ref = useOverlay<HTMLDivElement>(true, onClose);
  const facts: Array<[string, string]> = [
    ['Empresa', contract.company?.name || '-'], ['Documento', contract.company?.document || '-'], ['Plano', contract.plan?.name || '-'],
    ['Licenças', String(contract.seatQuantity)], ['Início', date(contract.startsAt)], ['Fim', contract.endsAt ? date(contract.endsAt) : 'Indeterminado'],
    ['Número externo', contract.externalContractNumber || '-'], ['PDF', contract.documentUrl ? 'Vinculado' : 'Não informado'],
  ];
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Contrato" tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/50 p-0 sm:p-4">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-bg shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Detalhe do contrato</p>
            <h2 className="mt-1 truncate text-lg font-black text-fg">{contract.company?.name || 'Empresa'}</h2>
            <p className="mt-1 text-xs text-fg-sub">{money(contract.agreedAmount)} · {STATUS_LABELS[contract.status]} · {PAYMENT_LABELS[contract.paymentMethod] || contract.paymentMethod}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-fg-mut hover:bg-bg-sub"><X size={18} /></button>
        </header>
        <div className="grid gap-4 overflow-y-auto p-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            {facts.map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-bg-sub p-3"><dt className="text-xs font-semibold text-fg-mut">{label}</dt><dd className="mt-1 text-sm font-bold text-fg">{value}</dd></div>)}
          </dl>
          <div className="rounded-2xl border border-border p-4"><p className="text-xs font-semibold text-fg-mut">Observações</p><p className="mt-2 whitespace-pre-wrap text-sm text-fg">{contract.notes || 'Sem observações.'}</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onEdit(contract)} className="btn btn-outline inline-flex min-h-11 items-center gap-2 text-sm"><Edit2 size={14} aria-hidden="true" /> Editar</button>
            <button type="button" onClick={() => onPdf(contract)} className="btn btn-outline inline-flex min-h-11 items-center gap-2 text-sm"><FileSignature size={14} aria-hidden="true" /> Gerar PDF</button>
            {contract.documentUrl && <a href={contract.documentUrl} target="_blank" rel="noreferrer" className="btn btn-outline inline-flex min-h-11 items-center text-sm">Abrir documento</a>}
          </div>
        </div>
      </div>
    </div>
  );
}
