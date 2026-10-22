'use client';

import { Edit2, History, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/app/components/ui';
import { DataTable, type Column } from '../../_components/data-table';
import { StateBlock } from '../../_components/page-shell';
import { useUrlFilters } from '../../_components/use-url-filters';
import { SelectFilter } from '../_components/filter-bar';
import { ContractDetail } from './contract-detail';
import { ContractFormPanel } from './contract-form';
import { PAYMENT_LABELS, STATUS_LABELS, STATUS_TONES, date, money, parseMoney, type ManualContract } from './contract-model';
import { useContracts } from './use-contracts';

const STATUS_OPTIONS: Array<[string, string]> = [['', 'Todas as situações'], ['ACTIVE', 'Ativos'], ['ENDED', 'Encerrados'], ['CANCELED', 'Cancelados']];

/** Contratos manuais: resumo, formulário, lista filtrável (situação e empresa na URL) e detalhe. */
export function ContractsView() {
  const filters = useUrlFilters();
  const companyId = filters.get('company');
  const status = filters.get('situacao');
  const state = useContracts(companyId);
  const [selected, setSelected] = useState<ManualContract | null>(null);
  const [showForm, setShowForm] = useState(false);
  const rows = useMemo(() => state.contracts.filter((item) => (!companyId || item.companyId === companyId) && (!status || item.status === status)), [state.contracts, companyId, status]);
  const total = useMemo(() => state.contracts.reduce((sum, item) => sum + parseMoney(item.agreedAmount), 0), [state.contracts]);
  const count = (key: string) => state.contracts.filter((item) => item.status === key).length;

  const columns: Column<ManualContract>[] = [
    { key: 'company', label: 'Empresa', cell: (c) => <><p className="font-semibold">{c.company?.name || 'Empresa'}</p><p className="text-xs text-fg-sub">{c.company?.document || '-'} · {c.plan?.name || 'Sem plano'}</p></> },
    { key: 'amount', label: 'Valor', cell: (c) => <strong>{money(c.agreedAmount)}</strong> },
    { key: 'seats', label: 'Licenças', cell: (c) => c.seatQuantity },
    { key: 'period', label: 'Vigência', cell: (c) => `${date(c.startsAt)} a ${c.endsAt ? date(c.endsAt) : 'indeterminado'}` },
    { key: 'payment', label: 'Pagamento', cell: (c) => PAYMENT_LABELS[c.paymentMethod] || c.paymentMethod },
    { key: 'status', label: 'Situação', cell: (c) => <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${STATUS_TONES[c.status]}`}>{STATUS_LABELS[c.status]}</span> },
    { key: 'actions', label: 'Ações', right: true, cell: (c) => (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setSelected(c)}><History size={14} aria-hidden="true" /> Detalhes</Button>
        <Button size="sm" variant="outline" onClick={() => state.exportPdf(c)}>PDF</Button>
        <Button size="sm" variant="outline" onClick={() => { state.edit(c); setShowForm(true); }}><Edit2 size={14} aria-hidden="true" /> Editar</Button>
        <Button size="sm" variant="outline" disabled={state.workingId === c.id} onClick={() => state.remove(c)}>{state.workingId === c.id ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />} Excluir</Button>
      </span>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SelectFilter label="Situação do contrato" value={status} options={STATUS_OPTIONS} onChange={(value) => filters.set({ situacao: value })} />
        <p className="text-sm text-fg-sub">{state.contracts.length ? `${count('ACTIVE')} ativo(s) · ${count('ENDED')} encerrado(s) · ${count('CANCELED')} cancelado(s) · ${money(total)} contratados` : ''}</p>
        <span className="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={() => void state.load()} disabled={state.loading}><RefreshCw size={14} className={state.loading ? 'animate-spin' : ''} aria-hidden="true" /> Atualizar</Button>
          <Button onClick={() => { state.reset(); setShowForm(true); }}><Plus size={14} aria-hidden="true" /> Novo contrato</Button>
        </span>
      </div>
      {showForm && <ContractFormPanel form={state.form} onChange={state.setForm} lookups={state.lookups} editing={Boolean(state.editingId)} saving={state.saving} error={state.error}
        onSubmit={async (event) => { await state.submit(event); setShowForm(false); }} onReset={() => { state.reset(); setShowForm(false); }} />}
      <StateBlock loading={state.loading && state.contracts.length === 0} error={showForm ? null : state.error} empty={rows.length === 0} emptyText="Nenhum contrato cadastrado." loadingLabel="Carregando contratos…" onRetry={() => void state.load()}>
        <DataTable caption="Contratos manuais" columns={columns} rows={rows} rowKey={(c) => c.id} />
      </StateBlock>
      {selected && <ContractDetail contract={selected} onClose={() => setSelected(null)} onEdit={(c) => { state.edit(c); setShowForm(true); setSelected(null); }} onPdf={state.exportPdf} />}
    </div>
  );
}
