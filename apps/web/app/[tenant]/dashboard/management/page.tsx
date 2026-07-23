'use client';

import { useMemo, useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter , useParams } from 'next/navigation';
import { CalendarDays, Check, Clock3, XCircle, FileText, FileCheck2, Bell, AlertTriangle, Gavel, Plus, Search, RefreshCcw, Upload, Download, Eye, EyeOff, MessageSquare, Send, Settings, Zap, Activity, X } from 'lucide-react';
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
  { value: 'PENDING', label: 'Pendente' },
  { value: 'SCHEDULED', label: 'Agendado' },
  { value: 'COMPLETED', label: 'Concluído / Apto' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'EXPIRED', label: 'Vencido' },
  { value: 'WAITING_DOCUMENT', label: 'Aguardando doc' },
  { value: 'WAITING_ADDITIONAL_EXAM', label: 'Exame extra' },
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
  if (status === 'COMPLETED' || status === 'APTO') return { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'CANCELLED') return { label: 'Cancelado', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
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
  const params = useParams();
  const tenant = params?.tenant as string;

  return (
    <Suspense fallback={<LoadingState label="Carregando..." />}>
      <ManagementContent />
    </Suspense>
  );
}

function ManagementContent() {
  const params = useParams();
  const tenant = params?.tenant as string;
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const canView = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH' || profile === 'GESTOR';

  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get('tab') as ManagementTab | null;
  const [tab, setTab] = useState<Tab>(current && ['agenda','aso','notifications','rules','closing'].includes(current) ? current : 'agenda');

  function navigate(next: ManagementTab) {
    router.push(`/${tenant}/dashboard/management?tab=` + next);
    setTab(next);
  }

  const [eventForm, setEventForm] = useState<{ open: boolean; edit?: ManagementEvent }>({ open: false });
  const [asoForm, setAsoForm] = useState<{ open: boolean; edit?: EmployeeAsoRecord }>({ open: false });

  const kanbanQuery = useQuery(() => api.management.events.kanban(), [], { enabled: canView });
  const asoQuery = useQuery(() => api.management.aso.list(), [], { enabled: canView });
  const employeesQuery = useQuery(() => api.employees.list(), [], { enabled: canView });
  const companyQuery = useQuery(() => api.companies.me(), [], { enabled: canView });

  const eventsMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.events.update(input.id, input.data);
    return api.management.events.create(input.data);
  }, { onSuccess: () => { setEventForm({ open: false }); kanbanQuery.refetch(); } });
  const deleteEventMut = useMutation((id: string) => api.management.events.delete(id), { onSuccess: () => kanbanQuery.refetch() });
  const asoMut = useMutation((input: { id?: string; data: any }) => {
    if (input.id) return api.management.aso.update(input.id, input.data);
    return api.management.aso.create(input.data);
  }, { onSuccess: () => { setAsoForm({ open: false }); asoQuery.refetch(); } });
  const deleteAsoMut = useMutation((id: string) => api.management.aso.delete(id), { onSuccess: () => asoQuery.refetch() });

  const columns = (kanbanQuery.data as any) ?? { OVERDUE: [], TODAY: [], THIS_WEEK: [], UPCOMING: [], COMPLETED: [] };
  const asos = useMemo(() => (asoQuery.data as EmployeeAsoRecord[] | undefined) ?? [], [asoQuery.data]);
  const employees = useMemo(() => (employeesQuery.data as Employee[] | undefined) ?? [], [employeesQuery.data]);
  const company = companyQuery.data ?? null;

  // Notificações de PC para Agenda (15m, 5m, 0, -5m)
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
      const notified = JSON.parse(sessionStorage.getItem('agenda-notified') || '{}');
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
      
      if (changed) sessionStorage.setItem('agenda-notified', JSON.stringify(notified));
    };

    const interval = setInterval(checkAndNotify, 60000);
    checkAndNotify();
    return () => clearInterval(interval);
  }, [columns, canView]);

  // Notificações de PC para ASO
  useEffect(() => {
    if (!canView || !asos.length || !employees.length || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    
    const checkAsoAndNotify = () => {
      const notified = JSON.parse(sessionStorage.getItem('aso-notified') || '{}');
      let changed = false;
      const today = new Date().toISOString().slice(0, 10);
      
      asos.forEach((aso: any) => {
        const empName = employees.find(e => e.id === aso.employeeId)?.name || 'Funcionário';
        const typeStr = aso.asoType === 'ADMISSIONAL' ? 'Admissional' : aso.asoType === 'DEMISSIONAL' ? 'Demissional' : aso.asoType === 'PERIODICO' ? 'Periódico' : aso.asoType;
        
        // Pendentes
        if (aso.status === 'PENDENTE' || aso.status === 'PENDING') {
          const key = `aso-${aso.id}-pending`;
          if (!notified[key]) {
            const notif = new Notification('ASO Pendente', { 
              body: `O ASO ${typeStr} de ${empName} está pendente.`,
              icon: '/icon-192x192.png'
            });
            notif.onclick = () => { window.focus(); notif.close(); };
            notified[key] = true;
            changed = true;
          }
        }
        
        // Vencidos
        if (aso.dueDate && aso.dueDate.slice(0, 10) < today && !['CANCELADO', 'CANCELLED'].includes(aso.status)) {
          const key = `aso-${aso.id}-expired`;
          if (!notified[key]) {
            const notif = new Notification('ASO Vencido!', { 
              body: `O ASO ${typeStr} de ${empName} está vencido desde ${new Date(aso.dueDate).toLocaleDateString('pt-BR')}`,
              icon: '/icon-192x192.png'
            });
            notif.onclick = () => { window.focus(); notif.close(); };
            notified[key] = true;
            changed = true;
          }
        }
      });
      
      if (changed) sessionStorage.setItem('aso-notified', JSON.stringify(notified));
    };

    // Check once on load and every 1h
    checkAsoAndNotify();
    const interval = setInterval(checkAsoAndNotify, 3600000);
    return () => clearInterval(interval);
  }, [asos, employees, canView]);

  return (
    <div className="mx-auto w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <header className="page-header items-center">
        <div>
          <p className="page-label">GESTÃO</p>
          <h2 className="page-title">Gestão de pessoas e jornada</h2>
          <p className="mt-1 text-[11px] font-medium text-zinc-500">Controle compromissos, exames ocupacionais e pendências administrativas dos colaboradores.</p>
        </div>
      </header>

      <div className="tab-bar">
        <button onClick={() => navigate('agenda')} className={tab === 'agenda' ? 'tab-item-active' : 'tab-item'}>Agenda</button>
        <button onClick={() => navigate('aso')} className={tab === 'aso' ? 'tab-item-active' : 'tab-item'}>ASO</button>
        <button onClick={() => navigate('notifications')} className={tab === 'notifications' ? 'tab-item-active' : 'tab-item'}>Notificações</button>
        <button onClick={() => navigate('rules')} className={tab === 'rules' ? 'tab-item-active' : 'tab-item'}>Regras</button>
        <button onClick={() => navigate('closing')} className={tab === 'closing' ? 'tab-item-active' : 'tab-item'}>Fechamento</button>
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
          company={company}
          canManage={canManage}
          onOpenForm={(edit) => setAsoForm({ open: true, edit })}
          onSave={(data, id) => asoMut.mutate({ id, data }).catch(() => {})}
          onDelete={(id) => deleteAsoMut.mutate(id).catch(() => {})}
          saving={asoMut.loading}
        />)}

      {tab === 'notifications' && <NotificationsTab canManage={canManage} company={company} employees={employees} />}
      {tab === 'rules' && <RulesTab canManage={canManage} />}
      {tab === 'closing' && <ClosingTab canManage={canManage} company={company} />}

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
        asos={asos}
        company={company}
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

  // Calendar logic
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
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVO COMPROMISSO</button>
        <div className="flex items-center gap-1 rounded-[8px] bg-slate-100 p-1">
          <button onClick={() => setViewMode('calendar')} className={`rounded-[6px] px-4 py-1.5 text-[10px] font-black uppercase ${viewMode === 'calendar' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>CALENDÁRIO</button>
          <button onClick={() => setViewMode('kanban')} className={`rounded-[6px] px-4 py-1.5 text-[10px] font-black uppercase ${viewMode === 'kanban' ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500'}`}>KANBAN</button>
        </div>
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

      {viewMode === 'calendar' ? (
        <div className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h4 className="text-sm font-black text-slate-900 capitalize">{monthName}</h4>
            <div className="flex gap-2">
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg></button>
              <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg></button>
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
                  <span className={`text-[11px] font-black ${day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() ? 'flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white' : 'text-slate-600'}`}>{day}</span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayEvents.map(e => (
                      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); onOpenForm(e); }} className={`truncate rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm ${e.status === 'CONCLUIDO' ? 'bg-emerald-500' : 'bg-teal-500'}`}>
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
      )}
    </section>
  );
}


