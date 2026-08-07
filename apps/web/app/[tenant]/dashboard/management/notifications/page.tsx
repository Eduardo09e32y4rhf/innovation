'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api, type Employee } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';
import { managementDocumentsApi } from '../management-documents-api';
import { Bell, XCircle, X } from 'lucide-react';
import { LoadingState, ErrorState } from '@/app/components/data-states';

function fmtDateTime(v?: string | null) {
  if (!v) return '---';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status: string): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    READ: { label: 'Lida', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    UNREAD: { label: 'Não lida', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    PENDING_RESPONSE: { label: 'Pendente resposta', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    ACKNOWLEDGED: { label: 'Ciente', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ACCEPTED: { label: 'Aceita', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    REFUSED_ACKNOWLEDGMENT: { label: 'Recusada', cls: 'bg-red-50 text-red-700 border-red-200' },
  };
  return map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canManage = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [pdfId, setPdfId] = useState<string | null>(null);

  const listQuery = useQuery(() => api.notifications.list(), []);
  const empQuery = useQuery(() => api.employees.list(), []);
  const respondMut = useMutation(({ id, action, reason }: { id: string; action: 'ACKNOWLEDGE' | 'ACCEPT' | 'REFUSE'; reason?: string }) =>
    api.notifications.respond(id, action, reason), { onSuccess: () => listQuery.refetch() });

  const notifications = useMemo(() => (listQuery.data as any[] | undefined) ?? [], [listQuery.data]);
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

  const handleGenerateTermoPdf = async (notificationId: string) => {
    setPdfId(notificationId);
    try {
      await managementDocumentsApi.notificationLegalNotice(notificationId);
    } catch (error: any) {
      window.alert(error?.message ?? 'Não foi possível gerar o termo disciplinar.');
    } finally {
      setPdfId(null);
    }
  };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando notificações..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} onRetry={listQuery.refetch} />;

  return (
    <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-950">NOTIFICAÇÕES / COMUNICADOS</h3>
          <p className="mt-1 text-xs text-slate-500">Comunicados, alertas, advertências e suspensões.</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary inline-flex h-9 items-center gap-2 px-4 text-xs">
            {showForm ? 'FECHAR' : '+ NOVA NOTIFICAÇÃO'}
          </button>
        )}
      </div>

      {showForm && <CreateNotificationForm employees={employees} onCreated={() => { listQuery.refetch(); setShowForm(false); }} />}

      <div className="flex flex-wrap gap-2">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-control max-w-[250px]">
          <option value="">TODOS TIPOS</option>
          <option value="SIMPLE_NOTICE">Comunicado</option>
          <option value="PROMOTION_NOTICE">Promoção</option>
          <option value="WARNING_NOTICE">Advertência</option>
          <option value="SUSPENSION_NOTICE">Suspensão</option>
          <option value="SYSTEM">Sistema</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-control max-w-[250px]">
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
          <div className="surface p-8 text-center">
            <Bell size={32} className="mx-auto text-slate-300" />
            <p className="mt-2 text-xs font-semibold text-slate-500">Nenhuma notificação encontrada.</p>
          </div>
        ) : filtered.map((n: any) => {
          const recipientStatus = n.recipients?.[0]?.status ?? 'UNREAD';
          const badge = getStatusBadge(recipientStatus);

          return (
            <div key={n.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-[9px] font-black ${badge.cls}`}>{badge.label}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{n.type?.replace(/_/g, ' ') ?? 'COMUNICADO'}</span>
                      <span className="text-[10px] text-slate-400">{fmtDateTime(n.createdAt)}</span>
                    </div>
                    {canManage && (n.type === 'WARNING_NOTICE' || n.type === 'SUSPENSION_NOTICE') && (
                      <button onClick={() => handleGenerateTermoPdf(n.id)} disabled={pdfId === n.id} className="btn-outline h-7 px-3 text-[9px] uppercase disabled:opacity-60">{pdfId === n.id ? 'Gerando...' : 'Baixar PDF Legal'}</button>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-900">{n.title}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{n.content}</p>
                  
                  {n.recipients?.map((r: any) => (
                    <div key={r.id} className="mt-3 rounded-lg bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[11px] font-black text-slate-700">Para: {empName(r.employeeId, employees)}</p>
                      {r.responseReason && <p className="mt-1 text-[10px] italic text-slate-500">Motivo: {r.responseReason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function empName(id: string, employees: Employee[]) {
  return employees.find(e => e.id === id)?.name ?? 'Todos / Geral';
}

function CreateNotificationForm({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('SIMPLE_NOTICE');
  const [empId, setEmpId] = useState('');
  const [reqResp, setReqResp] = useState(false);
  const [reqAck, setReqAck] = useState(false);
  const createMut = useMutation((data: any) => api.notifications.createAdminNotice(data), { onSuccess: onCreated });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createMut.mutate({
      title: title.trim(),
      content: content.trim(),
      type,
      recipientEmployeeIds: empId ? [empId] : [],
      requiresResponse: reqResp,
      requiresAcknowledgment: reqAck,
    });
  };

  return (
    <form onSubmit={save} className="surface p-5 animate-in fade-in slide-in-from-top-2">
      <h4 className="mb-4 text-xs font-black uppercase text-slate-950">Enviar Notificação</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-group sm:col-span-2">
          <span>Título *</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} className="form-control" />
        </label>
        <label className="form-group">
          <span>Tipo *</span>
          <select value={type} onChange={e => setType(e.target.value)} className="form-control">
            <option value="SIMPLE_NOTICE">Comunicado Geral / Simples</option>
            <option value="PROMOTION_NOTICE">Promoção / Mérito</option>
            <option value="WARNING_NOTICE">Advertência</option>
            <option value="SUSPENSION_NOTICE">Suspensão</option>
          </select>
        </label>
        <label className="form-group">
          <span>Destinatário</span>
          <select value={empId} onChange={e => setEmpId(e.target.value)} className="form-control">
            <option value="">Todos os funcionários (Mural)</option>
            {employees.map(e => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
          </select>
        </label>
        <label className="form-group sm:col-span-2">
          <span>Conteúdo *</span>
          <textarea required value={content} onChange={e => setContent(e.target.value)} rows={4} className="form-control resize-none" />
        </label>
        
        <div className="sm:col-span-2 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 border border-slate-100">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={reqAck} onChange={e => setReqAck(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]" />
            Exigir ciente (O funcionário precisa clicar em 'Ciente' ao ver a notificação)
          </label>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={reqResp} onChange={e => setReqResp(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--color-brand)] focus:ring-[var(--color-brand)]" />
            Exigir aceite / resposta detalhada
          </label>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={createMut.loading} className="btn-primary px-6">
          {createMut.loading ? 'Enviando...' : 'Enviar Notificação'}
        </button>
      </div>
    </form>
  );
}
