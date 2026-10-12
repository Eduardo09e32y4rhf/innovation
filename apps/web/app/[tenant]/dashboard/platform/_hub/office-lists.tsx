'use client';

import { BellRing, Check, Plus, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { date, errorText, money, monthLabel } from './format';
import { DEPARTMENTS, DEPARTMENT_LABEL, DOC_TYPES, office, type OfficeClientRow, type OfficeTask, type TeamMember } from './office-api';

const input = 'input-v2 w-full text-base sm:text-sm';
const PRIORITY: Record<string, [string, string]> = { HIGH: ['Alta', 'bg-rose-100 text-rose-800'], NORMAL: ['Normal', 'bg-slate-100 text-slate-700'], LOW: ['Baixa', 'bg-sky-100 text-sky-800'] };
const nameOf = (clients: OfficeClientRow[], id: string | null) => (id ? clients.find((c) => c.id === id)?.name ?? 'Cliente' : 'Geral do escritório');

// ---------- tarefas ----------

function TaskDialog({ clients, team, onClose, onDone }: { clients: OfficeClientRow[]; team: TeamMember[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', companyId: '', department: 'DP', priority: 'NORMAL', dueDate: '', assigneeId: '' });
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await office.createTask({ title: form.title.trim(), department: form.department, priority: form.priority, ...(form.description.trim() ? { description: form.description.trim() } : {}), ...(form.companyId ? { companyId: form.companyId } : {}), ...(form.dueDate ? { dueDate: form.dueDate } : {}), ...(form.assigneeId ? { assigneeId: form.assigneeId } : {}) });
      toast.success('Tarefa criada.'); onDone(); onClose();
    } catch (cause) { toast.error(errorText(cause, 'Não foi possível criar.')); } finally { setBusy(false); }
  }
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title="Nova tarefa" maxWidth="max-w-xl">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">Título<input className={input} value={form.title} maxLength={160} required onChange={(e) => set('title', e.target.value)} /></label>
        <label className="space-y-1 text-xs font-semibold">Cliente<select className={input} value={form.companyId} onChange={(e) => set('companyId', e.target.value)}><option value="">Geral do escritório</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold">Departamento<select className={input} value={form.department} onChange={(e) => set('department', e.target.value)}>{DEPARTMENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold">Responsável<select className={input} value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}><option value="">Sem responsável</option>{team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label className="space-y-1 text-xs font-semibold">Prazo<input type="date" className={input} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></label>
        <label className="space-y-1 text-xs font-semibold">Prioridade<select className={input} value={form.priority} onChange={(e) => set('priority', e.target.value)}><option value="HIGH">Alta</option><option value="NORMAL">Normal</option><option value="LOW">Baixa</option></select></label>
        <label className="space-y-1 text-xs font-semibold sm:col-span-2">Detalhes<textarea className={`${input} min-h-20`} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={form.title.trim().length < 2}>Criar tarefa</Button></div>
      </form>
    </Modal>
  );
}

