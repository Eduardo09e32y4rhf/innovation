'use client';

import { BadgeDollarSign, Calculator, CheckCircle2, ChevronDown, ChevronRight, DollarSign, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, ApiError, type Employee } from '@/app/lib/api';

import { ConfirmDialog, Modal } from '../../escalas/_components/operational-dialog';
import { payrollApi } from './payroll-api';
import { MANUAL_ITEM_LABEL, PAYROLL_STATUS_LABEL, type ManualItemInput, type ManualItemType, type PayrollItem, type PayrollStatus } from './types';

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH']);
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const MANUAL_TYPES = Object.keys(MANUAL_ITEM_LABEL) as ManualItemType[];

/** Nunca mostra "R$ NaN": valor ausente ou inválido vira "—". */
function brl(value: number | string | null | undefined): string {
  const n = Number(value);
  return value === null || value === undefined || !Number.isFinite(n) ? '—' : BRL.format(n);
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const br = (value?: string | null) => (value ? value.slice(0, 10).split('-').reverse().join('/') : '—');

function presets() {
  const now = new Date();
  const y = now.getFullYear(); const m = now.getMonth();
  const last = (yy: number, mm: number) => new Date(yy, mm + 1, 0).getDate();
  const prev = new Date(y, m - 1, 1);
  return [
    { label: 'Mês atual', from: iso(new Date(y, m, 1)), to: iso(new Date(y, m, last(y, m))) },
    { label: 'Mês anterior', from: iso(prev), to: iso(new Date(prev.getFullYear(), prev.getMonth(), last(prev.getFullYear(), prev.getMonth()))) },
    { label: '1ª quinzena', from: iso(new Date(y, m, 1)), to: iso(new Date(y, m, 15)) },
    { label: '2ª quinzena', from: iso(new Date(y, m, 16)), to: iso(new Date(y, m, last(y, m))) },
    { label: 'Dia 26 ao dia 25', from: iso(new Date(y, m - 1, 26)), to: iso(new Date(y, m, 25)) },
  ];
}

function statusClasses(status: PayrollStatus): string {
  switch (status) {
    case 'DRAFT': return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'PROCESSING': return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'APPROVED': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PAID': return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    case 'CANCELLED': return 'border-red-200 bg-red-50 text-red-700';
    default: return 'border-slate-200 bg-slate-100 text-slate-600';
  }
}

type Decision = { action: 'approve' | 'paid' | 'reopen' | 'delete' | 'approveAll'; item?: PayrollItem };

export default function PayrollPage() {
  const { user } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);

  const quick = useMemo(presets, []);
  const [from, setFrom] = useState(quick[0].from);
  const [to, setTo] = useState(quick[0].to);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollItem | null>(null);
  const [cancelling, setCancelling] = useState<PayrollItem | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rangeOk = Boolean(from && to && to >= from);
  const payrollQuery = useQuery(() => payrollApi.list(from, to), [from, to], { enabled: canAccess && rangeOk });
  const rows = payrollQuery.data ?? [];
  const active = rows.filter((r) => r.status !== 'CANCELLED');
  const drafts = rows.filter((r) => r.status === 'DRAFT' && !r.invalid);

  const sum = (pick: (r: PayrollItem) => number | null) => active.reduce((s, r) => s + (pick(r) ?? 0), 0);
  const totals = {
    employees: active.length,
    gross: sum((r) => r.grossSalary),
    net: sum((r) => r.netSalary),
    approved: active.filter((r) => r.status === 'APPROVED' || r.status === 'PAID').length,
  };

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <BadgeDollarSign className="mx-auto text-amber-600" size={30} />
          <h1 className="mt-3 text-lg font-semibold text-amber-950">Acesso restrito à folha de pagamento</h1>
          <p className="mt-2 text-sm font-medium text-amber-800">Esta área está disponível para os perfis DEV, ADMIN e RH.</p>
        </div>
      </div>
    );
  }

  async function run(item: PayrollItem, action: () => Promise<unknown>, success: string) {
    setBusyId(item.id);
    try { await action(); toast.success(success); payrollQuery.refetch(); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.'); }
    finally { setBusyId(null); }
  }

  async function confirmDecision() {
    if (!decision) return;
    const { action, item } = decision;
    if (action === 'approveAll') {
      setBusyId('all');
      let ok = 0; let fail = 0;
      for (const d of drafts) { try { await payrollApi.approve(d.id); ok++; } catch { fail++; } }
      setBusyId(null); setDecision(null); payrollQuery.refetch();
      toast[fail ? 'warning' : 'success'](fail ? `${ok} aprovada(s); ${fail} não puderam ser aprovadas.` : `${ok} folha(s) aprovada(s).`);
      return;
    }
    if (!item) return;
    const fresh = await payrollApi.get(item.id).catch(() => null);
    if (fresh && (fresh.status !== item.status || fresh.netSalary !== item.netSalary)) {
      toast.error('A folha foi alterada por outra pessoa. Revise os valores e tente de novo.');
      setDecision(null); payrollQuery.refetch(); return;
    }
    setDecision(null);
    if (action === 'approve') await run(item, () => payrollApi.approve(item.id), 'Folha aprovada.');
    else if (action === 'paid') await run(item, () => payrollApi.markAsPaid(item.id), 'Pagamento registrado.');
    else if (action === 'reopen') await run(item, () => payrollApi.reopen(item.id), 'Folha reaberta para edição.');
    else await run(item, () => payrollApi.remove(item.id), 'Folha excluída.');
  }

  const decisionText: Record<Decision['action'], { title: string; confirm: string; text: string }> = {
    approve: { title: 'Aprovar folha', confirm: 'Aprovar', text: 'Depois de aprovada, a folha não pode ser editada (só reaberta).' },
    paid: { title: 'Registrar pagamento', confirm: 'Marcar como paga', text: 'Confirme que o pagamento já foi feito. Nenhuma transferência bancária é realizada pelo sistema.' },
    reopen: { title: 'Reabrir folha', confirm: 'Reabrir', text: 'A folha volta para rascunho para ser editada e precisará ser aprovada de novo.' },
    delete: { title: 'Excluir folha', confirm: 'Excluir', text: 'A folha será removida da lista. O funcionário não é afetado.' },
    approveAll: { title: 'Aprovar todas em rascunho', confirm: 'Aprovar todas', text: `${drafts.length} folha(s) em rascunho deste ciclo serão aprovadas.` },
  };

  return (
    <div className="mx-auto w-full space-y-5">
      <PageHeader
        title="Folha de pagamento"
        subtitle="Escolha o ciclo (início e fim), calcule, edite, aprove e registre o pagamento."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus size={18} /> Nova folha</Button>}
      />

      <section className="ops-card space-y-3 rounded-[14px] border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-500">Ciclo começa em</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-v2" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-slate-500">Ciclo termina em</span>
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input-v2" /></label>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((p) => (
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${from === p.from && to === p.to ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p.label}</button>
            ))}
          </div>
        </div>
        {!rangeOk && <p className="text-xs font-semibold text-rose-700">O fim do ciclo precisa ser igual ou depois do início.</p>}
        <p className="text-xs text-slate-500">Mostra as folhas cujo ciclo toca este período. Marcar como paga registra a quitação; não faz transferência bancária.</p>
      </section>

      {payrollQuery.loading && !payrollQuery.data ? (
        <LoadingState label="Carregando folha de pagamento..." />
      ) : payrollQuery.error ? (
        <ErrorState message={payrollQuery.error} onRetry={payrollQuery.refetch} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} label="Funcionários na folha" value={totals.employees} tone="bg-violet-50 text-violet-700" />
            <SummaryCard icon={DollarSign} label="Total bruto" value={brl(totals.gross)} tone="bg-blue-50 text-blue-700" />
            <SummaryCard icon={BadgeDollarSign} label="Total líquido" value={brl(totals.net)} tone="bg-teal-50 text-teal-700" />
            <SummaryCard icon={CheckCircle2} label="Aprovadas / pagas" value={totals.approved} tone="bg-amber-50 text-amber-700" />
          </section>

          {drafts.length > 1 && (
            <div className="flex justify-end"><Button variant="outline" onClick={() => setDecision({ action: 'approveAll' })} disabled={busyId !== null}><CheckCircle2 size={16} /> Aprovar todas em rascunho ({drafts.length})</Button></div>
          )}

          {rows.length === 0 ? (
            <div className="ops-card rounded-[14px] border border-slate-200 bg-white">
              <EmptyState message={`Nenhuma folha neste ciclo (${br(from)} a ${br(to)}).`} />
              <div className="-mt-5 flex justify-center pb-8"><Button variant="primary" onClick={() => setCreateOpen(true)}><Calculator size={14} /> Calcular primeira folha</Button></div>
            </div>
          ) : (
            <section className="ops-card overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Funcionário / ciclo</th><th className="px-3 py-3">Bruto</th><th className="px-3 py-3">INSS</th><th className="px-3 py-3">IRRF</th>
                    <th className="px-3 py-3">FGTS</th><th className="px-3 py-3">Líquido</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((item) => {
                    const busy = busyId === item.id || busyId === 'all';
                    const open = expanded === item.id;
                    return (
                      <Fragment key={item.id}>
                        <tr className={`align-middle hover:bg-slate-50/70 ${item.status === 'CANCELLED' ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => setExpanded(open ? null : item.id)} className="flex items-start gap-1.5 text-left">
                              {open ? <ChevronDown size={16} className="mt-0.5 shrink-0" /> : <ChevronRight size={16} className="mt-0.5 shrink-0" />}
                              <span>
                                <span className="block font-semibold text-slate-950">{item.employee?.name ?? 'Funcionário'}</span>
                                <span className="block text-xs text-slate-500">{item.employee?.position ?? ''}{item.employee?.position ? ' · ' : ''}Ciclo {br(item.periodStart)} a {br(item.periodEnd)}</span>
                              </span>
                            </button>
                          </td>
                          <td className="px-3 py-3 font-bold text-slate-800">{brl(item.grossSalary)}</td>
                          <td className="px-3 py-3 font-medium text-rose-600">{brl(item.inssAmount)}</td>
                          <td className="px-3 py-3 font-medium text-rose-600">{brl(item.irrfAmount)}</td>
                          <td className="px-3 py-3 text-slate-600">{brl(item.fgtsAmount)}</td>
                          <td className="px-3 py-3 font-semibold text-emerald-600">{brl(item.netSalary)}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}>{PAYROLL_STATUS_LABEL[item.status] ?? item.status}</span>
                            {item.invalid && <span className="mt-1 block text-[11px] font-semibold text-rose-700">Valores inválidos</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-1">
                              {item.invalid && item.status === 'DRAFT' && <Button variant="outline" size="sm" disabled={busy} onClick={() => run(item, () => payrollApi.recalculate(item.id), 'Folha recalculada.')}><RefreshCw size={13} /> Recalcular</Button>}
                              {item.status === 'DRAFT' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing(item)}>Editar</Button>}
                              {item.status === 'DRAFT' && !item.invalid && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDecision({ action: 'approve', item })}>Aprovar</Button>}
                              {item.status === 'APPROVED' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDecision({ action: 'paid', item })}>Marcar paga</Button>}
                              {item.status === 'APPROVED' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setDecision({ action: 'reopen', item })}>Reabrir</Button>}
                              {(item.status === 'DRAFT' || item.status === 'APPROVED') && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setCancelling(item)}>Cancelar</Button>}
                              {(item.status === 'DRAFT' || item.status === 'CANCELLED') && <Button variant="ghost" size="sm" className="text-rose-700" disabled={busy} onClick={() => setDecision({ action: 'delete', item })}><Trash2 size={13} /> Excluir</Button>}
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={8} className="px-4 py-4"><Breakdown item={item} /></td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!decision}
        onClose={() => setDecision(null)}
        title={decision ? decisionText[decision.action].title : ''}
        description={decision ? `${decision.item ? `${decision.item.employee?.name ?? 'Funcionário'} · ${br(decision.item.periodStart)} a ${br(decision.item.periodEnd)} · líquido ${brl(decision.item.netSalary)}. ` : ''}${decisionText[decision.action].text}` : ''}
        confirmText={decision ? decisionText[decision.action].confirm : ''}
        variant={decision?.action === 'delete' ? 'danger' : 'primary'}
        isLoading={busyId !== null}
        onConfirm={confirmDecision}
      />

      {createOpen && <CreateModal initialFrom={from} initialTo={to} onClose={() => setCreateOpen(false)} onDone={() => { setCreateOpen(false); payrollQuery.refetch(); }} />}
      {editing && <EditModal item={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); payrollQuery.refetch(); }} />}
      {cancelling && <CancelModal item={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); payrollQuery.refetch(); }} />}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: string }) {
  return (
    <div className="ops-card flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></span>
      <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-0.5 truncate text-xl font-semibold leading-none text-slate-950">{value}</p></div>
    </div>
  );
}

/** Memória de cálculo: de onde vem cada valor. */
function Breakdown({ item }: { item: PayrollItem }) {
  const lines = item.items ?? [];
  const earnings = lines.filter((l) => !l.isDeduction);
  const deductions = lines.filter((l) => l.isDeduction);
  const List = ({ title, list, tone }: { title: string; list: typeof lines; tone: string }) => (
    <div>
      <p className={`mb-1 text-xs font-bold uppercase tracking-wide ${tone}`}>{title}</p>
      <ul className="space-y-1 text-sm">{list.map((l) => <li key={l.id} className="flex justify-between gap-3"><span className="text-slate-700">{l.description}</span><span className="font-semibold text-slate-900">{brl(l.amount)}</span></li>)}{!list.length && <li className="text-slate-400">Nada neste grupo.</li>}</ul>
    </div>
  );
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <List title="Proventos" list={earnings} tone="text-emerald-700" />
      <List title="Descontos" list={deductions} tone="text-rose-700" />
      {item.observations && <p className="text-xs text-slate-600 md:col-span-2"><strong>Observações:</strong> {item.observations}</p>}
      {item.cancelReason && <p className="text-xs text-rose-700 md:col-span-2"><strong>Motivo do cancelamento:</strong> {item.cancelReason}</p>}
    </div>
  );
}

function PeriodFields({ from, to, setFrom, setTo }: { from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void }) {
  const quick = useMemo(presets, []);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <label className="form-group"><span>Início do ciclo *</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-v2" required /></label>
        <label className="form-group"><span>Fim do ciclo *</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="input-v2" required /></label>
      </div>
      <div className="flex flex-wrap gap-1.5">{quick.map((p) => <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">{p.label}</button>)}</div>
      <p className="text-xs text-slate-500">Em ciclo que não é o mês cheio, o salário é proporcional aos dias úteis. Faltas, suspensão e horas extras aprovadas do período entram no cálculo.</p>
    </div>
  );
}

function CreateModal({ initialFrom, initialTo, onClose, onDone }: { initialFrom: string; initialTo: string; onClose: () => void; onDone: () => void }) {
  const employeesQuery = useQuery(() => api.employees.list(), []);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const all = ((employeesQuery.data as Employee[] | undefined) ?? []).filter((e) => e.status !== 'TERMINATED');
  const shown = all.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selected.length) return setError('Escolha pelo menos um funcionário.');
    if (!from || !to || to < from) return setError('O fim do ciclo precisa ser igual ou depois do início.');
    setSaving(true);
    try {
      const result = await payrollApi.create({ employeeIds: selected, periodStart: from, periodEnd: to, observations: observations.trim() || undefined });
      if (result.failed.length) toast.warning(`${result.created.length} folha(s) criada(s). Não criadas: ${result.failed.map((f) => `${f.name} (${f.message})`).join(' | ')}`, { duration: 12000 });
      else toast.success(`${result.created.length} folha(s) calculada(s).`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível calcular a folha.');
    } finally { setSaving(false); }
  }

  return (
    <Modal isOpen onClose={() => { if (!saving) onClose(); }} title="Nova folha" description="Defina o ciclo e escolha quem entra na folha." maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <PeriodFields from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <div>
          <div className="mb-1 flex items-center justify-between"><span className="text-sm font-semibold">Funcionários * ({selected.length} escolhido(s))</span>
            <button type="button" className="text-xs font-semibold text-violet-700 underline" onClick={() => setSelected(selected.length === shown.length ? [] : shown.map((x) => x.id))}>{selected.length === shown.length && shown.length ? 'Limpar' : 'Selecionar todos'}</button></div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar funcionário" className="input-v2 mb-2" />
          <ul className="max-h-56 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200">
            {employeesQuery.loading && <li className="p-3 text-sm text-slate-500">Carregando funcionários...</li>}
            {employeesQuery.error && <li className="p-3 text-sm text-rose-700">{employeesQuery.error}</li>}
            {shown.map((emp) => (
              <li key={emp.id}><label className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-slate-50"><input type="checkbox" checked={selected.includes(emp.id)} onChange={() => toggle(emp.id)} />
                <span className="flex-1">{emp.name}<span className="block text-xs text-slate-500">{emp.position ?? 'sem cargo'}</span></span>
                {!(Number(emp.salary) > 0) && <span className="text-[11px] font-semibold text-amber-700">sem salário</span>}</label></li>
            ))}
            {!employeesQuery.loading && !shown.length && <li className="p-3 text-sm text-slate-500">Nenhum funcionário encontrado.</li>}
          </ul>
        </div>
        <label className="form-group"><span>Observações</span><input value={observations} onChange={(e) => setObservations(e.target.value)} maxLength={500} className="input-v2" /></label>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Calculando...' : <><Calculator size={14} /> Calcular</>}</Button>
        </div>
      </form>
    </Modal>
  );
}

function EditModal({ item, onClose, onDone }: { item: PayrollItem; onClose: () => void; onDone: () => void }) {
  const initial: ManualItemInput[] = (item.items ?? [])
    .filter((l) => (MANUAL_TYPES as string[]).includes(l.type) && !l.description.startsWith('DSR'))
    .map((l) => ({ type: l.type as ManualItemType, description: l.description, amount: Number(l.amount ?? 0) }));
  const [from, setFrom] = useState((item.periodStart ?? '').slice(0, 10));
  const [to, setTo] = useState((item.periodEnd ?? '').slice(0, 10));
  const [observations, setObservations] = useState(item.observations ?? '');
  const [lines, setLines] = useState<ManualItemInput[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLine = (i: number, patch: Partial<ManualItemInput>) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!from || !to || to < from) return setError('O fim do ciclo precisa ser igual ou depois do início.');
    const bad = lines.find((l) => l.description.trim().length < 2 || !(Number(l.amount) > 0));
    if (bad) return setError('Cada lançamento precisa de descrição e valor maior que zero.');
    setSaving(true);
    try {
      await payrollApi.update(item.id, { periodStart: from, periodEnd: to, observations, items: lines.map((l) => ({ ...l, description: l.description.trim(), amount: Number(l.amount) })) });
      toast.success('Folha atualizada e recalculada.');
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar a folha.');
    } finally { setSaving(false); }
  }

  return (
    <Modal isOpen onClose={() => { if (!saving) onClose(); }} title={`Editar folha de ${item.employee?.name ?? 'funcionário'}`} description="Altere o ciclo e os lançamentos. Os valores são recalculados ao salvar." maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        <PeriodFields from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold">Lançamentos (bônus, comissão, adiantamento...)</span>
            <button type="button" className="text-xs font-semibold text-violet-700 underline" onClick={() => setLines((l) => [...l, { type: 'BONUS', description: '', amount: 0 }])}>+ Adicionar</button></div>
          {!lines.length && <p className="text-xs text-slate-500">Nenhum lançamento manual.</p>}
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.4fr_90px_auto] items-center gap-2">
              <select value={line.type} onChange={(e) => setLine(i, { type: e.target.value as ManualItemType })} className="input-v2">{MANUAL_TYPES.map((t) => <option key={t} value={t}>{MANUAL_ITEM_LABEL[t]}</option>)}</select>
              <input value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Descrição" className="input-v2" />
              <input inputMode="decimal" value={line.amount || ''} onChange={(e) => setLine(i, { amount: Number(e.target.value.replace(',', '.')) || 0 })} placeholder="R$" className="input-v2" />
              <button type="button" aria-label="Remover lançamento" onClick={() => setLines((l) => l.filter((_, idx) => idx !== i))} className="text-rose-600"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
        <label className="form-group"><span>Observações</span><input value={observations} onChange={(e) => setObservations(e.target.value)} maxLength={500} className="input-v2" /></label>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar e recalcular'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CancelModal({ item, onClose, onDone }: { item: PayrollItem; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) return setError('Explique o motivo (mínimo 5 letras).');
    setSaving(true); setError(null);
    try { await payrollApi.cancel(item.id, reason.trim()); toast.success('Folha cancelada.'); onDone(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar a folha.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal isOpen onClose={() => { if (!saving) onClose(); }} title="Cancelar folha" description={`${item.employee?.name ?? 'Funcionário'} · ${br(item.periodStart)} a ${br(item.periodEnd)}`}>
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">A folha cancelada fica no histórico com o motivo, deixa de entrar nos totais e libera o período para um novo cálculo.</p>
        <label className="form-group"><span>Motivo *</span><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} className="input-v2" autoFocus /></label>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button variant="primary" type="submit" disabled={saving}>{saving ? 'Cancelando...' : 'Cancelar folha'}</Button>
        </div>
      </form>
    </Modal>
  );
}
