'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, FileQuestion, ListChecks, Search, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { date, errorText, money, monthLabel } from './format';
import { DEPARTMENT_LABEL, REGIMES, REGIME_LABEL, DOC_TYPES, office, type OfficeClientRow, type OfficeDashboard, type TeamMember } from './office-api';

const input = 'input-v2 w-full text-base sm:text-sm';
const FEE_TONE: Record<string, string> = { PAID: 'bg-emerald-100 text-emerald-800', OPEN: 'bg-slate-100 text-slate-700', OVERDUE: 'bg-rose-100 text-rose-800' };
const FEE_LABEL: Record<string, string> = { PAID: 'Paga', OPEN: 'A receber', OVERDUE: 'Atrasada' };

function Kpi({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: 'good' | 'warn' | 'bad' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-rose-600' : 'text-fg';
  return (
    <article className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-fg-sub">{icon}{label}</p>
      <p className={`mt-1 truncate text-xl font-black tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-fg-mut">{hint}</p>}
    </article>
  );
}

/** Calendário de obrigações do mês, com alerta por proximidade do prazo. */
function Calendar({ data }: { data: OfficeDashboard }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section aria-label="Calendário de obrigações" className="rounded-2xl border border-border bg-bg p-4 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-fg"><CalendarClock size={15} aria-hidden="true" /> Calendário de obrigações · {monthLabel(data.period.key)}</h2>
      <p className="mb-3 text-[11px] text-fg-mut">Prazos gerais de referência (vencimento em dia não útil antecipa para o dia útil anterior). Confirme no calendário oficial e considere feriados locais.</p>
      {data.obligations.length === 0 ? <p className="text-sm text-fg-sub">Nenhuma obrigação neste mês.</p> : (
        <ul className="divide-y divide-border">
          {data.obligations.map((item) => {
            const days = Math.ceil((new Date(`${item.date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
            const tone = days < 0 ? 'bg-slate-100 text-slate-500' : days <= 3 ? 'bg-rose-100 text-rose-800' : days <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800';
            return (
              <li key={`${item.key}-${item.date}`} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className={`w-24 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-bold ${tone}`}>{date(item.date)}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-fg">{item.label}</span><span className="block text-[11px] text-fg-mut">{DEPARTMENT_LABEL[item.department]} · competência {item.competencia}{item.note ? ` · ${item.note}` : ''}</span></span>
                <span className="text-xs text-fg-sub">{item.clients} cliente(s)</span>
                <span className="w-24 text-right text-xs font-semibold text-fg-sub">{days < 0 ? 'Vencida' : days === 0 ? 'Hoje' : `em ${days} dia(s)`}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Movements({ companyId, month }: { companyId: string; month: string }) {
  const query = useQuery(() => office.checklist(companyId, month), [companyId, month]);
  const [busy, setBusy] = useState('');
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <LoadingState label="Carregando checklist…" />;
  const { items, movements } = query.data;
  const done = items.filter((i) => i.done).length;

  async function toggle(itemKey: string, value: boolean) {
    setBusy(itemKey);
    try { await office.toggleChecklist(companyId, { month, itemKey, done: value }); query.refetch(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível salvar.')); }
    finally { setBusy(''); }
  }
  const groups: Array<[string, Array<{ id: string; label: string }>]> = [
    ['Admissões no mês', movements.admissions.map((m) => ({ id: m.id, label: `${m.name} · ${date(m.date)}` }))],
    ['Desligamentos no mês', movements.terminations.map((m) => ({ id: m.id, label: `${m.name} · ${date(m.date)}` }))],
    ['Férias no mês', movements.vacations.map((m) => ({ id: m.id, label: `${m.name} · ${date(m.start)} a ${date(m.end)}` }))],
    ['ASO vencido ou a vencer (30 dias)', movements.asoDue.map((m) => ({ id: m.id, label: `${m.name} · ${date(m.date)}` }))],
  ];
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 flex items-center justify-between text-sm font-bold text-fg"><span className="flex items-center gap-1.5"><ListChecks size={15} aria-hidden="true" /> Checklist de {monthLabel(month)}</span><span className="text-xs font-semibold text-fg-sub">{done}/{items.length}</span></h3>
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.key} className="flex items-start gap-3 rounded-xl border border-border bg-bg p-2.5">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={item.done} disabled={item.auto || busy === item.key} onChange={(e) => void toggle(item.key, e.target.checked)} aria-label={item.label} />
              <span className="min-w-0 flex-1"><span className={`block text-sm ${item.done ? 'text-fg-sub line-through' : 'font-semibold text-fg'}`}>{item.label}</span><span className="block text-[11px] text-fg-mut">{DEPARTMENT_LABEL[item.department]}{item.auto ? ` · automático${item.hint ? `: ${item.hint}` : ''}` : ''}</span></span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-2 text-sm font-bold text-fg">Movimentos do DP para lançar</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map(([title, rows]) => (
            <div key={title} className="rounded-xl bg-bg-sub p-3">
              <p className="text-xs font-bold text-fg-sub">{title} · {rows.length}</p>
              {rows.length === 0 ? <p className="mt-1 text-xs text-fg-mut">Nada neste mês.</p> : <ul className="mt-1 space-y-0.5 text-xs text-fg">{rows.slice(0, 8).map((r) => <li key={r.id} className="truncate">{r.label}</li>)}{rows.length > 8 && <li className="text-fg-mut">+ {rows.length - 8}</li>}</ul>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Settings({ companyId, team, onDone }: { companyId: string; team: TeamMember[]; onDone: () => void }) {
  const query = useQuery(() => office.client(companyId), [companyId]);
  const [form, setForm] = useState<{ taxRegime: string; responsibleId: string; monthlyFee: string; feeDueDay: string; notes: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;
  if (!query.data) return <LoadingState label="Carregando cadastro…" />;
  const current = form ?? { taxRegime: query.data.client.taxRegime, responsibleId: query.data.client.responsibleId ?? '', monthlyFee: String(query.data.client.monthlyFee || ''), feeDueDay: String(query.data.client.feeDueDay), notes: query.data.client.notes ?? '' };
  const set = (key: keyof typeof current, value: string) => setForm({ ...current, [key]: value });

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await office.saveClient(companyId, { taxRegime: current.taxRegime, ...(current.responsibleId ? { responsibleId: current.responsibleId } : {}), monthlyFee: Number(current.monthlyFee || 0), feeDueDay: Number(current.feeDueDay || 10), notes: current.notes });
      toast.success('Cadastro do cliente salvo.'); onDone();
    } catch (cause) { toast.error(errorText(cause, 'Não foi possível salvar.')); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-xs font-semibold">Regime tributário<select className={input} value={current.taxRegime} onChange={(e) => set('taxRegime', e.target.value)}>{REGIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold">Responsável no escritório<select className={input} value={current.responsibleId} onChange={(e) => set('responsibleId', e.target.value)}><option value="">Sem responsável</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold">Honorário mensal (R$)<input type="number" min="0" step="0.01" className={input} value={current.monthlyFee} onChange={(e) => set('monthlyFee', e.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold">Dia de vencimento (1 a 28)<input type="number" min="1" max="28" className={input} value={current.feeDueDay} onChange={(e) => set('feeDueDay', e.target.value)} /></label>
      <label className="space-y-1 text-xs font-semibold sm:col-span-2">Observações<textarea className={`${input} min-h-20`} maxLength={2000} value={current.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" isLoading={busy}>Salvar cadastro</Button></div>
    </form>
  );
}

function RequestDocs({ companyId, month, onDone }: { companyId: string; month: string; onDone: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await office.createDocs({ companyId, month, ...(dueDate ? { dueDate } : {}), items: DOC_TYPES.filter(([v]) => picked.includes(v)).map(([docType, title]) => ({ docType, title })) });
      toast.success('Documentos solicitados. Acompanhe na aba Documentos.'); setPicked([]); onDone();
    } catch (cause) { toast.error(errorText(cause, 'Não foi possível solicitar.')); } finally { setBusy(false); }
  }
  return (
    <section className="rounded-xl border border-border p-3">
      <h3 className="mb-2 text-sm font-bold text-fg">Cobrar documentos de {monthLabel(month)}</h3>
      <div className="flex flex-wrap gap-2">
        {DOC_TYPES.map(([v, l]) => <label key={v} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold"><input type="checkbox" checked={picked.includes(v)} onChange={(e) => setPicked(e.target.checked ? [...picked, v] : picked.filter((p) => p !== v))} />{l}</label>)}
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs font-semibold">Prazo para o cliente enviar<input type="date" className={input} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        <Button isLoading={busy} disabled={picked.length === 0} onClick={send}>Solicitar</Button>
      </div>
    </section>
  );
}

function ClientDialog({ client, month, team, onClose, onDone }: { client: OfficeClientRow; month: string; team: TeamMember[]; onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<'rotina' | 'docs' | 'cadastro'>('rotina');
  return (
    <Modal isOpen onClose={onClose} title={client.name} description={`${client.document ?? 'Sem CNPJ'} · ${REGIME_LABEL[client.regime] ?? client.regime}`} maxWidth="max-w-3xl">
      <div role="tablist" className="mb-4 flex flex-wrap gap-1.5">
        {([['rotina', 'Rotina do mês'], ['docs', 'Documentos'], ['cadastro', 'Cadastro e honorário']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`min-h-9 rounded-full px-4 text-sm font-bold ${tab === id ? 'bg-slate-900 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label}</button>)}
      </div>
      {tab === 'rotina' && <Movements companyId={client.id} month={month} />}
      {tab === 'docs' && <RequestDocs companyId={client.id} month={month} onDone={onDone} />}
      {tab === 'cadastro' && <Settings companyId={client.id} team={team} onDone={onDone} />}
    </Modal>
  );
}

/** Painel do escritório: o que está em dia, o que está pendente e o que vence, por cliente. */
export function OfficePanel({ data, month, team, refetch }: { data: OfficeDashboard; month: string; team: TeamMember[]; refetch: () => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'pendentes' | 'docs' | 'honorario'>('todos');
  const [open, setOpen] = useState<OfficeClientRow | null>(null);
  const t = data.totals;
  const rows = useMemo(() => data.clients.filter((c) => {
    if (filter === 'pendentes' && c.checklistDone >= c.checklistTotal) return false;
    if (filter === 'docs' && c.docsPending === 0) return false;
    if (filter === 'honorario' && c.feeStatus !== 'OVERDUE') return false;
    const q = search.trim().toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.document ?? '').includes(q);
  }), [data.clients, filter, search]);
  const counts = { todos: data.clients.length, pendentes: data.clients.filter((c) => c.checklistDone < c.checklistTotal).length, docs: data.clients.filter((c) => c.docsPending > 0).length, honorario: data.clients.filter((c) => c.feeStatus === 'OVERDUE').length };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<CheckCircle2 size={13} aria-hidden="true" />} label="Clientes com rotina completa" value={`${t.checklistComplete} / ${t.clients}`} tone={t.checklistComplete === t.clients && t.clients > 0 ? 'good' : 'warn'} />
        <Kpi icon={<FileQuestion size={13} aria-hidden="true" />} label="Documentos pendentes" value={String(t.docsPending)} tone={t.docsPending ? 'warn' : 'good'} />
        <Kpi icon={<AlertTriangle size={13} aria-hidden="true" />} label="Tarefas em aberto" value={String(t.tasksOpen)} />
        <Kpi icon={<Wallet size={13} aria-hidden="true" />} label="Honorários a receber" value={money(t.feeOpen)} hint={t.feeOverdue ? `${t.feeOverdue} atrasado(s) · recebido ${money(t.feePaid)}` : `recebido ${money(t.feePaid)}`} tone={t.feeOverdue ? 'bad' : undefined} />
      </div>
      <Calendar data={data} />
      <section aria-label="Clientes" className="rounded-2xl border border-border bg-bg shadow-sm">
        <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-3 text-fg-sub" aria-hidden="true" />
            <input className="input-v2 !rounded-full !pl-10 w-full text-sm" placeholder="Buscar cliente ou CNPJ" aria-label="Buscar cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {([['todos', 'Todos'], ['pendentes', 'Rotina incompleta'], ['docs', 'Faltam documentos'], ['honorario', 'Honorário atrasado']] as const).map(([id, label]) => (
            <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-9 rounded-full px-3.5 text-xs font-bold ${filter === id ? 'bg-slate-900 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label} · {counts[id]}</button>
          ))}
        </header>
        {rows.length === 0 ? <p className="p-6 text-center text-sm text-fg-sub">Nenhum cliente para este filtro.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">Clientes do escritório</caption>
              <thead className="border-b border-border bg-bg-sub text-xs text-fg-sub"><tr>{['Cliente', 'Regime', 'Rotina do mês', 'Ponto / Folha', 'Documentos', 'Tarefas', 'Honorário'].map((l) => <th key={l} scope="col" className="px-4 py-2.5 font-semibold">{l}</th>)}</tr></thead>
              <tbody>
                {rows.map((c) => {
                  const pct = Math.round((c.checklistDone / c.checklistTotal) * 100);
                  return (
                    <tr key={c.id} tabIndex={0} className="cursor-pointer border-b border-border last:border-0 hover:bg-bg-sub focus:bg-bg-sub focus:outline-none" onClick={() => setOpen(c)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(c); }}>
                      <th scope="row" className="px-4 py-3 text-left"><span className="block font-bold text-fg">{c.name}</span><span className="block text-xs font-normal text-fg-sub">{c.document ?? 'Sem CNPJ'}</span></th>
                      <td className="px-4 py-3 text-xs">{REGIME_LABEL[c.regime] ?? c.regime}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Rotina de ${c.name}`}><div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} /></div><span className="text-xs tabular-nums text-fg-sub">{c.checklistDone}/{c.checklistTotal}</span></div></td>
                      <td className="px-4 py-3 text-xs">{c.closingsTotal + c.payrollsTotal === 0 ? <span className="text-fg-mut">sem lançamentos</span> : (c.closingsPending + c.payrollsPending > 0 ? <span className="font-semibold text-amber-700">{c.closingsPending + c.payrollsPending} pendente(s)</span> : <span className="font-semibold text-emerald-700">aprovados</span>)}</td>
                      <td className="px-4 py-3 text-xs">{c.docsTotal === 0 ? <span className="text-fg-mut">nenhum pedido</span> : c.docsPending > 0 ? <span className="font-semibold text-amber-700">{c.docsPending} de {c.docsTotal} faltando</span> : <span className="font-semibold text-emerald-700">todos recebidos</span>}</td>
                      <td className="px-4 py-3 text-xs tabular-nums">{c.tasksOpen || '—'}</td>
                      <td className="px-4 py-3">{c.feeStatus ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${FEE_TONE[c.feeStatus]}`}>{FEE_LABEL[c.feeStatus]} · {money(c.feeAmount)}</span> : <span className="text-xs text-fg-mut">{c.monthlyFee > 0 ? 'não gerado' : 'sem valor'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open && <ClientDialog client={open} month={month} team={team} onClose={() => setOpen(null)} onDone={refetch} />}
    </div>
  );
}
