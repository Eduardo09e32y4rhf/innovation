'use client';

import { Button } from '@/app/components/ui/button';

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
          <h3 className="text-sm font-semibold text-slate-950">NOTIFICAÇÕES / COMUNICADOS</h3>
          <p className="mt-1 text-xs text-slate-500">Comunicados, alertas, advertências e suspensões.</p>
        </div>
        {canManage && (
          <Button variant="primary" type="button" onClick={() => setShowForm(!showForm)} className=" inline-flex items-center gap-2 px-4 text-xs">
            {showForm ? 'FECHAR' : '+ NOVA NOTIFICAÇÃO'}
          </Button>
        )}
      </div>

      {showForm && <CreateNotificationForm employees={employees} onCreated={() => { listQuery.refetch(); setShowForm(false); }} />}

      <div className="flex flex-wrap gap-2">
        <select aria-label="Filtrar por tipo" value={filterType} onChange={e => setFilterType(e.target.value)} className="input-v2 max-w-[250px]">
          <option value="">TODOS TIPOS</option>
          <option value="SIMPLE_NOTICE">Comunicado</option>
          <option value="PROMOTION_NOTICE">Promoção</option>
          <option value="WARNING_NOTICE">Advertência</option>
          <option value="SUSPENSION_NOTICE">Suspensão</option>
          <option value="SYSTEM">Sistema</option>
        </select>
        <select aria-label="Filtrar por status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-v2 max-w-[250px]">
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
                      <span className={`inline-flex rounded-[5px] border px-1.5 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                      <span className="text-xs font-semibold r text-slate-400">{TYPE_LABEL[n.type] ?? 'Comunicado'}</span>
                      <span className="text-xs text-slate-400">{fmtDateTime(n.createdAt)}</span>
                    </div>
                    {canManage && (n.type === 'WARNING_NOTICE' || n.type === 'SUSPENSION_NOTICE') && (
                      <Button variant="outline" type="button" onClick={() => handleGenerateTermoPdf(n.id)} disabled={pdfId === n.id} className=" px-3 text-xs disabled:opacity-60">{pdfId === n.id ? 'Gerando...' : 'Baixar PDF Legal'}</Button>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="mt-1 text-xs text-slate-600 whitespace-pre-wrap">{n.message}</p>

                  {n.recipients?.map((r: any) => (
                    <div key={r.id} className="mt-3 rounded-lg bg-slate-50 p-3 border border-slate-100">
                      <p className="text-xs font-semibold text-slate-700">Para: {r.user?.name ?? empName(r.employeeId, employees)} · {getStatusBadge(r.status).label}</p>
                      {r.responseJson?.reason && <p className="mt-1 text-xs italic text-slate-500">Motivo da recusa: {r.responseJson.reason}</p>}
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

const TYPE_INFO: Record<string, { label: string; hint: string }> = {
  SIMPLE_NOTICE: { label: 'Comunicado', hint: 'Aviso geral. Aparece para todos assim que entrarem no sistema.' },
  PROMOTION_NOTICE: { label: 'Promoção / reconhecimento', hint: 'Mensagem de parabéns que aparece ao funcionário assim que ele entrar.' },
  WARNING_NOTICE: { label: 'Advertência', hint: 'Documento formal. O funcionário precisa assinar (ou recusar) ao entrar.' },
  SUSPENSION_NOTICE: { label: 'Suspensão', hint: 'Documento formal. Lança os dias no ponto e o desconto entra na folha.' },
};

const TYPE_LABEL: Record<string, string> = { ...Object.fromEntries(Object.entries(TYPE_INFO).map(([k, v]) => [k, v.label])), SYSTEM_NOTICE: 'Sistema', RH_NOTICE: 'RH', VACATION_NOTICE: 'Férias', DOCUMENT_NOTICE: 'Documento', URGENT_NOTICE: 'Urgente', PLATFORM_NOTICE: 'Plataforma' };

function CreateNotificationForm({ employees, onCreated }: { employees: Employee[]; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('SIMPLE_NOTICE');
  const [empId, setEmpId] = useState('');
  const [occurrenceDate, setOccurrenceDate] = useState('');
  const [legalReason, setLegalReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState('1');
  const [newPosition, setNewPosition] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const createMut = useMutation((data: any) => api.notifications.createAdminNotice(data), {
    onSuccess: (res: any) => { setDone(res?.extraJson?.payrollImpact ? `Suspensão registrada. ${res.extraJson.payrollImpact.workedDaysLost} dia(s) de trabalho lançados no ponto, desconto estimado de ${Number(res.extraJson.payrollImpact.estimatedDiscount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} na folha.` : 'Notificação enviada.'); setTimeout(onCreated, 1800); },
    onError: (message) => setError(message),
  });

  const isPenalty = type === 'WARNING_NOTICE' || type === 'SUSPENSION_NOTICE';
  const selected = employees.find((e) => e.id === empId);
  const noAccess = Boolean(selected && !selected.userId);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) return setError('Informe o título.');
    if (!content.trim()) return setError('Escreva o conteúdo da notificação.');
    if (isPenalty && !empId) return setError('Escolha o funcionário.');
    if (isPenalty && !occurrenceDate) return setError('Informe a data da ocorrência.');
    if (isPenalty && legalReason.trim().length < 5) return setError('Descreva o motivo da ocorrência.');
    if (noAccess) return setError(`${selected?.name} ainda não tem usuário de acesso. Vincule um usuário na área Usuários para ele poder receber e assinar.`);
    createMut.mutate({
      title: title.trim(),
      content: content.trim(),
      type,
      ...(empId ? { employeeIds: [empId], targetType: 'SPECIFIC' } : { targetType: 'ALL' }),
      ...(isPenalty ? { occurrenceDate, legalReason: legalReason.trim() } : {}),
      ...(type === 'SUSPENSION_NOTICE' ? { suspensionDays: Number(suspensionDays) } : {}),
      ...(type === 'PROMOTION_NOTICE' ? { newPosition: newPosition.trim() || undefined, newSalary: newSalary ? Number(newSalary.replace(/\./g, '').replace(',', '.')) : undefined, effectiveDate: effectiveDate || undefined } : {}),
    }).catch(() => undefined);
  };

  return (
    <form onSubmit={save} className="surface p-5 animate-in fade-in slide-in-from-top-2">
      <h4 className="mb-1 text-xs font-semibold text-slate-950">Nova notificação</h4>
      <p className="mb-4 text-xs text-slate-500">{TYPE_INFO[type].hint}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="form-group">
          <span>Tipo *</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-v2">
            {Object.entries(TYPE_INFO).map(([value, info]) => <option key={value} value={value}>{info.label}</option>)}
          </select>
        </label>
        <label className="form-group">
          <span>{isPenalty ? 'Funcionário *' : 'Para quem'}</span>
          <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="input-v2">
            <option value="">{isPenalty ? 'Selecione o funcionário' : 'Todos os funcionários'}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}{e.userId ? '' : ' (sem acesso)'}</option>)}
          </select>
        </label>
        <label className="form-group sm:col-span-2">
          <span>Título *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-v2" placeholder={type === 'PROMOTION_NOTICE' ? 'Ex.: Parabéns, você foi promovido(a)!' : 'Ex.: Atrasos recorrentes'} />
        </label>

        {isPenalty && (
          <>
            <label className="form-group">
              <span>Data da ocorrência *</span>
              <input type="date" value={occurrenceDate} onChange={(e) => setOccurrenceDate(e.target.value)} className="input-v2" />
            </label>
            {type === 'SUSPENSION_NOTICE' && (
              <label className="form-group">
                <span>Dias de suspensão * (a partir da data da ocorrência)</span>
                <select value={suspensionDays} onChange={(e) => setSuspensionDays(e.target.value)} className="input-v2">
                  {Array.from({ length: 30 }, (_, index) => index + 1).map((days) => <option key={days} value={days}>{days} {days === 1 ? 'dia' : 'dias'}</option>)}
                </select>
              </label>
            )}
            <label className="form-group sm:col-span-2">
              <span>Motivo *</span>
              <input value={legalReason} onChange={(e) => setLegalReason(e.target.value)} className="input-v2" placeholder="Ex.: Falta sem justificativa nos dias 10 e 11" />
            </label>
          </>
        )}

        {type === 'PROMOTION_NOTICE' && (
          <>
            <label className="form-group"><span>Novo cargo</span><input value={newPosition} onChange={(e) => setNewPosition(e.target.value)} className="input-v2" /></label>
            <label className="form-group"><span>Novo salário (R$)</span><input inputMode="decimal" value={newSalary} onChange={(e) => setNewSalary(e.target.value)} className="input-v2" placeholder="0,00" /></label>
            <label className="form-group"><span>Vale a partir de</span><input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="input-v2" /></label>
          </>
        )}

        <label className="form-group sm:col-span-2">
          <span>{isPenalty ? 'Detalhes da ocorrência *' : 'Mensagem *'}</span>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="input-v2 resize-none" />
        </label>
      </div>

      {type === 'SUSPENSION_NOTICE' && selected?.salary ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
          Desconto estimado na folha: {((Number(selected.salary) / 30) * (Number(suspensionDays) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({suspensionDays || 0} dia(s) de salário). Os dias de trabalho serão lançados automaticamente no ponto.
        </p>
      ) : null}
      {noAccess && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{selected?.name} não tem usuário de acesso. Vincule um usuário na área Usuários antes de enviar.</p>}
      {error && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
      {done && <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{done}</p>}

      <div className="mt-4 flex justify-end">
        <Button variant="primary" type="submit" disabled={createMut.loading || Boolean(done)} className=" px-6">
          {createMut.loading ? 'Enviando...' : isPenalty ? 'Aplicar e notificar' : 'Enviar notificação'}
        </Button>
      </div>
    </form>
  );
}
