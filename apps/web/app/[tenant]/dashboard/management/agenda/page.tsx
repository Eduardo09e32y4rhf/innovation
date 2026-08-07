'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api, type Employee, type ManagementEvent } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';
import { Check, XCircle, X } from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/ui';
import { Drawer, ConfirmDialog, Badge } from '@/app/components/ui';

type ColumnKey = 'OVERDUE' | 'TODAY' | 'THIS_WEEK' | 'UPCOMING' | 'COMPLETED';
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

function fmtDateTime(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    CONCLUIDO: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    EM_ANDAMENTO: { label: 'Em andamento', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    CANCELADO: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    PENDENTE: { label: 'Pendente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  return map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export default function AgendaPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canView = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  const [eventForm, setEventForm] = useState<{ open: boolean; edit?: ManagementEvent }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id?: string }>({ open: false });

  const kanbanQuery = useQuery(() => api.management.events.kanban(), [], { enabled: canView });
  const employeesQuery = useQuery(() => api.employees.list(), [], { enabled: canView });

  const eventsMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.events.update(input.id, input.data);
    return api.management.events.create(input.data);
  }, { onSuccess: () => { setEventForm({ open: false }); kanbanQuery.refetch(); } });

  const deleteEventMut = useMutation((id: string) => api.management.events.delete(id), { onSuccess: () => kanbanQuery.refetch() });

  const columns = useMemo(
    () => (kanbanQuery.data as any) ?? { OVERDUE: [], TODAY: [], THIS_WEEK: [], UPCOMING: [], COMPLETED: [] },
    [kanbanQuery.data],
  );
  const employees = useMemo(() => (employeesQuery.data as Employee[] | undefined) ?? [], [employeesQuery.data]);

  // Notifications logic
  useEffect(() => {
    if (!canView || typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [canView]);

  useEffect(() => {
    if (!canView || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    const events = [...(columns.TODAY || []), ...(columns.OVERDUE || [])];
    const pendingEvents = events.filter((e: any) => e.status === 'PENDENTE' && e.startDateTime);
    
    const checkAndNotify = () => {
      const notified = JSON.parse(window.localStorage.getItem('agenda-notified') || '{}');
      const now = new Date().getTime();
      let changed = false;
      
      pendingEvents.forEach((evt: any) => {
        const startTime = new Date(evt.startDateTime).getTime();
        const diffMinutes = (startTime - now) / 60000;
        
        const notify = (keySuffix: string, title: string, body: string) => {
          const key = `${evt.id}-${keySuffix}`;
          if (!notified[key]) {
            new Notification(title, { body });
            notified[key] = true;
            changed = true;
          }
        };

        if (diffMinutes <= 15 && diffMinutes > 14) notify('15m', 'Compromisso em 15 minutos', evt.title);
        else if (diffMinutes <= 5 && diffMinutes > 4) notify('5m', 'Compromisso em 5 minutos', evt.title);
        else if (diffMinutes <= 0 && diffMinutes > -1) notify('0m', 'Compromisso agora', evt.title);
        else if (diffMinutes <= -5 && diffMinutes > -6) notify('late', 'Compromisso atrasado', evt.title);
      });
      
      if (changed) window.localStorage.setItem('agenda-notified', JSON.stringify(notified));
    };

    const interval = setInterval(checkAndNotify, 60000);
    checkAndNotify();
    return () => clearInterval(interval);
  }, [columns, canView]);

  if (kanbanQuery.loading && !kanbanQuery.data) return <LoadingState message="Carregando agenda..." />;
  if (kanbanQuery.error && !kanbanQuery.data) return <ErrorState message={kanbanQuery.error} onRetry={kanbanQuery.refetch} />;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Agenda em aberto</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {(columns.OVERDUE?.length || 0) + (columns.TODAY?.length || 0) + (columns.THIS_WEEK?.length || 0) + (columns.UPCOMING?.length || 0)}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Compromissos concluídos</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{columns.COMPLETED?.length || 0}</p>
        </div>
      </div>

      <AgendaKanban
        columns={columns}
        employees={employees}
        canManage={canManage}
        onOpenForm={(edit) => setEventForm({ open: true, edit })}
        onSave={(data, id) => eventsMut.mutate({ id, data }).catch(() => {})}
        onDelete={(id) => setDeleteConfirm({ open: true, id })}
        saving={eventsMut.loading}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteEventMut.mutate(deleteConfirm.id).catch(() => {});
          }
          setDeleteConfirm({ open: false });
        }}
        title="Excluir compromisso"
        description="Tem certeza que deseja excluir este compromisso? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
        isLoading={deleteEventMut.loading}
      />

      {eventForm.open && (
        <EventModal
          event={eventForm.edit}
          employees={employees}
          onClose={() => setEventForm({ open: false })}
          onSave={(data) => eventsMut.mutate({ id: eventForm.edit?.id, data }).catch(() => {})}
          saving={eventsMut.loading}
        />
      )}
    </div>
  );
}