// ─── ASO ───────────────────────────────────────────────────────────────────────


function printAsoPdf(emp: any, r: any, company: any) {
  const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
  const docTitle = 'Encaminhamento para Exame Médico (ASO)';
  const asoType = r.asoType || 'ADMISSIONAL';
  const subtitle = asoType.replace(/_/g, ' ');
  
  const text = `<p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Encaminhamos o(a) colaborador(a) abaixo qualificado(a) para a realização de <strong>Exame Médico Ocupacional (${subtitle})</strong>, conforme previsto na NR-7.</p>
  <p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Por favor, realizem a avaliação clínica e os exames complementares (se aplicáveis) e emitam o respectivo Atestado de Saúde Ocupacional (ASO).</p>`;

  const companyInfo = company ? {
    name: company.name,
    legalName: company.legalName,
    document: company.document || company.cnpj,
    logoUrl: company.logoUrl,
    phone: company.phone,
    email: company.email,
    address: [company.street, company.streetNumber, company.city, company.state].filter(Boolean).join(', '),
  } : null;

  const html = buildPdfShell({ title: docTitle, subtitle: emp.name }, companyInfo, `
    ${section('Dados do Empregador (Empresa)', infoGrid([
      { label: 'Razão Social', value: company?.legalName || company?.name || '---' },
      { label: 'CNPJ', value: company?.document || company?.cnpj || '---' },
      { label: 'Endereço', value: [company?.street, company?.streetNumber, company?.city, company?.state].filter(Boolean).join(', ') || '---' },
    ], 1))}
    ${section('Qualificação do Colaborador', infoGrid([
      { label: 'Nome Completo', value: emp.name },
      { label: 'CPF', value: emp.cpf },
      { label: 'Data Nasc.', value: emp.birthDate ? new Date(emp.birthDate).toLocaleDateString('pt-BR') : '---' },
      { label: 'Cargo', value: emp.position },
      { label: 'Setor/Depto', value: emp.department },
    ], 3))}
    ${section('Dados do Encaminhamento', `
      ${infoGrid([
        { label: 'Tipo de Exame', value: subtitle },
        { label: 'Clínica Agendada', value: r.clinicName || 'À definir' },
        { label: 'Endereço da Clínica', value: (r.clinicAddress || r.observation) || 'Não informado' },
        { label: 'Data Prevista', value: r.examDate ? new Date(r.examDate).toLocaleDateString('pt-BR') : 'Não agendado' },
      ], 2)}
    `)}
    ${section('Mensagem', text)}
    ${signatureBlock(['Autorização RH / Empregador', 'Recebimento pela Clínica', 'Assinatura do Funcionário'])}
  `);
  
  printPdf(html, `encaminhamento-aso-${emp.id}.pdf`);
}

