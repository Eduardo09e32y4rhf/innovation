'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, XCircle } from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api, type Employee, type ManagementEvent, type EmployeeAsoRecord } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';

type Tab = 'agenda' | 'aso';
type EventType = 'REUNIAO' | 'CHAMADA' | 'TAREFA_INTERNA' | 'PRAZO_ADMINISTRATIVO' | 'RETORNO_COLABORADOR' | 'DOCUMENTO_PENDENTE' | 'OUTROS';
type EventStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
type EventPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
type AsoType = 'ADMISSIONAL' | 'DEMISSIONAL' | 'PERIODICO' | 'RETORNO_TRABALHO' | 'MUDANCA_FUNCAO' | 'OUTROS';
type AsoStatus = 'PENDENTE' | 'AGENDADO' | 'REALIZADO' | 'APTO' | 'INAPTO' | 'VENCIDO' | 'CANCELADO';

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

const ASO_TYPES: { value: AsoType; label: string }[] = [
  { value: 'ADMISSIONAL', label: 'Admissional' },
  { value: 'DEMISSIONAL', label: 'Demissional' },
  { value: 'PERIODICO', label: 'Periódico / Rotina' },
  { value: 'RETORNO_TRABALHO', label: 'Retorno ao trabalho' },
  { value: 'MUDANCA_FUNCAO', label: 'Mudança de função' },
  { value: 'OUTROS', label: 'Outros' },
];