function AgendaKanban({ columns, employees, canManage, onOpenForm, onSave, onDelete, saving }: {
  columns: Record<ColumnKey, ManagementEvent[]>; employees: Employee[]; canManage: boolean;
  onOpenForm: (edit?: ManagementEvent) => void; onSave: (data: any, id?: string) => void;
  onDelete: (id: string) => void; saving: boolean;
}) {
  const [viewMode, setViewMode] = useState<'kanban'|'calendar'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
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

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  
  const allEvents = Object.values(columns).flat().filter((ev: any) => {
    if (filterStatus && ev.status !== filterStatus) return false;
    if (filterType && ev.eventType !== filterType) return false;
    if (filterEmp && ev.employeeId !== filterEmp) return false;
    return true;
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {canManage && (
          <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs">
            + NOVO COMPROMISSO
          </button>
        )}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button onClick={() => setViewMode('calendar')} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-[var(--color-brand)]' : 'text-slate-500 hover:text-slate-700'}`}>
            CALENDÁRIO
          </button>
          <button onClick={() => setViewMode('kanban')} className={`rounded-lg px-4 py-2 text-[10px] font-black uppercase transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-[var(--color-brand)]' : 'text-slate-500 hover:text-slate-700'}`}>
            KANBAN
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control">
          <option value="">TODOS STATUS</option>{EVENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control">
          <option value="">TODOS TIPOS</option>{EVENT_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="form-control">
          <option value="">TODOS FUNCIONÁRIOS</option>{employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
        </select>
      </div>

      {viewMode === 'calendar' ? (
        <div className="surface">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h4 className="text-sm font-black text-slate-900 capitalize">{monthName}</h4>
            <div className="flex gap-2">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="btn-outline h-8 w-8 !p-0 flex items-center justify-center">
                &lt;
              </button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="btn-outline h-8 w-8 !p-0 flex items-center justify-center">
                &gt;
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => <div key={d} className="px-2 py-3 text-center text-[10px] font-black uppercase text-slate-500">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/30 p-2" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().slice(0, 10);
              const dayEvents = allEvents.filter(e => e.startDateTime && e.startDateTime.startsWith(dateStr));
              return (
                <div key={day} onClick={() => onOpenForm({ startDateTime: `${dateStr}T09:00:00Z` } as any)} className="group relative min-h-[100px] border-b border-r border-slate-100 p-2 hover:bg-slate-50 cursor-pointer">
                  <span className={`text-[11px] font-black ${day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? 'flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-brand)] text-white' : 'text-slate-600'}`}>{day}</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayEvents.map(e => (
                      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpenForm(e); }} className={`truncate rounded px-1.5 py-1 text-[9px] font-bold text-white shadow-sm ${e.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-[var(--color-brand)]'}`}>
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {colOrder.map((key) => {
            const items = (columns[key] ?? []).filter((ev: any) => {
              if (filterStatus && ev.status !== filterStatus) return false;
              if (filterType && ev.eventType !== filterType) return false;
              if (filterEmp && ev.employeeId !== filterEmp) return false;
              return true;
            });
            return (
              <div key={key} className="min-h-[200px] rounded-[16px] border border-slate-200 bg-slate-50 p-2 shadow-inner">
                <div className="mb-3 flex items-center justify-between px-2">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">{colLabels[key]}</p>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700">{items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.length === 0 && <p className="px-1 py-4 text-center text-xs font-semibold text-slate-400">Nenhum evento</p>}
                  {items.map((ev: any) => (
                    <div key={ev.id} className="surface flex flex-col gap-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-black text-slate-950">{ev.title}</p>
                        <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${getStatusBadge(ev.status).cls}`}>{getStatusBadge(ev.status).label}</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">{fmtDateTime(ev.startDateTime)}</p>
                      <div className="space-y-1 text-[10px] font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <p><span className="text-slate-400 uppercase">Func:</span> {empName(ev.employeeId)}</p>
                        <p><span className="text-slate-400 uppercase">Tipo:</span> {ev.eventType}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <button onClick={() => onOpenForm(ev)} disabled={saving} className="btn-outline h-7 px-2 text-[10px] font-bold">Editar</button>
                        {ev.status !== 'CONCLUIDO' && canManage && (
                          <button onClick={() => onSave({ status: 'CONCLUIDO' }, ev.id)} disabled={saving} className="btn-primary h-7 px-2 text-[10px] flex items-center gap-1"><Check size={12}/> Concluir</button>
                        )}
                        {canManage && <button onClick={() => onDelete(ev.id)} disabled={saving} className="btn-danger h-7 px-2 text-[10px] flex items-center gap-1"><XCircle size={12}/></button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EventModal({ event, employees, onClose, onSave, saving }: {
  event?: ManagementEvent; employees: Employee[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const { user } = useAuth();
  const init = {
    title: event?.title ?? '',
    eventType: event?.eventType ?? 'REUNIAO',
    status: event?.status ?? 'PENDENTE',
    priority: event?.priority ?? 'MEDIA',
    startDateTime: event?.startDateTime ?? '',
    endDateTime: event?.endDateTime ?? '',
    responsibleUserId: event?.responsibleUserId ?? '',
    employeeId: event?.employeeId ?? '',
    description: event?.description ?? '',
  };
  const [title, setTitle] = useState(init.title);
  const [eventType, setEventType] = useState<EventType>(init.eventType as EventType);
  const [status, setStatus] = useState<EventStatus>(init.status as EventStatus);
  const [priority, setPriority] = useState<EventPriority>(init.priority as EventPriority);
  const [start, setStart] = useState(init.startDateTime?.slice(0, 16) ?? '');
  const [end, setEnd] = useState(init.endDateTime?.slice(0, 16) ?? '');
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
      responsibleUserId: event?.responsibleUserId ?? user?.id ?? null,
      employeeId: employeeId || null,
      status,
      priority,
    });
  };

  return (
    <Drawer 
      isOpen={true} 
      onClose={onClose} 
      title={event ? 'Editar Compromisso' : 'Novo Compromisso'}
      maxWidth="max-w-xl"
    >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="form-group sm:col-span-2">
            <span className="text-sm font-semibold text-zinc-700">Título *</span>
            <input value={title} onChange={e => setTitle(e.target.value)} className="form-control" />
          </label>
          <label className="form-group">
            <span className="text-sm font-semibold text-zinc-700">Tipo *</span>
            <select value={eventType} onChange={e => setEventType(e.target.value as EventType)} className="form-control">
              {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="text-sm font-semibold text-zinc-700">Status *</span>
            <select value={status} onChange={e => setStatus(e.target.value as EventStatus)} className="form-control">
              {EVENT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="text-sm font-semibold text-zinc-700">Prioridade *</span>
            <select value={priority} onChange={e => setPriority(e.target.value as EventPriority)} className="form-control">
              {EVENT_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <label className="form-group">
            <span className="text-sm font-semibold text-zinc-700">Início *</span>
            <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className="form-control" />
          </label>
          <label className="form-group">
            <span className="text-sm font-semibold text-zinc-700">Fim</span>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className="form-control" />
          </label>
          <label className="form-group sm:col-span-2">
            <span className="text-sm font-semibold text-zinc-700">Funcionário Vinculado</span>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="form-control">
              <option value="">Nenhum...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
            </select>
          </label>
          <label className="form-group sm:col-span-2">
            <span className="text-sm font-semibold text-zinc-700">Descrição</span>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="form-textarea resize-none" />
          </label>
        </div>
        <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6">
          <button onClick={onClose} className="btn btn-outline px-6">Cancelar</button>
          <button onClick={save} disabled={!ok || saving} className="btn btn-primary px-6 disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar Compromisso'}</button>
        </div>
    </Drawer>
  );
}
