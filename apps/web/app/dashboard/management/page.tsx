'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CalendarDays, Check, Clock3, XCircle, FileText, FileCheck2, Bell, AlertTriangle, Gavel, Plus, Search, RefreshCcw, Upload, Download, Eye, EyeOff, MessageSquare, Send } from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api, type Employee, type ManagementEvent, type EmployeeAsoRecord } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

type ManagementTab = 'agenda' | 'aso' | 'notifications' | 'rules' | 'closing';
type Tab = ManagementTab;
type EventType = 'REUNIAO' | 'CHAMADA' | 'TAREFA_INTERNA' | 'PRAZO_ADMINISTRATIVO' | 'RETORNO_COLABORADOR' | 'DOCUMENTO_PENDENTE' | 'OUTROS';
type EventStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
type EventPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'CHAMADA', label: 'Ligação' },
  { value: 'TAREFA_INTERNA', label: 'Tarefa interna' },
  { value: 'PRAZO_ADMINISTRATIVO', label: 'Prazo administrativo' },
  { value: 'RETORNO_COLABORADOR', label: 'Retorno ao colaborador' },
  { value: 'DOCUMENTO_PENDENTE', label: 'Documento pendente' },
  { value: 'OUTROS', label: 'Outros' },
];

const EVENT_STATUSES: { value: EventStatus; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Em andamento' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

const EVENT_PRIORITIES: { value: EventPriority; label: string }[] = [
  { value: 'BAIXA', label: 'Baixa' },
  { value: 'MEDIA', label: 'Média' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'URGENTE', label: 'Urgente' },
];

const ASO_TYPES: { value: string; label: string }[] = [
  { value: 'ADMISSIONAL', label: 'Admissional' },
  { value: 'DEMISSIONAL', label: 'Demissional' },
  { value: 'PERIODICO', label: 'Periódico / Rotina' },
  { value: 'RETORNO_TRABALHO', label: 'Retorno ao trabalho' },
  { value: 'MUDANCA_FUNCAO', label: 'Mudança de função' },
  { value: 'OUTROS', label: 'Outros' },
];

const ASO_STATUSES: { value: string; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'REALIZADO', label: 'Realizado' },
  { value: 'APTO', label: 'Apto' },
  { value: 'INAPTO', label: 'Inapto' },
  { value: 'VENCIDO', label: 'Vencido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

function fmtDate(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}

function fmtDateTime(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getAsoAlert(status: string, dueDate?: string | null): { label: string; cls: string } {
  if (!dueDate) return { label: 'Sem data definida', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const today = new Date();
  const exp = new Date(dueDate);
  if (exp < today) return { label: 'Vencido', cls: 'bg-red-50 text-red-700 border-red-200' };
  const diff = (exp.getTime() - today.getTime()) / 86400000;
  if (diff <= 30) return { label: 'Próximo do vencimento', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Válido', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

function getStatusBadge(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    CONCLUIDO: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    APTO: { label: 'Apto', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REALIZADO: { label: 'Realizado', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    EM_ANDAMENTO: { label: 'Em andamento', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    CANCELADO: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    AGENDADO: { label: 'Agendado', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    PENDENTE: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    VENCIDO: { label: 'Vencido', cls: 'bg-red-50 text-red-700 border-red-200' },
    INAPTO: { label: 'Inapto', cls: 'bg-red-50 text-red-700 border-red-200' },
    SENT: { label: 'Enviada', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    READ: { label: 'Lida', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    UNREAD: { label: 'Não lida', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    PENDING_RESPONSE: { label: 'Pendente resposta', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    ACKNOWLEDGED: { label: 'Ciente', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ACCEPTED: { label: 'Aceita', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REFUSED_ACKNOWLEDGMENT: { label: 'Recusada', cls: 'bg-red-50 text-red-700 border-red-200' },
    DRAFT: { label: 'Rascunho', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };
  return map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export default function ManagementPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const canView = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';

  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('tab') as ManagementTab | null;
  const [tab, setTab] = useState<Tab>(current && ['agenda','aso','notifications','rules','closing'].includes(current) ? current : 'agenda');

  function navigate(next: ManagementTab) {
    router.push('/dashboard/management?tab=' + next);
    setTab(next);
  }

  const [eventForm, setEventForm] = useState<{ open: boolean; edit?: ManagementEvent }>({ open: false });
  const [asoForm, setAsoForm] = useState<{ open: boolean; edit?: EmployeeAsoRecord }>({ open: false });

  const kanbanQuery = useQuery(() => api.management.events.kanban(), [], { enabled: canView });
  const asoQuery = useQuery(() => api.management.aso.list(), [], { enabled: canView });
  const employeesQuery = useQuery(() => api.employees.list(), [], { enabled: canView });

  const eventsMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.events.update(input.id, input.data);
    return api.management.events.create(input.data);
  }, { onSuccess: () => { kanbanQuery.refetch(); } });
  const deleteEventMut = useMutation((id: string) => api.management.events.delete(id), { onSuccess: () => kanbanQuery.refetch() });
  const asoMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.aso.update(input.id, input.data);
    return api.management.aso.create(input.data);
  }, { onSuccess: () => asoQuery.refetch() });
  const deleteAsoMut = useMutation((id: string) => api.management.aso.delete(id), { onSuccess: () => asoQuery.refetch() });

  const columns = (kanbanQuery.data as any) ?? { OVERDUE: [], TODAY: [], THIS_WEEK: [], UPCOMING: [], COMPLETED: [] };
  const asos = useMemo(() => (asoQuery.data as EmployeeAsoRecord[] | undefined) ?? [], [asoQuery.data]);
  const employees = useMemo(() => (employeesQuery.data as Employee[] | undefined) ?? [], [employeesQuery.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">GESTÃO</p>
        <h2 className="text-2xl font-black text-slate-950">Gestão de pessoas e jornada</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Controle compromissos, exames ocupacionais e pendências administrativas dos colaboradores.</p>
      </header>

      <div className="flex gap-1 rounded-[8px] bg-slate-100 p-1 flex-wrap">
        <button onClick={() => navigate('agenda')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'agenda' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Agenda</button>
        <button onClick={() => navigate('aso')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'aso' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>ASO</button>
        <button onClick={() => navigate('notifications')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'notifications' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Notificações</button>
        <button onClick={() => navigate('rules')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'rules' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Regras</button>
        <button onClick={() => navigate('closing')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'closing' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Fechamento</button>
      </div>

      {tab === 'agenda' && (kanbanQuery.loading && !kanbanQuery.data ? <LoadingState label="Carregando..." /> :
        kanbanQuery.error && !kanbanQuery.data ? <ErrorState message={kanbanQuery.error} onRetry={kanbanQuery.refetch} /> :
        <AgendaKanban
          columns={columns}
          employees={employees}
          canManage={canManage}
          onOpenForm={(edit) => setEventForm({ open: true, edit })}
          onSave={(data, id) => eventsMut.mutate({ id, data }).catch(() => {})}
          onDelete={(id) => deleteEventMut.mutate(id).catch(() => {})}
          saving={eventsMut.loading}
        />)}
      {tab === 'aso' && (asoQuery.loading && !asoQuery.data ? <LoadingState label="Carregando..." /> :
        asoQuery.error && !asoQuery.data ? <ErrorState message={asoQuery.error} onRetry={asoQuery.refetch} /> :
        <AsoTab
          records={asos}
          employees={employees}
          canManage={canManage}
          onOpenForm={(edit) => setAsoForm({ open: true, edit })}
          onSave={(data, id) => asoMut.mutate({ id, data }).catch(() => {})}
          onDelete={(id) => deleteAsoMut.mutate(id).catch(() => {})}
          saving={asoMut.loading}
        />)}
      {tab === 'notifications' && <NotificationsTab canManage={canManage} />}
      {tab === 'rules' && <RulesTab canManage={canManage} />}
      {tab === 'closing' && <ClosingTab canManage={canManage} />}

      {eventForm.open && <EventModal
        event={eventForm.edit}
        employees={employees}
        onClose={() => setEventForm({ open: false })}
        onSave={(data) => eventsMut.mutate({ id: eventForm.edit?.id, data }).catch(() => {})}
        saving={eventsMut.loading}
      />}
      {asoForm.open && <AsoModal
        record={asoForm.edit}
        employees={employees}
        onClose={() => setAsoForm({ open: false })}
        onSave={(data) => asoMut.mutate({ id: asoForm.edit?.id, data }).catch(() => {})}
        saving={asoMut.loading}
      />}
    </div>
  );
}

type ColumnKey = 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'COMPLETED';

// ─── AGENDA ────────────────────────────────────────────────────────────────────

function AgendaKanban({ columns, employees, canManage, onOpenForm, onSave, onDelete, saving }: {
  columns: Record<ColumnKey, ManagementEvent[]>; employees: Employee[]; canManage: boolean;
  onOpenForm: (edit?: ManagementEvent) => void; onSave: (data: any, id?: string) => void;
  onDelete: (id: string) => void; saving: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEmp, setFilterEmp] = useState('');

  const colOrder: ColumnKey[] = ['OVERDUE', 'TODAY', 'THIS_WEEK', 'UPCOMING', 'COMPLETED'];
  const colLabels: Record<ColumnKey, string> = {
    OVERDUE: 'Atrasados',
    TODAY: 'Hoje',
    THIS_WEEK: 'Esta semana',
    UPCOMING: 'Próximos',
    COMPLETED: 'Concluídos',
  };

  const empName = (id?: string | null) => employees.find(e => e.id === id)?.name ?? '---';

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVO COMPROMISSO</button>
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS STATUS</option>{EVENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS TIPOS</option>{EVENT_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS FUNCIONÁRIOS</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {colOrder.map((key) => {
          const items = (columns[key] ?? []).filter((ev: any) => {
            if (filterStatus && ev.status !== filterStatus) return false;
            if (filterType && ev.eventType !== filterType) return false;
            if (filterEmp && ev.employeeId !== filterEmp) return false;
            return true;
          });
          return (
            <div key={key} className="min-h-[180px] rounded-[12px] border border-slate-200 bg-slate-50/60 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">{colLabels[key]}</p>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && <p className="px-1 py-3 text-center text-[11px] font-semibold text-slate-400">Nenhum</p>}
                {items.map((ev: any) => (
                  <div key={ev.id} className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-black text-slate-950">{ev.title}</p>
                      <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${getStatusBadge(ev.status).cls}`}>{getStatusBadge(ev.status).label}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold text-slate-700">{fmtDateTime(ev.startDateTime)}</p>
                    <div className="mt-2 space-y-1 text-[11px] font-semibold text-slate-600">
                      <p>Funcionário: {empName(ev.employeeId)}</p>
                      <p>Tipo: {ev.eventType}</p>
                      <p>Prioridade: {ev.priority}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button onClick={() => onOpenForm(ev)} disabled={saving} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Editar</button>
                      {ev.status !== 'CONCLUIDO' && canManage && (
                        <button onClick={() => onSave({ status: 'CONCLUIDO' }, ev.id)} disabled={saving} className="inline-flex h-7 items-center gap-1 rounded-[5px] bg-gradient-to-r from-emerald-500 to-teal-600 px-2 text-[10px] font-black text-white"><Check size={12}/> Concluir</button>
                      )}
                      {canManage && <button onClick={() => { if (window.confirm('Excluir?')) onDelete(ev.id); }} disabled={saving} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[10px] font-black text-white"><XCircle size={12}/></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── ASO ───────────────────────────────────────────────────────────────────────

function AsoTab({ records, employees, canManage, onOpenForm, onSave, onDelete, saving }: {
  records: EmployeeAsoRecord[]; employees: Employee[]; canManage: boolean;
  onOpenForm: (edit?: EmployeeAsoRecord) => void; onSave: (data: any, id?: string) => void;
  onDelete: (id: string) => void; saving: boolean;
}) {
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const filtered = useMemo(() => records.filter(r => {
    if (filterType && r.asoType !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterEmp && r.employeeId !== filterEmp) return false;
    return true;
  }).toSorted((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  }), [records, filterType, filterStatus, filterEmp]);

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '---';

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">CONTROLE DE ASO</h3>
          <p className="mt-1 text-xs text-slate-500">Atestados de saúde ocupacional dos colaboradores.</p>
        </div>
        {canManage && <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVO ASO</button>}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS TIPOS</option>{ASO_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS STATUS</option>{ASO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS FUNCIONÁRIOS</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
              <th className="px-3 py-2 border-b border-slate-200">FUNCIONÁRIO</th>
              <th className="px-3 py-2 border-b border-slate-200">TIPO</th>
              <th className="px-3 py-2 border-b border-slate-200">Exame</th>
              <th className="px-3 py-2 border-b border-slate-200">Vencimento</th>
              <th className="px-3 py-2 border-b border-slate-200">Status</th>
              <th className="px-3 py-2 border-b border-slate-200">Clínica</th>
              <th className="px-3 py-2 border-b border-slate-200">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-500">Nenhum registro encontrado.</td></tr> :
              filtered.map(r => {
                const alert = getAsoAlert(r.status, r.dueDate);
                return (
                  <tr key={r.id} className="border-t border-slate-100 text-[11px] font-semibold hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-950">{empName(r.employeeId)}</td>
                    <td className="px-3 py-2 text-slate-600">{r.asoType}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.examDate)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.dueDate)}</td>
                    <td className="px-3 py-2"><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${alert.cls}`}>{alert.label}</span></td>
                    <td className="px-3 py-2 text-slate-600">{r.clinicName ?? '---'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => onOpenForm(r)} disabled={saving} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Editar</button>
                        {canManage && <button onClick={() => onSave({ status: 'CANCELADO' }, r.id)} disabled={saving} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-amber-500 to-orange-600 px-2 text-[10px] font-black text-white"><XCircle size={12}/></button>}
                        {canManage && <button onClick={() => { if (window.confirm('Excluir?')) onDelete(r.id); }} disabled={saving} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[10px] font-black text-white">X</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

function NotificationsTab({ canManage }: { canManage: boolean }) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const listQuery = useQuery(() => api.notifications.list(), []);
  const respondMut = useMutation(({ id, action, reason }: { id: string; action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE'; reason?: string }) =>
    api.notifications.respond(id, action, reason), { onSuccess: () => listQuery.refetch() });

  const notifications = (listQuery.data as any[] | undefined) ?? [];

  const filtered = useMemo(() => notifications.filter(n => {
    if (filterStatus) {
      const recipientStatus = n.recipients?.[0]?.status ?? '';
      if (recipientStatus !== filterStatus) return false;
    }
    if (filterType && n.type !== filterType) return false;
    return true;
  }), [notifications, filterStatus, filterType]);

  const [showForm, setShowForm] = useState(false);

  const canNotify = canManage;

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando notificações..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">NOTIFICAÇÕES / COMUNICADOS</h3>
          <p className="mt-1 text-xs text-slate-500">Comunicados, alertas, advertências e suspensões.</p>
        </div>
        {canNotify && <button onClick={() => setShowForm(!showForm)} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">{showForm ? 'FECHAR' : '+ NOVA NOTIFICAÇÃO'}</button>}
      </div>

      {showForm && <CreateNotificationForm onCreated={() => { listQuery.refetch(); setShowForm(false); }} />}

      <div className="flex flex-wrap gap-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS TIPOS</option>
          <option value="SIMPLE_NOTICE">Comunicado</option>
          <option value="WARNING">Advertência</option>
          <option value="SUSPENSION">Suspensão</option>
          <option value="SYSTEM">Sistema</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS STATUS</option>
          <option value="UNREAD">Não lida</option>
          <option value="READ">Lida</option>
          <option value="PENDING_RESPONSE">Pendente resposta</option>
          <option value="ACKNOWLEDGED">Ciente</option>
          <option value="ACCEPTED">Aceita</option>
          <option value="REFUSED_ACKNOWLEDGMENT">Recusada</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-[12px] border border-slate-200 bg-white p-8 text-center">
            <Bell size={32} className="mx-auto text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Nenhuma notificação encontrada.</p>
          </div>
        ) : filtered.map((n: any) => {
          const recipientStatus = n.recipients?.[0]?.status ?? 'UNREAD';
          const badge = getStatusBadge(recipientStatus);
          const needResponse = recipientStatus === 'PENDING_RESPONSE' || recipientStatus === 'UNREAD';

          return (
            <div key={n.id} className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${badge.cls}`}>{badge.label}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{n.type?.replace(/_/g, ' ') ?? 'COMUNICADO'}</span>
                    <span className="text-[10px] text-slate-400">{fmtDateTime(n.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-slate-950">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600 whitespace-pre-wrap">{n.message}</p>
                  {n.createdByUser && <p className="mt-1 text-[10px] text-slate-400">Por: {n.createdByUser.name}</p>}
                </div>
              </div>

              {needResponse && n.requiresAcceptance && (
                <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => respondMut.mutate({ id: n.id, action: 'ACCEPT' }).catch(() => {})}
                    disabled={respondMut.loading}
                    className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-emerald-500 to-teal-600 px-3 text-[10px] font-black text-white"
                  >
                    <Check size={12}/> Aceitar
                  </button>
                  {n.allowsRefusal && (
                    <button
                      onClick={() => { const r = prompt('Motivo da recusa:'); if (r) respondMut.mutate({ id: n.id, action: 'REFUSE', reason: r }).catch(() => {}); }}
                      disabled={respondMut.loading}
                      className="inline-flex h-8 items-center gap-1 rounded-[6px] border border-red-200 px-3 text-[10px] font-black text-red-700"
                    >
                      <XCircle size={12}/> Recusar
                    </button>
                  )}
                </div>
              )}
              {needResponse && n.requiresReadConfirmation && !n.requiresAcceptance && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => respondMut.mutate({ id: n.id, action: 'ACKNOWLEDGE' }).catch(() => {})}
                    disabled={respondMut.loading}
                    className="inline-flex h-8 items-center gap-1 rounded-[6px] bg-gradient-to-r from-emerald-500 to-teal-600 px-3 text-[10px] font-black text-white"
                  >
                    <Check size={12}/> Dar ciência
                  </button>
                </div>
              )}

              {n.recipients?.[0]?.responseJson && (
                <div className="mt-2 rounded-[6px] bg-slate-50 p-2 text-[10px] text-slate-500">
                  <p>Resposta: {n.recipients[0].responseJson.action} {n.recipients[0].responseJson.reason ? `- ${n.recipients[0].responseJson.reason}` : ''}</p>
                  {n.recipients[0].responseJson.respondedAt && <p>Em: {fmtDateTime(n.recipients[0].responseJson.respondedAt)}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CreateNotificationForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SIMPLE_NOTICE');
  const [priority, setPriority] = useState('NORMAL');
  const [targetType, setTargetType] = useState('ALL');
  const [requiresReadConfirmation, setRequiresReadConfirmation] = useState(false);
  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [allowsRefusal, setAllowsRefusal] = useState(false);

  const createMut = useMutation((data: any) => api.notifications.createAdminNotice(data), {
    onSuccess: () => onCreated(),
  });

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) return;
    createMut.mutate({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      targetType,
      requiresReadConfirmation: type === 'SIMPLE_NOTICE' ? requiresReadConfirmation : true,
      requiresAcceptance: type === 'SUSPENSION' || type === 'WARNING' ? true : requiresAcceptance,
      allowsRefusal: type === 'SIMPLE_NOTICE' ? allowsRefusal : false,
    }).catch(() => {});
  };

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-xs font-black text-slate-950 uppercase">Nova Notificação</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
          <span>TÍTULO</span>
          <input value={title} onChange={e => setTitle(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" placeholder="Título da notificação" />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>TIPO</span>
          <select value={type} onChange={e => setType(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
            <option value="SIMPLE_NOTICE">Comunicado</option>
            <option value="WARNING">Advertência</option>
            <option value="SUSPENSION">Suspensão</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>PRIORIDADE</span>
          <select value={priority} onChange={e => setPriority(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
            <option value="LOW">Baixa</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>PÚBLICO ALVO</span>
          <select value={targetType} onChange={e => setTargetType(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
            <option value="ALL">Todos</option>
            <option value="EMPLOYEES">Funcionários</option>
          </select>
        </label>
        <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
          <span>MENSAGEM</span>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" placeholder="Conteúdo da notificação..." />
        </label>
        {(type === 'SIMPLE_NOTICE') && (
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={requiresReadConfirmation} onChange={e => setRequiresReadConfirmation(e.target.checked)} className="rounded border-slate-300" />
              Exigir confirmação de leitura
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={requiresAcceptance} onChange={e => { setRequiresAcceptance(e.target.checked); if (e.target.checked) setRequiresReadConfirmation(true); }} className="rounded border-slate-300" />
              Exigir aceite
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
              <input type="checkbox" checked={allowsRefusal} onChange={e => setAllowsRefusal(e.target.checked)} className="rounded border-slate-300" />
              Permitir recusa
            </label>
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={handleSubmit} disabled={!title.trim() || !message.trim() || createMut.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
          {createMut.loading ? 'ENVIANDO...' : (type === 'WARNING' ? 'GERAR ADVERTÊNCIA' : type === 'SUSPENSION' ? 'GERAR SUSPENSÃO' : 'ENVIAR COMUNICADO')}
        </button>
      </div>
      {createMut.error && <p className="mt-2 text-xs text-red-600">{createMut.error}</p>}
    </div>
  );
}

// ─── REGRAS ────────────────────────────────────────────────────────────────────

function RulesTab({ canManage }: { canManage: boolean }) {
  const listQuery = useQuery(() => api.workScheduleRules.list(), []);
  const createMut = useMutation((data: any) => api.workScheduleRules.create(data), { onSuccess: () => listQuery.refetch() });
  const updateMut = useMutation(({ id, data }: { id: string; data: any }) => api.workScheduleRules.update(id, data), { onSuccess: () => listQuery.refetch() });
  const archiveMut = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => listQuery.refetch() });
  const activateMut = useMutation((id: string) => api.workScheduleRules.activate(id), { onSuccess: () => listQuery.refetch() });

  const rules = (listQuery.data as any[] | undefined) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<any | null>(null);

  const openNew = () => { setEditRule(null); setShowForm(true); };
  const openEdit = (r: any) => { setEditRule(r); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditRule(null); };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando regras..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">REGRAS DE JORNADA</h3>
          <p className="mt-1 text-xs text-slate-500">Configure jornadas, tolerâncias, intervalos e parâmetros de fechamento.</p>
        </div>
        {canManage && <button onClick={openNew} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVA REGRA</button>}
      </div>

      {showForm && <RuleForm rule={editRule} onSave={(data, id) => {
        if (id) return updateMut.mutate({ id, data });
        return createMut.mutate(data);
      }} onClose={closeForm} saving={createMut.loading || updateMut.loading} />}

      {rules.length === 0 ? (
        <div className="rounded-[12px] border border-slate-200 bg-white p-8 text-center">
          <FileText size={32} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Nenhuma regra cadastrada. Clique em "+ Nova Regra" para criar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map((r: any) => (
            <div key={r.id} className={`rounded-[12px] border p-4 shadow-sm ${r.isActive !== false ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">{r.name ?? 'Regra sem nome'}</p>
                  {r.description && <p className="mt-0.5 text-[11px] text-slate-500">{r.description}</p>}
                </div>
                <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${r.isActive !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {r.isActive !== false ? 'ATIVA' : 'INATIVA'}
                </span>
              </div>
              <div className="mt-3 space-y-1 text-[11px] font-semibold text-slate-600">
                <p>Jornada: {r.workdayHours ?? r.weeklyWorkload ?? '---'}h/semana</p>
                <p>Entrada: {r.standardEntry ?? '---'} | Saída: {r.standardExit ?? '---'}</p>
                <p>Tolerância: {r.toleranceMinutes ?? 0} min | Intervalo: {r.lunchBreakMinutes ?? 0} min</p>
                {r.overtimeRule && <p>HE: {r.overtimeRule}</p>}
                {r.nightShiftExtra !== undefined && <p>Adicional noturno: {r.nightShiftExtra}%</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(r)} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Editar</button>
                {canManage && (
                  r.isActive !== false
                    ? <button onClick={() => archiveMut.mutate(r.id).catch(() => {})} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-amber-500 to-orange-600 px-2 text-[10px] font-black text-white">Inativar</button>
                    : <button onClick={() => activateMut.mutate(r.id).catch(() => {})} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-emerald-500 to-teal-600 px-2 text-[10px] font-black text-white">Ativar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RuleForm({ rule, onSave, onClose, saving }: { rule: any | null; onSave: (data: any, id?: string) => Promise<any>; onClose: () => void; saving: boolean }) {
  const [name, setName] = useState(rule?.name ?? '');
  const [description, setDescription] = useState(rule?.description ?? '');
  const [standardEntry, setStandardEntry] = useState(rule?.standardEntry ?? '08:00');
  const [standardExit, setStandardExit] = useState(rule?.standardExit ?? '18:00');
  const [toleranceMinutes, setToleranceMinutes] = useState(rule?.toleranceMinutes ?? 10);
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState(rule?.lunchBreakMinutes ?? 60);
  const [weeklyWorkload, setWeeklyWorkload] = useState(rule?.weeklyWorkload ?? 44);
  const [overtimeRule, setOvertimeRule] = useState(rule?.overtimeRule ?? '50%');
  const [nightShiftExtra, setNightShiftExtra] = useState(rule?.nightShiftExtra ?? 20);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Nome é obrigatório'); return; }
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        standardEntry,
        standardExit,
        toleranceMinutes: Number(toleranceMinutes),
        lunchBreakMinutes: Number(lunchBreakMinutes),
        weeklyWorkload: Number(weeklyWorkload),
        overtimeRule,
        nightShiftExtra: Number(nightShiftExtra),
      }, rule?.id);
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao salvar');
    }
  };

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-xs font-black text-slate-950 uppercase">{rule ? 'EDITAR REGRA' : 'NOVA REGRA'}</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="sm:col-span-3 space-y-1 text-xs font-medium text-slate-600"><span>NOME</span><input value={name} onChange={e => setName(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="sm:col-span-3 space-y-1 text-xs font-medium text-slate-600"><span>DESCRIÇÃO</span><input value={description} onChange={e => setDescription(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>ENTRADA PADRÃO</span><input value={standardEntry} onChange={e => setStandardEntry(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>SAÍDA PADRÃO</span><input value={standardExit} onChange={e => setStandardExit(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>CARGA SEMANAL (h)</span><input type="number" value={weeklyWorkload} onChange={e => setWeeklyWorkload(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>TOLERÂNCIA (min)</span><input type="number" value={toleranceMinutes} onChange={e => setToleranceMinutes(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>INTERVALO (min)</span><input type="number" value={lunchBreakMinutes} onChange={e => setLunchBreakMinutes(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>REGRA H.E.</span><select value={overtimeRule} onChange={e => setOvertimeRule(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
          <option value="50%">50%</option>
          <option value="100%">100%</option>
          <option value="50%+100%">50% + 100%</option>
        </select></label>
        <label className="space-y-1 text-xs font-medium text-slate-600"><span>ADICIONAL NOTURNO (%)</span><input type="number" value={nightShiftExtra} onChange={e => setNightShiftExtra(Number(e.target.value))} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" /></label>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
        <button onClick={handleSubmit} disabled={saving} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{saving ? 'SALVANDO...' : 'SALVAR'}</button>
      </div>
    </div>
  );
}

// ─── FECHAMENTO ────────────────────────────────────────────────────────────────

function ClosingTab({ canManage }: { canManage: boolean }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const listQuery = useQuery(() => api.timeClosing.list(), []);
  const generateMut = useMutation(({ month, year }: { month: number; year: number }) => api.timeClosing.generate(month, year), { onSuccess: () => listQuery.refetch() });
  const closeMut = useMutation((id: string) => api.timeClosing.close(id), { onSuccess: () => listQuery.refetch() });
  const approveMut = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: () => listQuery.refetch() });
  const reopenMut = useMutation(({ id, reason }: { id: string; reason: string }) => api.timeClosing.reopen(id, reason), { onSuccess: () => listQuery.refetch() });

  const closings = (listQuery.data as any[] | undefined) ?? [];
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    try {
      await generateMut.mutate({ month, year });
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao gerar fechamento');
    }
  };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando fechamentos..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />;

  const months = [
    { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' }, { v: 4, l: 'Abril' },
    { v: 5, l: 'Maio' }, { v: 6, l: 'Junho' }, { v: 7, l: 'Julho' }, { v: 8, l: 'Agosto' },
    { v: 9, l: 'Setembro' }, { v: 10, l: 'Outubro' }, { v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' },
  ];
  const years = [year - 2, year - 1, year, year + 1];

  const getStatusLabel = (s: string) => {
    const labels: Record<string, { label: string; cls: string }> = {
      OPEN: { label: 'Aberto', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
      CLOSED: { label: 'Fechado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      APPROVED: { label: 'Aprovado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      REOPENED: { label: 'Reaberto', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
      GENERATING: { label: 'Gerando...', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    };
    return labels[s] ?? { label: s, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-950">FECHAMENTO DE PERÍODO</h3>
        <p className="mt-1 text-xs text-slate-500">Gere e gerencie o fechamento mensal de horas dos colaboradores.</p>
      </div>

      <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>MÊS</span>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500">
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>ANO</span>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <button onClick={handleGenerate} disabled={generateMut.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
            {generateMut.loading ? 'GERANDO...' : 'GERAR FECHAMENTO'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {generateMut.error && <p className="mt-2 text-xs text-red-600">{generateMut.error}</p>}
      </div>

      {closings.length === 0 ? (
        <div className="rounded-[12px] border border-slate-200 bg-white p-8 text-center">
          <FileCheck2 size={32} className="mx-auto text-slate-300" />
          <p className="mt-2 text-xs font-semibold text-slate-500">Nenhum fechamento gerado. Selecione mês/ano e clique em "Gerar Fechamento".</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                <th className="px-3 py-2 border-b border-slate-200">Período</th>
                <th className="px-3 py-2 border-b border-slate-200">Status</th>
                <th className="px-3 py-2 border-b border-slate-200">Criado em</th>
                <th className="px-3 py-2 border-b border-slate-200">Fechado em</th>
                <th className="px-3 py-2 border-b border-slate-200">Ações</th>
              </tr>
            </thead>
            <tbody>
              {closings.toSorted((a: any, b: any) => {
                if (a.referenceYear !== b.referenceYear) return (b.referenceYear ?? 0) - (a.referenceYear ?? 0);
                return (b.referenceMonth ?? 0) - (a.referenceMonth ?? 0);
              }).map((c: any) => {
                const st = getStatusLabel(c.status);
                return (
                  <tr key={c.id} className="text-[11px] font-semibold hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-950">{months.find(m => m.v === c.referenceMonth)?.l ?? c.referenceMonth}/{c.referenceYear}</td>
                    <td className="px-3 py-2"><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${st.cls}`}>{st.label}</span></td>
                    <td className="px-3 py-2 text-slate-600">{fmtDateTime(c.createdAt)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDateTime(c.closedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {c.status === 'OPEN' && canManage && (
                          <>
                            <button onClick={() => closeMut.mutate(c.id).catch(() => {})} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Fechar</button>
                            <button onClick={() => approveMut.mutate(c.id).catch(() => {})} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Aprovar</button>
                          </>
                        )}
                        {(c.status === 'CLOSED' || c.status === 'APPROVED') && canManage && (
                          <button onClick={() => { const r = prompt('Motivo da reabertura:'); if (r) reopenMut.mutate({ id: c.id, reason: r }).catch(() => {}); }} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Reabrir</button>
                        )}
                        {c.id && (
                          <button onClick={() => window.open(`/api/time-closing/${c.id}/export`, '_blank')} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Exportar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── MODAIS ────────────────────────────────────────────────────────────────────

function EventModal({ event, employees, onClose, onSave, saving }: {
  event?: ManagementEvent; employees: Employee[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const init = event ?? { title: '', eventType: 'REUNIAO', status: 'PENDENTE', priority: 'MEDIA', startDateTime: '', endDateTime: '', responsibleUserId: '', employeeId: '', description: '' };
  const [title, setTitle] = useState(init.title);
  const [eventType, setEventType] = useState<EventType>(init.eventType as EventType);
  const [status, setStatus] = useState<EventStatus>(init.status as EventStatus);
  const [priority, setPriority] = useState<EventPriority>(init.priority as EventPriority);
  const [start, setStart] = useState(init.startDateTime?.slice(0, 16) ?? '');
  const [end, setEnd] = useState(init.endDateTime?.slice(0, 16) ?? '');
  const [responsible, setResponsible] = useState(init.responsibleUserId ?? '');
  const [employeeId, setEmployeeId] = useState(init.employeeId ?? '');
  const [desc, setDesc] = useState(init.description ?? '');

  const ok = title.trim() && start;
  const save = () => {
    if (!ok) return;
    onSave({
      title: title.trim(),
      description: desc.trim() || null,
      eventType,
      startDateTime: new Date(start).toISOString(),
      endDateTime: end ? new Date(end).toISOString() : null,
      responsibleUserId: responsible || null,
      employeeId: employeeId || null,
      status,
      priority,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">{event ? 'EDITAR COMPROMISSO' : 'NOVO COMPROMISSO'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle size={18} className="rotate-45"/></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600"><span>TÍTULO</span><input value={title} onChange={e => setTitle(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>TIPO</span><select value={eventType} onChange={e => setEventType(e.target.value as EventType)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>STATUS</span><select value={status} onChange={e => setStatus(e.target.value as EventStatus)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{EVENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>PRIORIDADE</span><select value={priority} onChange={e => setPriority(e.target.value as EventPriority)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{EVENT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>INÍCIO</span><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>FIM</span><input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>RESPONSÁVEL (ID USUÁRIO)</span><input value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="UUID" className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>FUNCIONÁRIO VINCULADO</span><select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="">---</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600"><span>DESCRIÇÃO</span><textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"/></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
          <button onClick={save} disabled={!ok || saving} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{saving ? 'SALVANDO...' : 'SALVAR'}</button>
        </div>
      </div>
    </div>
  );
}

function AsoModal({ record, employees, onClose, onSave, saving }: {
  record?: EmployeeAsoRecord; employees: Employee[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const init = record ?? { employeeId: '', asoType: 'PERIODICO', status: 'PENDENTE', examDate: '', dueDate: '', clinicName: '', doctorName: '', observation: '' };
  const [employeeId, setEmployeeId] = useState(init.employeeId ?? '');
  const [asoType, setAsoType] = useState(init.asoType as string);
  const [status, setStatus] = useState(init.status as string);
  const [examDate, setExamDate] = useState(init.examDate?.slice(0, 10) ?? '');
  const [dueDate, setDueDate] = useState(init.dueDate?.slice(0, 10) ?? '');
  const [clinic, setClinic] = useState(init.clinicName ?? '');
  const [doctor, setDoctor] = useState(init.doctorName ?? '');
  const [observation, setObservation] = useState(init.observation ?? '');

  const ok = !!employeeId;
  const save = () => {
    if (!ok) return;
    onSave({
      employeeId,
      asoType,
      status,
      examDate: examDate || null,
      dueDate: dueDate || null,
      clinicName: clinic.trim() || null,
      doctorName: doctor.trim() || null,
      observation: observation.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">{record ? 'EDITAR ASO' : 'NOVO ASO'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><XCircle size={18} className="rotate-45"/></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600"><span>FUNCIONÁRIO</span><select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"><option value="">Selecione...</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>TIPO ASO</span><select value={asoType} onChange={e => setAsoType(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ASO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>STATUS</span><select value={status} onChange={e => setStatus(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ASO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>DATA EXAME</span><input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>DATA VENCIMENTO</span><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>CLÍNICA</span><input value={clinic} onChange={e => setClinic(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>MÉDICO</span><input value={doctor} onChange={e => setDoctor(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600"><span>OBSERVAÇÕES</span><textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"/></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
          <button onClick={save} disabled={!ok || saving} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{saving ? 'SALVANDO...' : 'SALVAR'}</button>
        </div>
      </div>
    </div>
  );
}