function AsoTab({ records, employees, company, canManage, onOpenForm, onSave, onDelete, saving }: {
  records: EmployeeAsoRecord[]; employees: Employee[]; company: any; canManage: boolean;
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
  }).slice().sort((a, b) => {
    const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
    const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
    return da - db;
  }), [records, filterType, filterStatus, filterEmp]);

  const empName = (id: string) => employees.find(e => e.id === id)?.name ?? '---';

  const vencidosCount = records.filter(r => r.status === 'EXPIRED' || (r.dueDate && new Date(r.dueDate) < new Date() && r.status !== 'COMPLETED' && r.status !== 'CANCELLED')).length;
  const agendadosCount = records.filter(r => r.status === 'SCHEDULED').length;
  const pendentesCount = records.filter(r => r.status === 'PENDING').length;

  const handleGenerateAsoPdf = (r: EmployeeAsoRecord) => {
    const emp = employees.find(e => e.id === r.employeeId);
    if (!emp) return;
    printAsoPdf(emp, r, company);
  };

  return (
    <section className="overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">CONTROLE DE ASO</h3>
          <p className="mt-1 text-xs text-slate-500">Atestados de saúde ocupacional dos colaboradores.</p>
        </div>
        {canManage && <button onClick={() => onOpenForm(undefined)} disabled={saving} className="btn-outline inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[11px] font-black">+ NOVO ASO</button>}
      </div>

      <div className="grid grid-cols-3 gap-3 p-5 bg-slate-50 border-b border-slate-100">
        <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-red-500 tracking-wider">Vencidos / Atrasados</p>
            <p className="text-2xl font-black text-red-700 mt-1">{vencidosCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">Agendados</p>
            <p className="text-2xl font-black text-indigo-700 mt-1">{agendadosCount}</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Pendentes</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{pendentesCount}</p>
          </div>
        </div>
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
            {filtered.length === 0 ? <tr><td colSpan={7} className="p-8">
              <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 mb-4">
                  <FileCheck2 size={28} className="text-teal-600" />
                </div>
                <h4 className="text-sm font-black text-slate-900">Nenhum ASO registrado</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">A saúde ocupacional é obrigatória por lei (NR-7) e protege tanto a empresa quanto o funcionário.</p>
                
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-left max-w-2xl">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 min-w-[200px]">
                    <h5 className="text-[11px] font-black text-slate-800">🏥 Admissional</h5>
                    <p className="text-[10px] text-slate-500 mt-1">Realizado ANTES do funcionário iniciar suas atividades.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 min-w-[200px]">
                    <h5 className="text-[11px] font-black text-slate-800">📅 Periódico</h5>
                    <p className="text-[10px] text-slate-500 mt-1">Realizado anualmente ou a cada 2 anos, dependendo do cargo.</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 min-w-[200px]">
                    <h5 className="text-[11px] font-black text-slate-800">👋 Demissional</h5>
                    <p className="text-[10px] text-slate-500 mt-1">Realizado em até 10 dias após o desligamento do funcionário.</p>
                  </div>
                </div>

                {canManage && (
                  <button onClick={() => onOpenForm(undefined)} disabled={saving} className="mt-8 crystal-button h-10 px-6 rounded-[8px] text-[11px] font-black text-white shadow-md shadow-teal-500/20 transition-all hover:-translate-y-0.5">
                    + REGISTRAR PRIMEIRO ASO
                  </button>
                )}
              </div>
            </td></tr> :
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
                        <button onClick={() => handleGenerateAsoPdf(r)} className="btn-outline-premium h-7 px-2 text-[10px] font-bold">Imprimir PDF</button>
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

function NotificationsTab({ canManage, company, employees: propEmployees }: { canManage: boolean; company?: any; employees?: any[] }) {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const listQuery = useQuery(() => api.notifications.list(), []);
  const empQuery = useQuery(() => api.employees.list(), []);
  const respondMut = useMutation(({ id, action, reason }: { id: string; action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE'; reason?: string }) =>
    api.notifications.respond(id, action, reason), { onSuccess: () => listQuery.refetch() });

  const notifications = (listQuery.data as any[] | undefined) ?? [];
  const employees = (empQuery.data as Employee[] | undefined) ?? [];

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

  const handleGenerateTermoPdf = (n: any) => {
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const emp = employees.find(e => e.id === n.recipients?.[0]?.employeeId);
    if (!emp) return alert('Funcionário não encontrado');
    
    const isSuspension = n.type === 'SUSPENSION_NOTICE';
    const docTitle = isSuspension ? 'TERMO DE SUSPENSÃO DISCIPLINAR' : 'TERMO DE ADVERTÊNCIA DISCIPLINAR';
    
    const text = `<p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">
      Pelo presente termo, comunicamos ao funcionário <strong>${emp.name}</strong>, que está sendo aplicada a penalidade de 
      <strong>${isSuspension ? 'SUSPENSÃO' : 'ADVERTÊNCIA'} DISCIPLINAR</strong>, 
      com fulcro no Artigo 482 da CLT (Consolidação das Leis do Trabalho), 
      devido ao fato descrito a seguir:
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px;margin:10px 0;font-size:11px;color:#1e293b;">
      <strong>Motivo / Fato ocorrido:</strong><br/>
      ${n.message}
    </div>
    <p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">
      Ressaltamos que a reiteração desta ou de outras faltas graves poderá acarretar 
      consequências mais severas, incluindo a rescisão do contrato de trabalho por justa causa, 
      nos termos da legislação vigente.
    </p>
    <p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">
      Solicitamos que observe as normas e regulamentos internos da empresa para que não 
      ocorra reincidência.
    </p>`;

    const companyInfo = company ? {
      name: company.name,
      legalName: company.legalName,
      document: company.cnpj,
      logoUrl: company.logoUrl,
      phone: company.phone,
      email: company.email,
      address: [company.street, company.streetNumber, company.city, company.state].filter(Boolean).join(', '),
    } : null;

    const html = buildPdfShell({ title: docTitle, subtitle: emp.name }, companyInfo, `
      ${section('Qualificação do Colaborador', infoGrid([
        { label: 'Nome', value: emp.name },
        { label: 'CPF', value: emp.cpf },
        { label: 'Cargo', value: emp.position },
        { label: 'Setor', value: emp.department },
      ], 2))}
      ${section('Fundamentação e Fato', text)}
      <div style="margin-top:30px;font-size:10px;color:#64748b;text-align:center;">
        Ciente em: _____/_____/_________
      </div>
      ${signatureBlock(['Assinatura do Empregador / RH', 'Assinatura do Empregado'])}
    `);
    
    printPdf(html, `termo-${emp.id}.pdf`);
  };

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

      {showForm && <CreateNotificationForm employees={employees} company={company} onCreated={() => { listQuery.refetch(); setShowForm(false); }} />}

      <div className="flex flex-wrap gap-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="h-9 rounded-[6px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500">
          <option value="">TODOS TIPOS</option>
          <option value="SIMPLE_NOTICE">Comunicado</option>
          <option value="WARNING_NOTICE">Advertência</option>
          <option value="SUSPENSION_NOTICE">Suspensão</option>
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
                  <div className="flex items-center gap-2 flex-wrap justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${badge.cls}`}>{badge.label}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{n.type?.replace(/_/g, ' ') ?? 'COMUNICADO'}</span>
                      <span className="text-[10px] text-slate-400">{fmtDateTime(n.createdAt)}</span>
                    </div>
                    {canManage && (n.type === 'WARNING_NOTICE' || n.type === 'SUSPENSION_NOTICE') && (
                      <button onClick={() => handleGenerateTermoPdf(n)} className="btn-outline-premium h-7 px-3 text-[9px] font-black uppercase">Gerar PDF Legal</button>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950">{n.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600 whitespace-pre-wrap">{n.message}</p>
                  
                  {n.extraJson?.resetCode && (
                    <div className="mt-3 flex items-center justify-between rounded-[8px] border border-teal-100 bg-teal-50/50 p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-teal-700">CÓDIGO DE RECUPERAÇÃO:</span>
                        <code className="rounded-[4px] bg-white px-2 py-1 text-sm font-black tracking-[0.2em] text-slate-900 shadow-sm border border-slate-200">{n.extraJson.resetCode}</code>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(n.extraJson.resetCode); alert('Código copiado!'); }} 
                        className="inline-flex h-7 items-center rounded-[6px] bg-white border border-slate-200 px-3 text-[10px] font-black uppercase text-teal-600 shadow-sm transition-all hover:bg-teal-50"
                      >
                        Copiar
                      </button>
                    </div>
                  )}

                  {n.createdByUser && <p className="mt-2 text-[10px] text-slate-400">Por: {n.createdByUser.name}</p>}
                </div>
              </div>

              {n.recipients?.length > 1 && n.createdByUser && n.createdByUser.id !== n.recipients[0]?.userId && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-black text-slate-500 mb-2">STATUS DOS DESTINATÁRIOS ({n.recipients.length})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-2">
                    {n.recipients.map((r: any) => {
                      const rBadge = getStatusBadge(r.status);
                      return (
                        <div key={r.id} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5">
                          <span className="text-[10px] font-bold text-slate-700 truncate mr-2" title={r.user?.name}>{r.user?.name ?? 'Usuário'}</span>
                          <span className={`shrink-0 inline-flex rounded-[4px] border px-1 py-0.5 text-[8px] font-black ${rBadge.cls}`}>{rBadge.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

function CreateNotificationForm({ onCreated, employees, company }: { onCreated: () => void, employees: Employee[], company?: any }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SIMPLE_NOTICE');
  const [priority, setPriority] = useState('NORMAL');
  const [targetType, setTargetType] = useState('ALL');
  const [targetRole, setTargetRole] = useState('FUNCIONARIO');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  
  // Warning/Suspension specifics
  const [legalReason, setLegalReason] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState('');
  const [suspensionDays, setSuspensionDays] = useState(1);
  
  const [requiresReadConfirmation, setRequiresReadConfirmation] = useState(false);
  const [requiresAcceptance, setRequiresAcceptance] = useState(false);
  const [allowsRefusal, setAllowsRefusal] = useState(false);

  const createMut = useMutation((data: any) => api.notifications.createAdminNotice(data), {
    onSuccess: () => onCreated(),
  });

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    let targetIds: string[] | undefined;
    if (targetType === 'SPECIFIC' && targetEmployeeId) {
      const emp = employees.find(e => e.id === targetEmployeeId);
      if (emp?.userId) targetIds = [emp.userId];
      else return alert('O funcionário selecionado não possui um usuário logável vinculado.');
    }
    
    const extraJson = (type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE') ? {
      legalReason, occurrenceDate, suspensionDays
    } : undefined;

    createMut.mutate({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      targetType,
      targetRole: targetType === 'ROLE' ? targetRole : undefined,
      targetIds,
      extraJson,
      requiresReadConfirmation: type === 'SIMPLE_NOTICE' ? requiresReadConfirmation : true,
      requiresAcceptance: type === 'SUSPENSION_NOTICE' || type === 'WARNING_NOTICE' ? true : requiresAcceptance,
      allowsRefusal: type === 'SIMPLE_NOTICE' ? allowsRefusal : false,
    }).catch(() => {});
  };
  
  const handlePrintLegalNotice = () => {
    if (targetType !== 'SPECIFIC' || !targetEmployeeId) return alert('Selecione um funcionário específico para gerar o documento.');
    const emp = employees.find(e => e.id === targetEmployeeId);
    if (!emp) return;
    
    const docTitle = type === 'WARNING_NOTICE' ? 'Aviso de Advertência Escrita' : 'Aviso de Suspensão Disciplinar';
    let text = `<p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Pelo presente documento, aplicamos-lhe a pena de <strong>${docTitle.toUpperCase()}</strong>, em virtude da seguinte ocorrência disciplinar verificada no dia <strong>${occurrenceDate ? new Date(occurrenceDate).toLocaleDateString('pt-BR') : '____/____/______'}</strong>:</p>
    <p style="font-size:11px;color:#0f172a;text-align:justify;line-height:1.6;font-weight:700;margin:16px 0;">Motivo / Embargo Legal: ${legalReason}</p>
    <p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;">Detalhes da Infração:<br/>${message.replace(/\n/g, '<br/>')}</p>`;
    
    if (type === 'SUSPENSION_NOTICE') {
      text += `<p style="font-size:11px;color:#e11d48;text-align:justify;line-height:1.6;font-weight:700;margin:16px 0;">Por consequência, o(a) Sr(a). fica suspenso(a) de suas atividades por ${suspensionDays} dia(s), com desconto em folha de pagamento.</p>`;
    }
    
    text += `<p style="font-size:11px;color:#334155;text-align:justify;line-height:1.6;margin-top:24px;">Esclarecemos que a reincidência em condutas semelhantes poderá resultar em rescisão do contrato de trabalho por justa causa, nos termos do art. 482 da CLT. Solicitamos sua assinatura confirmando o recebimento.</p>`;
    
    const companyInfo2 = company ? {
      name: company.name,
      legalName: company.legalName,
      document: company.cnpj,
      logoUrl: company.logoUrl,
      phone: company.phone,
      email: company.email,
      address: [company.street, company.streetNumber, company.city, company.state].filter(Boolean).join(', '),
    } : null;
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const html = buildPdfShell({ title: docTitle, subtitle: emp.name }, companyInfo2, `
      ${section('Qualificação do Colaborador', infoGrid([
        { label: 'Nome', value: emp.name },
        { label: 'CPF', value: emp.cpf },
        { label: 'Cargo', value: emp.position },
      ], 3))}
      ${section('Teor da Sanção Disciplinar', text)}
      ${signatureBlock(['Assinatura do Empregado', 'Empregador / RH', 'Testemunha 1 (Opcional)', 'Testemunha 2 (Opcional)'])}
    `);
    printPdf(html, `${type === 'WARNING_NOTICE' ? 'advertencia' : 'suspensao'}-${emp.id}.pdf`);
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
            <option value="WARNING_NOTICE">Advertência</option>
            <option value="SUSPENSION_NOTICE">Suspensão</option>
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
          <select value={targetType} onChange={e => { setTargetType(e.target.value); if(e.target.value==='SPECIFIC' && employees[0]) setTargetEmployeeId(employees[0].id); }} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
            <option value="EMPLOYEES">Todos os Funcionários</option>
            <option value="ALL">Todos da empresa (Inclui Gestores/RH)</option>
            <option value="ROLE">Por Função (Cargo)</option>
            <option value="SPECIFIC">Funcionário Específico</option>
          </select>
        </label>
        
        {targetType === 'ROLE' && (
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>PERFIL DE ACESSO</span>
            <select value={targetRole} onChange={e => setTargetRole(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="FUNCIONARIO">Funcionário Base</option>
              <option value="GESTOR">Gestor de Equipe</option>
              <option value="RH">Recursos Humanos</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
        )}
        
        {targetType === 'SPECIFIC' && (
          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>SELECIONAR FUNCIONÁRIO</span>
            <select value={targetEmployeeId} onChange={e => setTargetEmployeeId(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500">
              <option value="">Selecione...</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name} (CPF: {e.cpf})</option>)}
            </select>
          </label>
        )}

        {(type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE') && (
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2 rounded-[8px] border border-red-100 bg-red-50/50 p-4">
            <label className="space-y-1 text-xs font-medium text-slate-600">
              <span>MOTIVO LEGAL (CLT ART. 482)</span>
              <select value={legalReason} onChange={e => setLegalReason(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-red-500">
                <option value="">Selecione a tipificação legal...</option>
                <option value="Art. 482, Alínea E (Desídia no desempenho das funções)">Desídia no desempenho (Atrasos, Faltas Injustificadas)</option>
                <option value="Art. 482, Alínea H (Ato de Insubordinação ou Indisciplina)">Ato de Insubordinação / Indisciplina</option>
                <option value="Art. 482, Alínea B (Incontinência de conduta ou mau procedimento)">Mau Procedimento / Quebra de Regras</option>
                <option value="Art. 482, Alínea A (Ato de Improbidade)">Ato de Improbidade</option>
                <option value="Art. 482, Alínea K (Ato lesivo da honra ou da boa fama)">Ato lesivo à honra contra colegas/superiores</option>
                <option value="Uso indevido de equipamentos da empresa">Uso indevido de EPIs / Equipamentos</option>
                <option value="Não cumprimento de metas contratuais / Níveis de serviço">Baixo desempenho reiterado</option>
                <option value="Outros">Outros motivos justificáveis</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-medium text-slate-600">
              <span>DATA DA OCORRÊNCIA</span>
              <input type="date" value={occurrenceDate} onChange={e => setOccurrenceDate(e.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-red-500" />
            </label>
            {type === 'SUSPENSION_NOTICE' && (
              <label className="space-y-1 text-xs font-medium text-slate-600">
                <span>DIAS DE SUSPENSÃO</span>
                <input type="number" min={1} max={30} value={suspensionDays} onChange={e => setSuspensionDays(parseInt(e.target.value)||1)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-red-500" />
              </label>
            )}
            <div className="sm:col-span-2 mt-2">
              <button type="button" onClick={handlePrintLegalNotice} className="btn-outline-premium h-9 px-4 text-xs font-black inline-flex gap-2 items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                GERAR PDF DA PENALIDADE (IMPRESSÃO)
              </button>
            </div>
          </div>
        )}

        <label className="sm:col-span-2 space-y-1 text-xs font-medium text-slate-600">
          <span>{type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE' ? 'DESCREVA OS DETALHES DA INFRAÇÃO (APARECERÁ NO PDF E NO APP)' : 'MENSAGEM'}</span>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full rounded-[8px] border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500" placeholder="Conteúdo..." />
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
        <button onClick={handleSubmit} disabled={!title.trim() || createMut.loading} className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60">
          {createMut.loading ? 'ENVIANDO...' : (type === 'WARNING_NOTICE' ? 'GERAR ADVERTÊNCIA' : type === 'SUSPENSION_NOTICE' ? 'GERAR SUSPENSÃO' : 'ENVIAR COMUNICADO')}
        </button>
      </div>
      {createMut.error && <p className="mt-2 text-xs text-red-600">{createMut.error}</p>}
    </div>
  );
}

// ─── REGRAS ────────────────────────────────────────────────────────────────────

function RulesTab({ canManage }: { canManage: boolean }) {
  const listQuery = useQuery(() => api.workScheduleRules.list(), []);
  const companyQuery = useQuery(() => api.companies.me(), []);
  const holidaysQuery = useQuery(() => api.companies.getHolidays(), []);
  
  const createMut = useMutation((data: any) => api.workScheduleRules.create(data), { onSuccess: () => listQuery.refetch() });
  const updateMut = useMutation(({ id, data }: { id: string; data: any }) => api.workScheduleRules.update(id, data), { onSuccess: () => listQuery.refetch() });
  const archiveMut = useMutation((id: string) => api.workScheduleRules.archive(id), { onSuccess: () => listQuery.refetch() });
  const activateMut = useMutation((id: string) => api.workScheduleRules.activate(id), { onSuccess: () => listQuery.refetch() });
  const updateCompanyMut = useMutation((data: any) => api.companies.update(data), { onSuccess: () => companyQuery.refetch() });
  const updateHolidaysMut = useMutation((holidays: any[]) => api.companies.updateHolidays(holidays), { onSuccess: () => holidaysQuery.refetch() });

  const rules = (listQuery.data as any[] | undefined) ?? [];
  const company = companyQuery.data;
  const holidays = (holidaysQuery.data as any[] | undefined) ?? [];
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<any | null>(null);

  const openNew = () => { setEditRule(null); setShowForm(true); };
  const openEdit = (r: any) => { setEditRule(r); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditRule(null); };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando regras..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />;

  return (
    <div className="space-y-6">
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
        <div className="flex flex-col items-center justify-center rounded-[16px] border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 mb-4">
            <Settings size={28} className="text-teal-600" />
          </div>
          <h4 className="text-sm font-black text-slate-900">Nenhuma regra de jornada</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">Você ainda não configurou as regras de ponto. Podemos gerar uma regra CLT padrão automaticamente para você.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button onClick={() => {
              createMut.mutate({
                name: 'Padrão CLT 44h',
                description: 'Regra padrão de segunda a sexta, 8h às 18h com 1h12min de almoço',
                standardEntry: '08:00',
                standardExit: '18:00',
                toleranceMinutes: 10,
                lunchBreakMinutes: 72,
                weeklyWorkload: 44,
                overtimeRule: '50%',
                nightShiftExtra: 20
              });
            }} disabled={createMut.loading} className="crystal-button h-10 px-6 rounded-[8px] text-[11px] font-black text-white shadow-md shadow-teal-500/20 transition-all hover:-translate-y-0.5">
              <Zap size={14} className="inline mr-2" />
              GERAR PADRÃO CLT
            </button>
            <button onClick={openNew} className="btn-outline-premium h-10 px-6 rounded-[8px] text-[11px] font-black transition-all hover:-translate-y-0.5">
              CRIAR MANUALMENTE
            </button>
          </div>
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

      <section className="space-y-4 pt-6 border-t border-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-950">CONFIGURAÇÕES GERAIS E FERIADOS</h3>
            <p className="mt-1 text-xs text-slate-500">Defina o dia inicial do ciclo da folha e gerencie os feriados locais/nacionais.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
            <h4 className="text-[11px] font-black text-slate-900 uppercase">Ciclo de Fechamento</h4>
            <p className="text-[10px] text-slate-500 mb-4">Qual dia do mês inicia a contagem da folha de ponto?</p>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="31" defaultValue={(company as any)?.payrollStartDay || 1} onBlur={(e) => {
                if (!canManage) return;
                updateCompanyMut.mutate({ payrollStartDay: parseInt(e.target.value) || 1 });
              }} disabled={!canManage || updateCompanyMut.loading} className="input h-9 w-24 text-center font-bold" />
              <span className="text-xs text-slate-600 font-semibold">Ex: "1" (mês cheio) ou "15" (do dia 15 ao dia 14)</span>
            </div>
            {updateCompanyMut.loading && <p className="text-[10px] text-teal-600 mt-2 font-bold animate-pulse">Salvando...</p>}
          </div>
          <div className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-[11px] font-black text-slate-900 uppercase">Feriados Personalizados</h4>
              <span className="text-[10px] font-bold text-teal-600">{holidays.length} cadastrados</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-40 space-y-2 mb-4">
              {holidays.length === 0 ? <p className="text-[10px] text-slate-400 italic text-center py-4">Nenhum feriado cadastrado.</p> : holidays.map((h, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-700 w-20">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                    <span className="text-[10px] font-bold text-slate-900 truncate max-w-[120px]">{h.name}</span>
                  </div>
                  {canManage && <button onClick={() => updateHolidaysMut.mutate(holidays.filter((_, idx) => idx !== i))} className="text-[10px] text-rose-500 font-bold hover:underline">Remover</button>}
                </div>
              ))}
            </div>
            {canManage && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);

                const date = fd.get('date') as string;
                const name = fd.get('name') as string;
                if (!date || !name) return;
                updateHolidaysMut.mutate([...holidays, { date, name, type: 'NACIONAL' }]);
                e.currentTarget.reset();
              }} className="flex gap-2 mt-auto">
                <input type="date" name="date" required className="input h-8 text-[10px] flex-1" />
                <input type="text" name="name" placeholder="Nome do Feriado" required className="input h-8 text-[10px] flex-1" />
                <button type="submit" disabled={updateHolidaysMut.loading} className="crystal-button h-8 px-3 rounded-[6px] text-[10px] font-bold text-white">+</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
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

function ClosingTab({ canManage, company }: { canManage: boolean; company?: any }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  
  // Modals state
  const [editModal, setEditModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [reopenModal, setReopenModal] = useState<{ open: boolean; item?: any }>({ open: false });
  const [savingId, setSavingId] = useState<string | null>(null);

  const listQuery = useQuery(() => api.timeClosing.list(), []);
  const refresh = () => listQuery.refetch();
  const generateMut = useMutation((value: { month: number; year: number }) => api.timeClosing.generate(value), { onSuccess: refresh });
  const reviewMut = useMutation((id: string) => api.timeClosing.submitReview(id), { onSuccess: refresh });
  const approveMut = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: refresh });
  const closeMut = useMutation((id: string) => api.timeClosing.close(id), { onSuccess: refresh });
  const deleteMut = useMutation((id: string) => api.timeClosing.delete(id), { onSuccess: refresh });
  
  const handleAdjust = async (field: string, value: number, reason: string) => {
    if (!editModal.item) return;
    setSavingId('adjust');
    try { await api.timeClosing.adjust(editModal.item.id, field, value, reason); await refresh(); setEditModal({ open: false }); } 
    catch (err: any) { setError(err?.message ?? 'Erro ao ajustar'); } 
    finally { setSavingId(null); }
  };

  const handleReopen = async (reason: string) => {
    if (!reopenModal.item) return;
    setSavingId('reopen');
    try { await api.timeClosing.reopen(reopenModal.item.id, reason); await refresh(); setReopenModal({ open: false }); } 
    catch (err: any) { setError(err?.message ?? 'Erro ao reabrir'); } 
    finally { setSavingId(null); }
  };

  const closings = (listQuery.data as any[] | undefined) ?? [];
  const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const period = (item: any) => `${new Date(item.periodStart).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(item.periodEnd).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
  const labels: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado' };
  const totals = closings.reduce((acc: any, item: any) => ({
    gross: acc.gross + Number(item.grossPay || 0), inss: acc.inss + Number(item.inssDiscount || 0),
    irrf: acc.irrf + Number(item.irrfDiscount || 0), fgts: acc.fgts + Number(item.fgtsAmount || 0), net: acc.net + Number(item.netPay || 0),
  }), { gross: 0, inss: 0, irrf: 0, fgts: 0, net: 0 });

  const generate = async () => {
    setError(null);
    try { await generateMut.mutate({ month, year }); } catch (err: any) { setError(err?.message ?? 'Erro ao gerar fechamento'); }
  };

  const printClosing = async (summary: any) => {
    const item = await api.timeClosing.getById(summary.id);
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const companyInfo = company ? { name: company.name, legalName: company.legalName, document: company.cnpj, logoUrl: company.logoUrl, phone: company.phone, email: company.email } : null;
    const html = buildPdfShell({ title: 'Memória de Cálculo da Folha', subtitle: `${item.employee.name} | ${period(item)}` }, companyInfo, `
      ${section('Jornada', infoGrid([
        { label: 'Normais', value: `${Number(item.normalHours).toFixed(2)}h` }, { label: 'Extras 50%', value: `${Number(item.overtime50).toFixed(2)}h` },
        { label: 'Extras 100%', value: `${Number(item.overtime100).toFixed(2)}h` }, { label: 'Noturnas', value: `${Number(item.nightShift).toFixed(2)}h` },
        { label: 'Atrasos', value: `${item.lateMinutes} min` }, { label: 'Saídas antecipadas', value: `${item.earlyLeaveMinutes} min` },
      ], 3))}
      ${section('Folha', infoGrid([
        { label: 'Salário base', value: money(item.salaryBase) }, { label: `Valor hora / ${item.monthlyDivisor}`, value: money(item.hourlyRate) },
        { label: 'Extras 50%', value: money(item.overtime50Value) }, { label: 'Extras 100%', value: money(item.overtime100Value) },
        { label: 'Adicional noturno', value: money(item.nightShiftValue) }, { label: 'DSR', value: money(item.dsrValue) },
        { label: 'Desconto jornada', value: `-${money(item.absenceDiscount)}` }, { label: 'INSS', value: `-${money(item.inssDiscount)}` },
        { label: 'IRRF', value: `-${money(item.irrfDiscount)}` }, { label: 'FGTS patronal', value: money(item.fgtsAmount) },
        { label: 'Base de Cálculo', value: money(item.grossPay) }, { label: 'Líquido', value: money(item.netPay) },
      ], 3))}
      ${signatureBlock(['RH / Empregador', 'Contabilidade', 'Colaborador'])}
    `);
    printPdf(html, `fechamento-${item.employee.name}-${item.periodStart.slice(0, 7)}.pdf`);
  };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando fechamentos..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={refresh} />;
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return <section className="space-y-4">
    {editModal.open && editModal.item && <EditClosingModal item={editModal.item} onClose={() => setEditModal({ open: false })} onSave={handleAdjust} saving={savingId === 'adjust'} />}
    {reopenModal.open && reopenModal.item && <ReopenClosingModal onClose={() => setReopenModal({ open: false })} onSave={handleReopen} saving={savingId === 'reopen'} />}
    
    <div><h3 className="text-sm font-black text-slate-950">FECHAMENTO DA FOLHA</h3><p className="mt-1 text-xs text-slate-500">Jornada, proventos, tributos, encargos e líquido por colaborador.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[['Base',totals.gross],['INSS',totals.inss],['IRRF',totals.irrf],['FGTS patronal',totals.fgts],['Líquido',totals.net]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase text-slate-400">{String(label)}</p><p className="mt-1 text-base font-black text-slate-800">{money(value)}</p></div>)}</div>
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end gap-3">
      <label className="text-[10px] font-black text-slate-400">MÊS<select value={month} onChange={e => setMonth(Number(e.target.value))} className="mt-1 block h-10 rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500">{months.map((name,index)=><option key={name} value={index+1}>{name}</option>)}</select></label>
      <label className="text-[10px] font-black text-slate-400">ANO<input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="mt-1 block h-10 w-28 rounded-xl border border-slate-200 px-3 outline-none focus:border-brand-500" /></label>
      <button onClick={generate} disabled={!canManage || generateMut.loading} className="crystal-button h-10 rounded-xl px-5 text-xs font-black text-white disabled:opacity-50">{generateMut.loading ? 'CALCULANDO...' : 'ADICIONAR / RECALCULAR'}</button>
    </div>{error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}</div>
    {closings.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center"><FileCheck2 size={32} className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-black text-slate-500">Nenhum fechamento calculado</p></div> : <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm"><table className="w-full min-w-[1200px] text-left text-xs"><thead className="bg-slate-50/80 uppercase text-slate-400 border-b border-slate-100"><tr><th className="p-4 font-black">Colaborador</th><th className="p-4 font-black">Jornada</th><th className="p-4 font-black">Proventos</th><th className="p-4 font-black">Descontos</th><th className="p-4 font-black">FGTS</th><th className="p-4 font-black">Líquido</th><th className="p-4 font-black">Status</th><th className="p-4 font-black text-right">Ações</th></tr></thead><tbody className="divide-y divide-slate-50">{closings.map((item:any)=><tr key={item.id} className="align-top hover:bg-slate-50/50 transition-colors"><td className="p-4"><p className="font-black text-slate-800">{item.employee?.name}</p><p className="text-[10px] text-slate-500 mt-0.5">{period(item)}</p><p className="text-[10px] text-slate-500">Base {money(item.salaryBase)}</p></td><td className="p-4 space-y-0.5 text-slate-600"><p>50% <span className="font-bold">{Number(item.overtime50).toFixed(2)}h</span></p><p>100% <span className="font-bold">{Number(item.overtime100).toFixed(2)}h</span></p><p>Noturno <span className="font-bold">{Number(item.nightShift).toFixed(2)}h</span></p><p className="text-rose-500">Débito <span className="font-bold">{item.absenceMinutes} min</span></p></td><td className="p-4 space-y-0.5 text-slate-600"><p>Extras {money(Number(item.overtime50Value)+Number(item.overtime100Value))}</p><p>Noturno {money(item.nightShiftValue)}</p><p>DSR {money(item.dsrValue)}</p><p className="text-slate-900 mt-1">Base Cálc. <span className="font-black">{money(item.grossPay)}</span></p></td><td className="p-4 space-y-0.5 text-rose-600"><p>Jornada {money(item.absenceDiscount)}</p><p>INSS {money(item.inssDiscount)}</p><p>IRRF {money(item.irrfDiscount)}</p></td><td className="p-4"><p className="font-black text-slate-800">{money(item.fgtsAmount)}</p><p className="text-[10px] text-slate-400">não descontado</p></td><td className="p-4"><p className="text-base font-black text-emerald-600">{money(item.netPay)}</p></td><td className="p-4"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${item.status==='CLOSED'?'bg-slate-100 text-slate-600':item.status==='APPROVED'?'bg-teal-50 text-teal-700':item.status==='IN_REVIEW'?'bg-sky-50 text-sky-700':'bg-amber-50 text-amber-700'}`}>{labels[item.status] || item.status}</span></td><td className="p-4"><div className="flex flex-wrap justify-end gap-1.5 w-full">
      <button onClick={()=>printClosing(item)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"><FileText size={14}/> PDF</button>
      {canManage && ['DRAFT','IN_REVIEW'].includes(item.status) && <button onClick={() => setEditModal({ open: true, item })} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"><MessageSquare size={14}/> Editar</button>}
      {canManage && item.status==='DRAFT' && <button onClick={()=>reviewMut.mutate(item.id)} className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-sky-700"><Send size={14}/> Revisar</button>}
      {canManage && item.status==='IN_REVIEW' && <button onClick={()=>approveMut.mutate(item.id)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-teal-700"><Check size={14}/> Aprovar</button>}
      {canManage && item.status==='APPROVED' && <button onClick={()=>closeMut.mutate(item.id)} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-black"><Zap size={14}/> Fechar</button>}
      {canManage && item.status==='CLOSED' && <button onClick={() => setReopenModal({ open: true, item })} className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-amber-600"><RefreshCcw size={14}/> Reabrir</button>}
      {canManage && item.status!=='CLOSED' && <button onClick={()=>window.confirm('Excluir este fechamento?')&&deleteMut.mutate(item.id)} className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-[10px] font-black text-white shadow-sm transition-colors hover:bg-rose-600"><XCircle size={14}/> Excluir</button>}
    </div></td></tr>)}</tbody></table></div>}
  </section>;
}


// ─── MODAL DE EDIÇÃO DE FECHAMENTO ─────────────────────────────────────────────
function EditClosingModal({ item, onClose, onSave, saving }: {
  item: any; onClose: () => void; onSave: (field: string, value: number, reason: string) => void; saving: boolean;
}) {
  const [field, setField] = useState('salaryBase');
  const [value, setValue] = useState(String(item[field] || 0));
  const [reason, setReason] = useState('');
  
  useEffect(() => { setValue(String(item[field] || 0)); }, [field, item]);

  const fields = [
    { id: 'salaryBase', label: 'Salário Base (R$)' },
    { id: 'overtime50', label: 'Horas Extras 50% (h)' },
    { id: 'overtime100', label: 'Horas Extras 100% (h)' },
    { id: 'nightShift', label: 'Adicional Noturno (h)' },
    { id: 'absenceMinutes', label: 'Faltas / Atrasos (min)' },
    { id: 'lateMinutes', label: 'Atrasos Ponto (min)' },
    { id: 'earlyLeaveMinutes', label: 'Saídas Antecipadas (min)' },
  ];

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const num = Number(value.replace(',', '.'));
    if (!Number.isFinite(num) || num < 0) return alert('Valor inválido');
    if (!reason.trim()) return alert('Justificativa obrigatória');
    onSave(field, num, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-900">Ajuste Manual da Folha</h3>
          <button onClick={onClose} disabled={saving} className="rounded-full p-2 hover:bg-slate-100"><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-slate-500">Colaborador: <b className="text-black">{item.employee?.name}</b></p>
          <label className="block text-xs font-black text-slate-600">
            CAMPO PARA AJUSTE
            <select value={field} onChange={e => setField(e.target.value)} disabled={saving} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-brand-500">
              {fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-black text-slate-600">
            NOVO VALOR
            <input type="text" value={value} onChange={e => setValue(e.target.value)} disabled={saving} required className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-brand-500" />
          </label>
          <label className="block text-xs font-black text-slate-600">
            JUSTIFICATIVA OBRIGATÓRIA
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} disabled={saving} required placeholder="Ex: Acordo coletivo, Erro de batida..." className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-brand-500" />
          </label>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="crystal-button rounded-lg px-5 py-2 text-sm font-black text-white">{saving ? 'Salvando...' : 'Aplicar Ajuste'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── REOPEN MODAL ─────────────────────────────────────────────
function ReopenClosingModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (reason: string) => void; saving: boolean; }) {
  const [reason, setReason] = useState('');
  const handleSubmit = (e: any) => { e.preventDefault(); if (!reason.trim()) return alert('Obrigatório'); onSave(reason.trim()); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-black text-slate-900">Motivo da reabertura</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input type="text" autoFocus value={reason} onChange={e => setReason(e.target.value)} disabled={saving} required placeholder="Justificativa..." className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none focus:border-brand-500" />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-black text-white hover:bg-amber-600">{saving ? 'Salvando...' : 'Confirmar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// MODAIS
function EventModal({ event, employees, onClose, onSave, saving }: {
  event?: ManagementEvent; employees: Employee[]; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
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

function AsoModal({ record, employees, asos, company, onClose, onSave, saving }: {
  record?: EmployeeAsoRecord; employees: Employee[]; asos: EmployeeAsoRecord[]; company: any; onClose: () => void; onSave: (data: any) => void; saving: boolean;
}) {
  const init = record ?? { employeeId: '', asoType: 'PERIODICO', status: 'PENDENTE', examDate: '', dueDate: '', clinicName: '', doctorName: '', observation: '' };
  const [employeeId, setEmployeeId] = useState(init.employeeId ?? '');
  const [asoType, setAsoType] = useState(init.asoType as string);
  const [status, setStatus] = useState(init.status as string);
  const [examDate, setExamDate] = useState(init.examDate?.slice(0, 16) ?? '');
  const [dueDate, setDueDate] = useState(init.dueDate?.slice(0, 10) ?? '');
  
  // Clinic data
  const [clinicName, setClinicName] = useState(init.clinicName ?? '');
  const [doctorName, setDoctorName] = useState(init.doctorName ?? '');
  const [clinicCep, setClinicCep] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicCity, setClinicCity] = useState('');
  const [clinicState, setClinicState] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [savePreset, setSavePreset] = useState(false);
  const [observation, setObservation] = useState(init.observation ?? '');

  // Presets from API
  const { data: presets } = useQuery(() => api.management.aso.clinicPresets.list(), []);

  // Update due date automatically +12 months when examDate changes
  useEffect(() => {
    if (examDate && !record?.dueDate) {
      const d = new Date(examDate);
      d.setFullYear(d.getFullYear() + 1);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }, [examDate, record]);

  const handleCep = async (val: string) => {
    setClinicCep(val);
    const cleanCep = val.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setClinicAddress(data.logradouro + (data.bairro ? `, ${data.bairro}` : ''));
          setClinicCity(data.localidade);
          setClinicState(data.uf);
        }
      } catch (err) {}
    }
  };

  const applyPreset = (presetId: string) => {
    const p = presets?.find(x => x.id === presetId);
    if (!p) return;
    setClinicName(p.name);
    setClinicCep(p.cep || '');
    setClinicAddress(p.address || '');
    setClinicCity(p.city || '');
    setClinicState(p.state || '');
    setClinicPhone(p.phone || '');
    if (p.doctorName) setDoctorName(p.doctorName);
    setSavePreset(false);
  };

  const handlePrint = () => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return window.alert('Selecione um funcionário antes de imprimir.');
    printAsoPdf(emp, {
      asoType,
      clinicName,
      clinicAddress,
      examDate,
      observation
    }, company);
  };

  const ok = !!employeeId;
  const save = () => {
    if (!ok) return;
    onSave({
      employeeId,
      asoType,
      status,
      examDate: examDate ? new Date(examDate).toISOString() : null,
      dueDate: dueDate || null,
      clinicName: clinicName.trim() || null,
      doctorName: doctorName.trim() || null,
      observation: observation.trim() || null,
      saveClinicPreset: savePreset,
      clinicCep, clinicAddress, clinicCity, clinicState, clinicPhone
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{record ? 'Editar ASO' : 'Agendar ASO'}</h3>
              <p className="text-xs font-semibold text-slate-500">Atestado de Saúde Ocupacional</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
          {/* Col 1: Identificação */}
          <div className="space-y-5">
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px]">1</span>
                Identificação
              </h4>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">Funcionário *</span>
                  <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10">
                    <option value="">Selecione um funcionário...</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Tipo de ASO *</span>
                    <select value={asoType} onChange={e => setAsoType(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10">
                      {ASO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Status</span>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10">
                      {ASO_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Data e Hora do Exame</span>
                    <input type="datetime-local" value={examDate} onChange={e => setExamDate(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"/>
                  </label>
                  <label className="block opacity-70 cursor-not-allowed">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Vencimento (Automático)</span>
                    <input type="date" value={dueDate} readOnly title="O vencimento é calculado automaticamente como 1 ano após a data do exame" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-600 outline-none cursor-not-allowed"/>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Col 2: Clínica / Agendamento */}
          <div className="space-y-5 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
            <div>
              <h4 className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-800">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px]">2</span>
                  Dados da Clínica
                </div>
                {presets && presets.length > 0 && (
                  <select onChange={e => applyPreset(e.target.value)} value="" className="h-8 max-w-[140px] rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-teal-700 outline-none">
                    <option value="">Usar clínica salva...</option>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </h4>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">Nome da Clínica / Local</span>
                  <input value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="Ex: Clínica Saúde Ocupacional" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"/>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">CEP</span>
                    <input value={clinicCep} onChange={e => handleCep(e.target.value)} placeholder="00000-000" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"/>
                  </label>
                  <label className="block col-span-2">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Endereço Completo</span>
                    <input value={clinicAddress} onChange={e => setClinicAddress(e.target.value)} placeholder="Rua, Número, Bairro" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"/>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Médico (Opcional)</span>
                    <input value={doctorName} onChange={e => setDoctorName(e.target.value)} placeholder="Ex: Dr. João Silva" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"/>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold text-slate-600">Telefone</span>
                    <input value={clinicPhone} onChange={e => setClinicPhone(e.target.value)} placeholder="(00) 0000-0000" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"/>
                  </label>
                </div>
                
                {!record && clinicName && (
                  <label className="mt-2 flex items-center gap-2 cursor-pointer rounded-lg bg-teal-50/50 p-2 text-xs font-semibold text-teal-800 border border-teal-100">
                    <input type="checkbox" checked={savePreset} onChange={e => setSavePreset(e.target.checked)} className="h-4 w-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500"/>
                    Salvar esta clínica e médico para usar nos próximos ASOs
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600">Observações Extras</span>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} placeholder="Ex: Funcionário necessita de exame de audiometria complementar..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"/>
          </label>
        </div>

        <div className="mt-8 flex flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
          <button 
            onClick={handlePrint} 
            disabled={!employeeId} 
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 h-12 text-sm font-black text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-teal-600 hover:border-teal-200 disabled:opacity-50 disabled:hover:bg-white"
          >
            <FileText size={18} strokeWidth={2.5}/> GERAR ENCAMINHAMENTO (PDF)
          </button>
          
          <div className="flex gap-3">
            <button onClick={onClose} className="h-12 flex-1 rounded-xl bg-slate-100 px-6 text-sm font-bold text-slate-600 hover:bg-slate-200 sm:flex-none">CANCELAR</button>
            <button onClick={save} disabled={!ok || saving} className="crystal-button h-12 flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 px-8 text-sm font-black text-white shadow-lg shadow-teal-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/40 disabled:opacity-60 sm:flex-none">
              {saving ? 'SALVANDO...' : record ? 'SALVAR ALTERAÇÕES' : 'AGENDAR ASO'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}