export function TasksView({ clients, team, refreshPanel }: { clients: OfficeClientRow[]; team: TeamMember[]; refreshPanel: () => void }) {
  const [filter, setFilter] = useState<'OPEN' | 'DONE'>('OPEN');
  const [creating, setCreating] = useState(false);
  const query = useQuery(() => office.tasks({ status: filter }), [filter]);
  const reload = () => { query.refetch(); refreshPanel(); };

  async function setStatus(task: OfficeTask, status: OfficeTask['status']) {
    try { await office.updateTask(task.id, { status }); reload(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível atualizar.')); }
  }
  async function remove(task: OfficeTask) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    try { await office.deleteTask(task.id); reload(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível excluir.')); }
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-2xl border border-border bg-bg shadow-sm">
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        {([['OPEN', 'Em aberto'], ['DONE', 'Concluídas']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-9 rounded-full px-4 text-sm font-bold ${filter === id ? 'bg-purple-600 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label}</button>)}
        <Button className="ml-auto" onClick={() => setCreating(true)}><Plus size={15} aria-hidden="true" /> Nova tarefa</Button>
      </header>
      {query.error ? <div className="p-4"><ErrorState message={query.error} onRetry={query.refetch} /></div> : !query.data ? <LoadingState label="Carregando tarefas…" /> : query.data.length === 0 ? <div className="p-4"><EmptyState message={filter === 'OPEN' ? 'Nenhuma tarefa em aberto.' : 'Nenhuma tarefa concluída.'} /></div> : (
        <ul className="divide-y divide-border">
          {query.data.map((task) => {
            const late = task.status !== 'DONE' && task.dueDate && task.dueDate.slice(0, 10) < today;
            const [pLabel, pTone] = PRIORITY[task.priority] ?? PRIORITY.NORMAL;
            return (
              <li key={task.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-bold ${task.status === 'DONE' ? 'text-fg-sub line-through' : 'text-fg'}`}>{task.title}</span>
                  <span className="block text-xs text-fg-sub">{nameOf(clients, task.companyId)} · {DEPARTMENT_LABEL[task.department]}{task.assigneeId ? ` · ${team.find((m) => m.id === task.assigneeId)?.name ?? 'responsável'}` : ''}</span>
                  {task.description && <span className="mt-1 block text-xs text-fg-mut">{task.description}</span>}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pTone}`}>{pLabel}</span>
                {task.dueDate && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${late ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{late ? 'Atrasada · ' : ''}{date(task.dueDate)}</span>}
                {task.status === 'DONE'
                  ? <Button variant="outline" size="sm" onClick={() => setStatus(task, 'OPEN')}><Undo2 size={14} aria-hidden="true" /> Reabrir</Button>
                  : <Button size="sm" onClick={() => setStatus(task, 'DONE')}><Check size={14} aria-hidden="true" /> Concluir</Button>}
                <Button variant="ghost" size="sm" aria-label={`Excluir ${task.title}`} onClick={() => remove(task)}><Trash2 size={14} aria-hidden="true" /></Button>
              </li>
            );
          })}
        </ul>
      )}
      {creating && <TaskDialog clients={clients} team={team} onClose={() => setCreating(false)} onDone={reload} />}
    </section>
  );
}

// ---------- documentos ----------

export function DocsView({ clients, month, refreshPanel }: { clients: OfficeClientRow[]; month: string; refreshPanel: () => void }) {
  const [status, setStatus] = useState<'PENDING' | 'RECEIVED'>('PENDING');
  const query = useQuery(() => office.docs({ month, status }), [month, status]);
  const reload = () => { query.refetch(); refreshPanel(); };
  const typeLabel = Object.fromEntries(DOC_TYPES);

  async function act(id: string, body: Record<string, unknown>, success: string) {
    try { await office.updateDoc(id, body); toast.success(success); reload(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível atualizar.')); }
  }
  async function cancel(id: string) {
    if (!window.confirm('Remover este pedido de documento?')) return;
    try { await office.deleteDoc(id); reload(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível remover.')); }
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-2xl border border-border bg-bg shadow-sm">
      <header className="flex flex-wrap items-center gap-2 border-b border-border p-4">
        {([['PENDING', 'Aguardando o cliente'], ['RECEIVED', 'Recebidos']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={status === id} onClick={() => setStatus(id)} className={`min-h-9 rounded-full px-4 text-sm font-bold ${status === id ? 'bg-purple-600 text-white' : 'border border-border text-fg-sub hover:bg-bg-sub'}`}>{label}</button>)}
        <p className="ml-auto text-xs text-fg-mut">Pedidos de {monthLabel(month)}. Para solicitar, abra o cliente no Painel. O lembrete fica registrado; o envio ao cliente é feito por você (WhatsApp ou e-mail).</p>
      </header>
      {query.error ? <div className="p-4"><ErrorState message={query.error} onRetry={query.refetch} /></div> : !query.data ? <LoadingState label="Carregando documentos…" /> : query.data.length === 0 ? <div className="p-4"><EmptyState message={status === 'PENDING' ? 'Nenhum documento pendente nesta competência.' : 'Nenhum documento recebido ainda.'} /></div> : (
        <ul className="divide-y divide-border">
          {query.data.map((doc) => {
            const late = doc.status === 'PENDING' && doc.dueDate && doc.dueDate.slice(0, 10) < today;
            return (
              <li key={doc.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-fg">{doc.title}</span>
                  <span className="block text-xs text-fg-sub">{nameOf(clients, doc.companyId)} · {typeLabel[doc.docType] ?? doc.docType}</span>
                  {doc.reminderCount > 0 && <span className="block text-[11px] text-fg-mut">{doc.reminderCount} lembrete(s) · último em {date(doc.lastReminderAt)}</span>}
                </span>
                {doc.dueDate && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${late ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'}`}>{late ? 'Atrasado · ' : 'Prazo '}{date(doc.dueDate)}</span>}
                {doc.status === 'PENDING' ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => act(doc.id, { remind: true }, 'Lembrete registrado.')}><BellRing size={14} aria-hidden="true" /> Registrar lembrete</Button>
                    <Button size="sm" onClick={() => act(doc.id, { status: 'RECEIVED' }, 'Documento marcado como recebido.')}><Check size={14} aria-hidden="true" /> Recebi</Button>
                  </>
                ) : <Button variant="outline" size="sm" onClick={() => act(doc.id, { status: 'PENDING' }, 'Voltou para pendente.')}><Undo2 size={14} aria-hidden="true" /> Voltar a pendente</Button>}
                <Button variant="ghost" size="sm" aria-label={`Remover ${doc.title}`} onClick={() => cancel(doc.id)}><Trash2 size={14} aria-hidden="true" /></Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------- honorários ----------

export function FeesView({ clients, month, refreshPanel }: { clients: OfficeClientRow[]; month: string; refreshPanel: () => void }) {
  const query = useQuery(() => office.fees(month), [month]);
  const [busy, setBusy] = useState(false);
  const reload = () => { query.refetch(); refreshPanel(); };
  const withFee = clients.filter((c) => c.monthlyFee > 0).length;

  async function generate() {
    setBusy(true);
    try { const out = await office.generateFees(month); toast.success(out.generated ? `${out.generated} honorário(s) gerado(s).` : 'Todos os honorários do mês já foram gerados.'); reload(); }
    catch (cause) { toast.error(errorText(cause, 'Não foi possível gerar.')); } finally { setBusy(false); }
  }
  async function pay(id: string, paid: boolean) {
    try { await office.payFee(id, paid); reload(); } catch (cause) { toast.error(errorText(cause, 'Não foi possível atualizar.')); }
  }
  const tone: Record<string, string> = { PAID: 'bg-emerald-100 text-emerald-800', OPEN: 'bg-slate-100 text-slate-700', OVERDUE: 'bg-rose-100 text-rose-800' };
  const label: Record<string, string> = { PAID: 'Paga', OPEN: 'A receber', OVERDUE: 'Atrasada' };

  return (
    <section className="rounded-2xl border border-border bg-bg shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <p className="text-sm text-fg-sub">Honorários de <strong className="capitalize text-fg">{monthLabel(month)}</strong>. {withFee} cliente(s) com valor definido (cadastre no cliente, aba Cadastro e honorário).</p>
        <Button className="ml-auto" isLoading={busy} disabled={withFee === 0} onClick={generate}><Plus size={15} aria-hidden="true" /> Gerar honorários do mês</Button>
      </header>
      {query.error ? <div className="p-4"><ErrorState message={query.error} onRetry={query.refetch} /></div> : !query.data ? <LoadingState label="Carregando honorários…" /> : query.data.length === 0 ? <div className="p-4"><EmptyState message="Nenhum honorário gerado neste mês." /></div> : (
        <ul className="divide-y divide-border">
          {query.data.map((fee) => (
            <li key={fee.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-fg">{nameOf(clients, fee.companyId)}</span><span className="block text-xs text-fg-sub">Vence em {date(fee.dueDate)}{fee.paidAt ? ` · pago em ${date(fee.paidAt)}` : ''}</span></span>
              <span className="text-sm font-black tabular-nums">{money(fee.amount)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${tone[fee.status]}`}>{label[fee.status]}</span>
              {fee.status === 'PAID' ? <Button variant="outline" size="sm" onClick={() => pay(fee.id, false)}><Undo2 size={14} aria-hidden="true" /> Desfazer</Button> : <Button size="sm" onClick={() => pay(fee.id, true)}><Check size={14} aria-hidden="true" /> Marcar como paga</Button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
