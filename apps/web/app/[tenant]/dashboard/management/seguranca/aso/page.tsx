'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileText, Search } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';
import { managementDocumentsApi } from '../../management-documents-api';
import { ComplianceBadge, NeutralBadge } from '../../_components/status-badge';
import { AsoCompleteModal, AsoScheduleModal } from './_modals';
import {
  ASO_TYPE_LABEL,
  COMPLIANCE_LABEL,
  describeDays,
  formatDate,
  sstApi,
  type AsoHistoryRecord,
  type ComplianceRow,
  type ComplianceState,
} from '../../sst-api';

const FILTERS: Array<{ value: '' | ComplianceState; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'NO_ASO', label: 'Sem ASO' },
  { value: 'EXPIRED', label: 'Vencidos' },
  { value: 'INAPTO', label: 'Inaptos' },
  { value: 'EXPIRING', label: 'A vencer' },
  { value: 'VALID', label: 'Em dia' },
];

const STATE_CLASS: Record<string, string> = {
  VALID: 'Válido', EXPIRING: 'A vencer', EXPIRED: 'Vencido', INAPTO: 'Inapto', CANCELED: 'Cancelado', OPEN: 'Em aberto',
};

export default function SegurancaAsoPage() {
  const { user } = useAuth();
  const profile = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const canView = ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CEO', 'CONSULTA'].includes(profile);
  const canManage = ['DEV', 'ADMIN', 'RH'].includes(profile);

  const searchParams = useSearchParams();
  const initial = (searchParams?.get('state') ?? '') as '' | ComplianceState;
  const [state, setState] = useState<'' | ComplianceState>(FILTERS.some((f) => f.value === initial) ? initial : '');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [schedule, setSchedule] = useState<{ employeeId?: string } | null>(null);
  const [completing, setCompleting] = useState<{ recordId: string; name: string } | null>(null);
  const [historyFor, setHistoryFor] = useState<ComplianceRow['employee'] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const list = useQuery(() => sstApi.compliance({ state, search: debounced, page, pageSize: 25 }), [state, debounced, page], { enabled: canView });
  const overview = useQuery(() => sstApi.overview(), [], { enabled: canView });
  const employees = useQuery(() => api.employees.list(), [], { enabled: canView && canManage });

  const refreshAll = () => { list.refetch(); overview.refetch(); };

  if (!canView) return <div className="card-v2 p-6 text-sm text-fg-mut">Seu perfil não tem acesso a esta área.</div>;

  const counts = overview.data?.aso;
  const countFor = (value: '' | ComplianceState) => {
    if (!counts) return null;
    if (value === '') return counts.total;
    return { NO_ASO: counts.noAso, EXPIRED: counts.expired, INAPTO: counts.inapto, EXPIRING: counts.expiring, VALID: counts.valid }[value];
  };
  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.pageSize ?? 25)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-fg">ASO e exames (PCMSO)</h2>
          <p className="mt-0.5 max-w-2xl text-sm text-fg-mut">
            Acompanhe a validade do Atestado de Saúde Ocupacional de cada colaborador ativo. O vencimento é calculado pelo prazo do exame (padrão de 12 meses, NR-7).
          </p>
        </div>
        {canManage ? <Button type="button" variant="primary" onClick={() => setSchedule({})}>Agendar ASO</Button> : null}
      </div>

      {notice ? <div role="status" className="rounded-v2-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</div> : null}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por situação">
        {FILTERS.map((filter) => {
          const active = state === filter.value;
          const count = countFor(filter.value);
          return (
            <button
              key={filter.value || 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => { setState(filter.value); setPage(1); }}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-line text-fg-mut hover:bg-bg-sub'}`}
            >
              {filter.label}
              {count !== null ? <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? 'bg-white/20' : 'bg-bg-sub'}`}>{count}</span> : null}
            </button>
          );
        })}
        <label className="relative ml-auto block w-full sm:w-64">
          <span className="sr-only">Buscar colaborador</span>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-mut" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome ou cargo" className="input-v2 w-full pl-8" />
        </label>
      </div>

      {list.loading && !list.data ? <LoadingState label="Carregando colaboradores..." /> : null}
      {list.error && !list.data ? <ErrorState message={list.error} onRetry={list.refetch} /> : null}

      {list.data ? (
        <section className="card-v2 overflow-hidden" aria-label="Colaboradores e situação do ASO">
          {list.data.items.length === 0 ? (
            <p className="p-8 text-center text-sm text-fg-mut">
              {state || debounced ? 'Nenhum colaborador encontrado com esse filtro.' : 'Nenhum colaborador ativo cadastrado ainda.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line bg-bg-sub text-xs font-semibold uppercase tracking-wide text-fg-mut">
                  <tr>
                    <th scope="col" className="px-4 py-3">Colaborador</th>
                    <th scope="col" className="px-4 py-3">Situação</th>
                    <th scope="col" className="px-4 py-3">Vencimento</th>
                    <th scope="col" className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data.items.map((row) => (
                    <tr key={row.employee.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">{normalizeDisplayName(row.employee.name)}</p>
                        <p className="text-xs text-fg-mut">{row.employee.position ?? 'Cargo não informado'}</p>
                      </td>
                      <td className="px-4 py-3"><ComplianceBadge state={row.state} /></td>
                      <td className="px-4 py-3">
                        {row.dueDate ? (
                          <>
                            <p className="tabular-nums text-fg">{formatDate(row.dueDate)}</p>
                            <p className="text-xs text-fg-mut">{describeDays(row.daysLeft)}</p>
                          </>
                        ) : <span className="text-fg-mut">{COMPLIANCE_LABEL[row.state].label === 'Sem ASO' ? 'Nenhum exame registrado' : '—'}</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {canManage && row.openRecordId ? (
                            <Button type="button" variant="primary" size="sm" onClick={() => setCompleting({ recordId: row.openRecordId!, name: row.employee.name })}>Concluir ASO</Button>
                          ) : null}
                          {canManage && !row.openRecordId && row.state !== 'VALID' ? (
                            <Button type="button" variant="primary" size="sm" onClick={() => setSchedule({ employeeId: row.employee.id })}>Agendar ASO</Button>
                          ) : null}
                          <Button type="button" variant="outline" size="sm" onClick={() => setHistoryFor(row.employee)}>Histórico</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm text-fg-mut">
              <span>{list.data.total} colaboradores</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="tabular-nums">{page} / {totalPages}</span>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {schedule ? (
        <AsoScheduleModal
          employees={(employees.data as Employee[] | undefined) ?? []}
          initialEmployeeId={schedule.employeeId}
          onClose={() => setSchedule(null)}
          onDone={(message) => { setSchedule(null); setNotice(message); refreshAll(); }}
        />
      ) : null}

      {completing ? (
        <AsoCompleteModal
          recordId={completing.recordId}
          employeeName={completing.name}
          onClose={() => setCompleting(null)}
          onDone={(message) => { setCompleting(null); setNotice(message); refreshAll(); }}
        />
      ) : null}

      {historyFor ? (
        <HistoryDrawer employee={historyFor} canManage={canManage} onClose={() => setHistoryFor(null)} onChanged={refreshAll} />
      ) : null}
    </div>
  );
}

function HistoryDrawer({ employee, canManage, onClose, onChanged }: { employee: ComplianceRow['employee']; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const history = useQuery(() => sstApi.history(employee.id), [employee.id]);
  const [pdfId, setPdfId] = useState<string | null>(null);
  const cancel = useMutation((id: string) => api.management.aso.update(id, { status: 'CANCELLED' }), { onSuccess: () => { history.refetch(); onChanged(); } });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const downloadReferral = async (record: AsoHistoryRecord) => {
    setPdfId(record.id);
    try { await managementDocumentsApi.asoReferral(record.id); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'Não foi possível gerar o encaminhamento.'); }
    finally { setPdfId(null); }
  };

  const records = useMemo(() => history.data?.records ?? [], [history.data]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={`Histórico de ASO de ${employee.name}`} className="h-full w-full max-w-md overflow-y-auto bg-bg p-5 shadow-v2-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-fg">{normalizeDisplayName(employee.name)}</h3>
            <p className="text-xs text-fg-mut">{employee.position ?? 'Cargo não informado'}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">Fechar</Button>
        </div>
        {history.loading && !history.data ? <LoadingState label="Carregando histórico..." /> : null}
        {history.error && !history.data ? <ErrorState message={history.error} onRetry={history.refetch} /> : null}
        {history.data && records.length === 0 ? <p className="text-sm text-fg-mut">Nenhum ASO registrado para este colaborador.</p> : null}
        <ol className="space-y-3">
          {records.map((record) => (
            <li key={record.id} className="rounded-v2-md border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-fg">{ASO_TYPE_LABEL[record.asoType] ?? record.asoType}</p>
                <NeutralBadge>{STATE_CLASS[record.state] ?? record.state}</NeutralBadge>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-fg-mut">Exame</dt><dd className="tabular-nums text-fg">{formatDate(record.examDate)}</dd>
                <dt className="text-fg-mut">Vencimento</dt><dd className="tabular-nums text-fg">{formatDate(record.dueDate)}</dd>
                <dt className="text-fg-mut">Resultado</dt><dd className="text-fg">{record.result === 'APTO' ? 'Apto' : record.result === 'INAPTO' ? 'Inapto' : '—'}</dd>
                <dt className="text-fg-mut">Clínica</dt><dd className="truncate text-fg">{record.clinicName ?? '—'}</dd>
              </dl>
              {record.restrictions ? <p className="mt-2 text-xs text-fg-mut"><strong>Restrições:</strong> {record.restrictions}</p> : null}
              {record.examsPerformed?.length ? <p className="mt-1 text-xs text-fg-mut"><strong>Exames:</strong> {record.examsPerformed.join(', ')}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => downloadReferral(record)} disabled={pdfId === record.id}>
                  <FileText size={13} className="mr-1" />{pdfId === record.id ? 'Gerando...' : 'Encaminhamento'}
                </Button>
                {canManage && record.status !== 'COMPLETED' && record.status !== 'CANCELLED' ? (
                  <Button type="button" variant="danger" size="sm" disabled={cancel.loading} onClick={() => { if (window.confirm('Cancelar este ASO?')) cancel.mutate(record.id).catch(() => {}); }}>Cancelar</Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