const ASO_STATUSES: { value: AsoStatus; label: string }[] = [
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

function getAsoAlert(status: string, expirationDate?: string | null): { label: string; cls: string } {
  if (!expirationDate) return { label: 'Sem data definida', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const today = new Date();
  const exp = new Date(expirationDate);
  if (exp < today) return { label: 'Vencido', cls: 'bg-red-50 text-red-700 border-red-200' };
  const diff = (exp.getTime() - today.getTime()) / 86400000;
  if (diff <= 30) return { label: 'Próximo do vencimento', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: 'Válido', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export default function ManagementPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const canView = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';

  const [tab, setTab] = useState<Tab>('agenda');
  const [eventForm, setEventForm] = useState<{ open: boolean; edit?: ManagementEvent }>({ open: false });
  const [asoForm, setAsoForm] = useState<{ open: boolean; edit?: EmployeeAsoRecord }>({ open: false });

  const eventsQuery = useQuery(() => api.management.events.list(), [], { enabled: canView });
  const asoQuery = useQuery(() => api.management.aso.list(), [], { enabled: canView });
  const employeesQuery = useQuery(() => api.employees.list(), [], { enabled: canView });

  const eventsMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.events.update(input.id, input.data);
    return api.management.events.create(input.data);
  }, { onSuccess: () => { eventsQuery.refetch(); } });
  const deleteEventMut = useMutation((id: string) => api.management.events.delete(id), { onSuccess: () => eventsQuery.refetch() });
  const asoMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.aso.update(input.id, input.data);
    return api.management.aso.create(input.data);
  }, { onSuccess: () => asoQuery.refetch() });
  const deleteAsoMut = useMutation((id: string) => api.management.aso.delete(id), { onSuccess: () => asoQuery.refetch() });

  const events = useMemo(() => (eventsQuery.data as ManagementEvent[] | undefined) ?? [], [eventsQuery.data]);
  const asos = useMemo(() => (asoQuery.data as EmployeeAsoRecord[] | undefined) ?? [], [asoQuery.data]);
  const employees = useMemo(() => (employeesQuery.data as Employee[] | undefined) ?? [], [employeesQuery.data]);

  const summaries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const pendentes = events.filter(e => e.status === 'PENDENTE').length;
    const hoje = events.filter(e => e.startDateTime?.startsWith(today)).length;
    const vencidos = asos.filter(a => getAsoAlert(a.status, a.expirationDate).label === 'Vencido').length;
    const proximos = asos.filter(a => {
      if (!a.expirationDate) return false;
      const diff = (new Date(a.expirationDate).getTime() - Date.now()) / 86400000;
      return diff > 0 && diff <= 30;
    }).length;
    return { pendentes, hoje, vencidos, proximos };
  }, [events, asos]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600">GESTÃO</p>
        <h2 className="text-2xl font-black text-slate-950">Controle sua agenda administrativa, compromissos e exames ocupacionais dos colaboradores.</h2>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[12px] border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Compromissos pendentes</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{summaries.pendentes}</p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Compromissos de hoje</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{summaries.hoje}</p>
        </div>
        <div className="rounded-[12px] border border-red-200 bg-red-50/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-red-700">ASOs vencidos</p>
          <p className="mt-1 text-2xl font-black text-red-900">{summaries.vencidos}</p>
        </div>
        <div className="rounded-[12px] border border-amber-200 bg-amber-50/40 p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">ASOs próximos do vencimento</p>
          <p className="mt-1 text-2xl font-black text-amber-900">{summaries.proximos}</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-[8px] bg-slate-100 p-1">
        <button onClick={() => setTab('agenda')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'agenda' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>Agenda</button>
        <button onClick={() => setTab('aso')} className={`rounded-[6px] px-4 py-2 text-xs font-black uppercase ${tab === 'aso' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>ASO</button>
      </div>

      {eventsQuery.loading && !eventsQuery.data ? <LoadingState label="Carregando..." /> :
       eventsQuery.error && !eventsQuery.data ? <ErrorState message={eventsQuery.error} onRetry={eventsQuery.refetch} /> :
       tab === 'agenda' ? (
        <AgendaTab
          events={events}
          employees={employees}
          canManage={canManage}
          onOpenForm={(edit) => setEventForm({ open: true, edit })}
          onSave={(data, id) => eventsMut.mutate({ id, data }).catch(() => {})}
          onDelete={(id) => deleteEventMut.mutate(id).catch(() => {})}
          saving={eventsMut.loading}
        />
      ) : (
        <AsoTab
          records={asos}
          employees={employees}
          canManage={canManage}
          onOpenForm={(edit) => setAsoForm({ open: true, edit })}
          onSave={(data, id) => asoMut.mutate({ id, data }).catch(() => {})}
          onDelete={(id) => deleteAsoMut.mutate(id).catch(() => {})}
          saving={asoMut.loading}
        />
      )}

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

function AgendaTab({ events, employees, canManage, onOpenForm, onSave, onDelete, saving }: {
  events: ManagementEvent[]; employees: Employee[]; canManage: boolean;
  onOpenForm: (edit?: ManagementEvent) => void; onSave: (data: any, id?: string) => void;
  onDelete: (id: string) => void; saving: boolean;
}) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEmp, setFilterEmp] = useState('');
  const filtered = useMemo(() => events.filter(e => {
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterType && e.eventType !== filterType) return false;
    if (filterEmp && e.employeeId !== filterEmp) return false;
    return true;
  }).toSorted((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()), [events, filterStatus, filterType, filterEmp]);

  const empName = (id?: string | null) => employees.find(e => e.id === id)?.name ?? '---';

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">AGENDA - COMPROMISSOS</h3>
          <p className="mt-1 text-xs text-slate-500">Gerencie compromissos, reuniões e prazos administrativos.</p>
        </div>
        {canManage && <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVO</button>}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
              <th className="px-3 py-2 border-b border-slate-200">Data/Horário</th>
              <th className="px-3 py-2 border-b border-slate-200">Título</th>
              <th className="px-3 py-2 border-b border-slate-200">Tipo</th>
              <th className="px-3 py-2 border-b border-slate-200">Responsável</th>
              <th className="px-3 py-2 border-b border-slate-200">Funcionário</th>
              <th className="px-3 py-2 border-b border-slate-200">Prioridade</th>
              <th className="px-3 py-2 border-b border-slate-200">Status</th>
              <th className="px-3 py-2 border-b border-slate-200 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-slate-500">Nenhum compromisso encontrado.</td></tr> :
              filtered.map(ev => (
                <tr key={ev.id} className="border-t border-slate-100 text-[11px] font-semibold hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-[11px] font-bold text-slate-700">{fmtDateTime(ev.startDateTime)}{ev.endDateTime ? ` - ${fmtDateTime(ev.endDateTime)}` : ''}</td>
                  <td className="px-3 py-2 text-slate-950">{ev.title}</td>
                  <td className="px-3 py-2 text-slate-600">{ev.eventType}</td>
                  <td className="px-3 py-2 text-slate-600">{ev.responsibleUserId ? '---' : '---'}</td>
                  <td className="px-3 py-2 text-slate-600">{empName(ev.employeeId)}</td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${ev.priority === 'URGENTE' ? 'border-red-200 bg-red-50 text-red-700' : ev.priority === 'ALTA' ? 'border-orange-200 bg-orange-50 text-orange-700' : ev.priority === 'MEDIA' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{ev.priority}</span></td>
                  <td className="px-3 py-2"><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${ev.status === 'CONCLUIDO' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ev.status === 'EM_ANDAMENTO' ? 'border-sky-200 bg-sky-50 text-sky-700' : ev.status === 'CANCELADO' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{ev.status}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => onOpenForm(ev)} disabled={saving} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Editar</button>
                      {canManage && <button onClick={() => { if (window.confirm('Excluir?')) onDelete(ev.id); }} disabled={saving} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[10px] font-black text-white"><XCircle size={12}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

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
    const da = a.expirationDate ? new Date(a.expirationDate).getTime() : 0;
    const db = b.expirationDate ? new Date(b.expirationDate).getTime() : 0;
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
        {canManage && <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVO</button>}
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
                const alert = getAsoAlert(r.status, r.expirationDate);
                return (
                  <tr key={r.id} className="border-t border-slate-100 text-[11px] font-semibold hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-950">{empName(r.employeeId)}</td>
                    <td className="px-3 py-2 text-slate-600">{r.asoType}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.examDate)}</td>
                    <td className="px-3 py-2 text-slate-600">{fmtDate(r.expirationDate)}</td>
                    <td className="px-3 py-2"><span className={`inline-flex rounded-[5px] border px-2 py-0.5 text-[9px] font-black ${alert.cls}`}>{alert.label}</span></td>
                    <td className="px-3 py-2 text-slate-600">{r.clinicName ?? '---'}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => onOpenForm(r)} disabled={saving} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Editar</button>
                        {canManage && <button onClick={() => { if (window.confirm('Excluir?')) onDelete(r.id); }} disabled={saving} className="inline-flex h-7 items-center rounded-[5px] bg-gradient-to-r from-rose-500 to-pink-600 px-2 text-[10px] font-black text-white"><XCircle size={12}/></button>}
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

function EventModal({ event, employees, onClose, onSave, saving }: {
  event?: ManagementEvent; employees: Employee[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const init = event ?? { title: '', eventType: 'REUNIAO', status: 'PENDENTE', priority: 'MEDIA', startDateTime: '', endDateTime: '' };
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
  const init = record ?? { employeeId: '', asoType: 'PERIODICO', status: 'PENDENTE', examDate: '', expirationDate: '', clinicName: '', doctorName: '', notes: '' };
  const [employeeId, setEmployeeId] = useState(init.employeeId ?? '');
  const [asoType, setAsoType] = useState<AsoType>(init.asoType as AsoType);
  const [status, setStatus] = useState<AsoStatus>(init.status as AsoStatus);
  const [examDate, setExamDate] = useState(init.examDate?.slice(0, 10) ?? '');
  const [expDate, setExpDate] = useState(init.expirationDate?.slice(0, 10) ?? '');
  const [clinic, setClinic] = useState(init.clinicName ?? '');
  const [doctor, setDoctor] = useState(init.doctorName ?? '');
  const [notes, setNotes] = useState(init.notes ?? '');

  const ok = !!employeeId;
  const save = () => {
    if (!ok) return;
    onSave({
      employeeId,
      asoType,
      status,
      examDate: examDate || null,
      expirationDate: expDate || null,
      clinicName: clinic.trim() || null,
      doctorName: doctor.trim() || null,
      notes: notes.trim() || null,
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
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>TIPO</span><select value={asoType} onChange={e => setAsoType(e.target.value as AsoType)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ASO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>STATUS</span><select value={status} onChange={e => setStatus(e.target.value as AsoStatus)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">{ASO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>EXAME</span><input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>VENCIMENTO</span><input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>CLÍNICA</span><input value={clinic} onChange={e => setClinic(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="space-y-1 text-xs font-medium text-slate-600"><span>MÉDICO</span><input value={doctor} onChange={e => setDoctor(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"/></label>
          <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600"><span>OBSERVAÇÕES</span><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"/></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">CANCELAR</button>
          <button onClick={save} disabled={!ok || saving} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">{saving ? 'SALVANDO...' : 'SALVAR'}</button>
        </div>
      </div>
    </div>
  );
}