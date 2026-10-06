'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Download, Plus, RefreshCw, Search } from 'lucide-react';
import { Button, ConfirmDialog, Modal, PageHeader } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { API_URL, api, type CreateVacationInput, type Employee } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { VACATION_STATUS_LABEL, formatDate, formatPeriod } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { hasPermission } from '@/app/lib/permissions';
import { acquisitionWindow, availableDays, diffDays, processVacationDecisions, type VacationEntitlement, type VacationRow } from './vacation-data';

type Tab = 'active' | 'rejected' | 'history' | 'alerts';
type Decision = { ids: string[]; status: 'APPROVED' | 'REJECTED' };
const tabs: { value: Tab; label: string }[] = [{ value: 'active', label: 'Ativas' }, { value: 'rejected', label: 'Recusadas' }, { value: 'history', label: 'Histórico' }, { value: 'alerts', label: 'Avisos' }];

export default function VacationsPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase() ?? '';
  const canApprove = ['ADMIN', 'RH', 'DEV'].includes(profile) && hasPermission(user, 'vacations.approve');
  const canRequest = canApprove || hasPermission(user, 'vacations.request_own') || hasPermission(user, 'vacations.request_team');
  const vacations = useQuery(() => api.vacations.list(), [], { pollMs: 30000 });
  const employees = useQuery(() => api.employees.list(), []);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [month, setMonth] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const decisionLock = useRef(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof processVacationDecisions>>>([]);
  const [receiptDownloadingId, setReceiptDownloadingId] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState('');
  const rows = (vacations.data ?? []) as VacationRow[];
  const isSelfOnly = profile === 'FUNCIONARIO';
  const ownEmployeeId = isSelfOnly && employees.data?.length === 1 ? employees.data[0].id : '';

  useEffect(() => {
    const readView = () => {
      const params = new URLSearchParams(window.location.search);
      const candidate = params.get('tab');
      setTab(tabs.some(item => item.value === candidate) && (candidate !== 'alerts' || canApprove) ? candidate as Tab : 'active');
      setEmployeeFilter(isSelfOnly ? '' : params.get('employeeId') ?? '');
      setMonth(/^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month') : '');
    };
    readView(); window.addEventListener('popstate', readView);
    return () => window.removeEventListener('popstate', readView);
  }, [canApprove, isSelfOnly]);
  useEffect(() => {
    setOpen(false); setDecision(null); setSelectedRows([]); setResults([]); setReceiptError('');
  }, [user?.id, user?.companyId]);
  useEffect(() => {
    if (!vacations.data) return;
    setSelectedRows(previous => previous.filter(id => vacations.data.some(row => row.id === id && row.status === 'PENDING')));
  }, [vacations.data]);

  function changeTab(value: Tab) {
    setTab(value);
    const url = new URL(window.location.href); url.searchParams.set('tab', value);
    window.history.replaceState(null, '', url.pathname + url.search);
  }
  const filteredRows = rows.filter(row => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = !term || normalizeDisplayName(row.employee?.name ?? '').toLocaleLowerCase('pt-BR').includes(term) || row.acquisitionPeriod.includes(term);
    const matchesMonth = !month || (row.startDate.slice(0, 7) <= month && row.endDate.slice(0, 7) >= month);
    return matchesSearch && matchesMonth && (!employeeFilter || row.employeeId === employeeFilter);
  });
  const activeRows = filteredRows.filter(row => row.status === 'PENDING');
  const rejectedRows = filteredRows.filter(row => row.status === 'REJECTED');
  const historyRows = filteredRows.filter(row => ['APPROVED', 'COMPLETED', 'CANCELLED'].includes(row.status));
  const displayRows = (tab === 'active' ? activeRows : tab === 'rejected' ? rejectedRows : historyRows).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  const visibleSelection = activeRows.filter(row => selectedRows.includes(row.id)).map(row => row.id);
  const allSelected = activeRows.length > 0 && visibleSelection.length === activeRows.length;
  function toggle(id: string) { setSelectedRows(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]); }
  function selectAll() { setSelectedRows(previous => allSelected ? previous.filter(id => !activeRows.some(row => row.id === id)) : [...new Set([...previous, ...activeRows.map(row => row.id)])]); }

  const alertItems = useMemo(() => {
    const byId = new Map<string, { employee: Employee; entitlement: VacationEntitlement }>();
    for (const row of filteredRows) {
      if (!row.entitlement || !row.employee) continue;
      const daysUntilDeadline = Math.ceil((Date.parse(row.entitlement.concessionEnd) - Date.now()) / 86400000);
      if (daysUntilDeadline <= 90 && availableDays(row.entitlement) > 0) byId.set(row.entitlement.id, { employee: row.employee, entitlement: row.entitlement });
    }
    return [...byId.values()].sort((a, b) => a.entitlement.concessionEnd.localeCompare(b.entitlement.concessionEnd));
  }, [vacations.data, search, employeeFilter, month]);

  async function saveDecision() {
    if (!decision || decisionLock.current) return;
    decisionLock.current = true; setBusy(true);
    const actor = readAuthSession().token;
    try {
      // Reconcilia a seleção com o servidor antes de decidir; nenhum sucesso é repetido.
      const freshRows = await api.vacations.list();
      const outcome = await processVacationDecisions(decision.ids, freshRows, async id => {
        if (readAuthSession().token !== actor) throw new Error('O contexto da sessão mudou. Atualize a lista.');
        return api.vacations.updateStatus(id, decision.status);
      });
      setResults(outcome);
      setSelectedRows(previous => previous.filter(id => !outcome.some(result => result.id === id && result.success)));
      setDecision(null); vacations.refetch();
    } catch (error) {
      setResults(decision.ids.map(id => ({ id, success: false, message: error instanceof Error ? error.message : 'Não foi possível atualizar a lista.' })));
      setDecision(null);
    } finally { setBusy(false); decisionLock.current = false; }
  }

  async function downloadReceipt(row: VacationRow) {
    if (receiptDownloadingId) return;
    setReceiptDownloadingId(row.id); setReceiptError('');
    try {
      const token = readAuthSession().token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');
      const response = await fetch(API_URL + '/vacations/' + encodeURIComponent(row.id) + '/receipt.pdf', { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.message || 'Não foi possível emitir o recibo oficial.'); }
      const filename = (response.headers.get('content-disposition') ?? '').match(/filename="([^"]+)"/i)?.[1];
      const url = URL.createObjectURL(await response.blob());
      try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename ? decodeURIComponent(filename) : 'recibo-ferias-' + row.id + '.pdf'; anchor.click(); }
      finally { URL.revokeObjectURL(url); }
    } catch (error) { setReceiptError(error instanceof Error ? error.message : 'Não foi possível emitir o recibo.'); }
    finally { setReceiptDownloadingId(null); }
  }
  function rowActions(row: VacationRow) {
    return <div className="flex flex-wrap gap-2">
      {row.status === 'PENDING' && canApprove && <>
        <Button type="button" variant="outline" disabled={busy} onClick={() => setDecision({ ids: [row.id], status: 'APPROVED' })}><Check size={18} aria-hidden="true" /> Aprovar</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => setDecision({ ids: [row.id], status: 'REJECTED' })}>Rejeitar</Button>
      </>}
      {['APPROVED', 'COMPLETED'].includes(row.status) && <Button type="button" variant="outline" disabled={!!receiptDownloadingId} aria-busy={receiptDownloadingId === row.id} onClick={() => downloadReceipt(row)}><Download size={18} aria-hidden="true" />{receiptDownloadingId === row.id ? 'Emitindo…' : 'Recibo oficial'}</Button>}
    </div>;
  }
  return <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6">
    <PageHeader title="Férias" subtitle={profile === 'FUNCIONARIO' ? 'Acompanhe suas solicitações e períodos de descanso.' : 'Acompanhe as solicitações da equipe e os períodos aquisitivos.'} actions={<>
      <Button type="button" variant="outline" disabled={vacations.loading} onClick={() => { vacations.refetch(); employees.refetch(); }}><RefreshCw size={18} aria-hidden="true" /> Atualizar</Button>
      {canRequest && <Button type="button" onClick={() => setOpen(true)}><Plus size={18} aria-hidden="true" /> Nova solicitação</Button>}
    </>} />
    <section aria-label="Solicitações nos filtros atuais" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Pendentes', 'PENDING'], ['Aprovadas', 'APPROVED'], ['Concluídas', 'COMPLETED'], ['Recusadas', 'REJECTED']].map(([label, value]) => <article key={value} className="card-v2 p-4"><p className="text-sm text-fg-sub">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{vacations.data ? filteredRows.filter(row => row.status === value).length : '—'}</p></article>)}</section>
    <section className="card-v2 p-4" aria-label="Filtros de férias">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1 text-sm font-medium">Buscar por funcionário ou período<input className="input-v2 mt-1 text-base sm:text-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou período aquisitivo" /></label>
        {!isSelfOnly && <label className="space-y-1 text-sm font-medium">Funcionário<select className="input-v2 mt-1 text-base sm:text-sm" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}><option value="">Todos no escopo autorizado</option>{(employees.data ?? []).map(employee => <option key={employee.id} value={employee.id}>{employeeOptionLabel(employee)}</option>)}</select></label>}
        <label className="space-y-1 text-sm font-medium">Mês do descanso<input type="month" className="input-v2 mt-1 text-base sm:text-sm" value={month} onChange={e => setMonth(e.target.value)} /></label>
      </div>
      {(search || employeeFilter || month) && <Button type="button" variant="ghost" className="mt-3" onClick={() => { setSearch(''); setEmployeeFilter(''); setMonth(''); const url = new URL(window.location.href); url.searchParams.delete('employeeId'); url.searchParams.delete('month'); window.history.replaceState(null, '', url.pathname + url.search); }}>Limpar filtros</Button>}
    </section>
    <nav aria-label="Visões de férias" className="flex flex-wrap gap-2">{tabs.filter(item => item.value !== 'alerts' || canApprove).map(item => <Button type="button" key={item.value} variant={tab === item.value ? 'primary' : 'outline'} aria-pressed={tab === item.value} onClick={() => changeTab(item.value)}>{item.label} ({vacations.data ? item.value === 'active' ? activeRows.length : item.value === 'rejected' ? rejectedRows.length : item.value === 'history' ? historyRows.length : alertItems.length : '—'})</Button>)}</nav>
    {vacations.error && <ErrorState message={vacations.error} onRetry={vacations.refetch} />}
    {results.length > 0 && <section aria-label="Resultado das decisões" aria-live="polite" className="card-v2 space-y-2 p-4"><h2 className="font-semibold">{results.filter(result => result.success).length} de {results.length} decisões salvas</h2>{results.map(result => <p key={result.id} className={result.success ? 'text-sm text-emerald-800' : 'text-sm text-rose-800'}>{normalizeDisplayName(rows.find(row => row.id === result.id)?.employee?.name ?? 'Solicitação')} · {result.message}</p>)}</section>}
    {receiptError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{receiptError}</p><Button type="button" variant="ghost" onClick={() => setReceiptError('')}>Fechar aviso</Button></div>}
    {canApprove && tab === 'active' && activeRows.length > 0 && <div className="card-v2 flex flex-wrap items-center justify-between gap-3 p-4">
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-purple-700" checked={allSelected} disabled={busy} onChange={selectAll} /> Selecionar todas as {activeRows.length} pendentes visíveis</label>
      <Button type="button" disabled={visibleSelection.length === 0 || busy} onClick={() => setDecision({ ids: visibleSelection, status: 'APPROVED' })}>Aprovar selecionadas ({visibleSelection.length})</Button>
    </div>}
    {vacations.loading && !vacations.data ? <LoadingState label="Carregando solicitações…" /> : !vacations.data ? null : tab === 'alerts' ? <section className="card-v2 space-y-4 p-4"><h2 className="font-semibold">Prazos e saldo dos ciclos registrados</h2><p className="text-sm text-fg-sub">Avisos usam os períodos e saldos retornados pelo servidor. Funcionários sem um ciclo registrado precisam de consulta no formulário; esta lista não comprova ausência de pendências.</p>{alertItems.length === 0 ? <EmptyState message="Nenhum ciclo registrado com saldo e prazo próximo nos filtros atuais." /> : alertItems.map(item => <article key={item.entitlement.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold text-amber-950">{normalizeDisplayName(item.employee.name)}</h3><p className="mt-1 text-sm text-amber-900">Admissão: {formatDate(item.employee.admissionDate)} · Período: {formatPeriod(item.entitlement.acquisitionStart, item.entitlement.acquisitionEnd)}</p><p className="mt-1 text-sm text-amber-900">Prazo concessivo: {formatDate(item.entitlement.concessionEnd)} · Saldo disponível: {availableDays(item.entitlement)} dias</p>{canRequest && <Button type="button" variant="outline" className="mt-3" onClick={() => { setEmployeeFilter(item.employee.id); setOpen(true); }}>Solicitar para este funcionário</Button>}</article>)}</section> : displayRows.length === 0 ? <EmptyState message={rows.length === 0 ? 'Nenhuma solicitação de férias registrada.' : 'Nenhuma solicitação nesta visão e nos filtros atuais.'} /> : <>
      <div className="space-y-3 md:hidden">{displayRows.map(row => <article key={row.id} className="card-v2 space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><h2 className="break-words font-semibold">{normalizeDisplayName(row.employee?.name ?? 'Funcionário')}</h2><StatusBadge row={row} /></div>
        <p className="text-sm">{formatPeriod(row.startDate, row.endDate)} · {row.daysUsed} dias</p>
        <dl className="grid gap-2 text-sm"><div><dt className="text-fg-sub">Período aquisitivo</dt><dd>{row.acquisitionPeriod}</dd></div>{!!row.soldDays && <div><dt className="text-fg-sub">Abono</dt><dd>{row.soldDays} dias</dd></div>}{row.observation && <div><dt className="text-fg-sub">Observação</dt><dd className="break-words">{row.observation}</dd></div>}</dl>
        {canApprove && tab === 'active' && <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={selectedRows.includes(row.id)} onChange={() => toggle(row.id)} disabled={busy} className="h-5 w-5 accent-purple-700" /> Selecionar solicitação</label>}
        {rowActions(row)}
      </article>)}</div>
      <section className="card-v2 hidden md:block"><div role="region" aria-label="Tabela de solicitações de férias" tabIndex={0} className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <caption className="sr-only">Solicitações de férias no escopo autorizado</caption>
        <thead className="border-b border-border bg-bg-sub text-fg-sub"><tr>{canApprove && tab === 'active' && <th scope="col" className="px-4 py-3">Selecionar</th>}{['Funcionário', 'Período aquisitivo', 'Descanso', 'Dias / abono', 'Status', 'Observação', 'Ações'].map(label => <th scope="col" className="px-4 py-3 font-medium" key={label}>{label}</th>)}</tr></thead>
        <tbody>{displayRows.map(row => <tr key={row.id} className="border-b border-border last:border-0">
          {canApprove && tab === 'active' && <td className="px-4 py-4"><label className="flex min-h-11 min-w-11 items-center justify-center"><span className="sr-only">Selecionar férias de {row.employee?.name}, {formatPeriod(row.startDate, row.endDate)}</span><input type="checkbox" checked={selectedRows.includes(row.id)} disabled={busy} onChange={() => toggle(row.id)} className="h-5 w-5 accent-purple-700" /></label></td>}
          <th scope="row" className="px-4 py-4 font-semibold">{normalizeDisplayName(row.employee?.name ?? 'Funcionário')}</th><td className="px-4 py-4">{row.acquisitionPeriod}</td><td className="px-4 py-4">{formatPeriod(row.startDate, row.endDate)}</td><td className="px-4 py-4">{row.daysUsed} dias{row.soldDays ? ' / ' + row.soldDays + ' vendidos' : ''}</td><td className="px-4 py-4"><StatusBadge row={row} /></td><td className="max-w-xs break-words px-4 py-4">{row.observation || '—'}</td><td className="px-4 py-4">{rowActions(row)}</td>
        </tr>)}</tbody>
      </table></div></section>
    </>}
    {open && <NewVacationModal key={user?.companyId} employees={employees.data ?? []} employeeError={employees.error} employeeLoading={employees.loading} onRetryEmployees={employees.refetch} existingVacations={rows} initialEmployeeId={isSelfOnly ? ownEmployeeId : employeeFilter} lockEmployee={isSelfOnly} onClose={() => setOpen(false)} onDone={() => { setOpen(false); vacations.refetch(); }} />}
    <ConfirmDialog isOpen={!!decision} onClose={() => !busy && setDecision(null)} title={decision?.status === 'REJECTED' ? 'Rejeitar solicitação' : 'Aprovar férias'} description={decision ? decision.ids.map(id => { const row = rows.find(item => item.id === id); return normalizeDisplayName(row?.employee?.name ?? 'Funcionário') + ': ' + formatPeriod(row?.startDate, row?.endDate); }).join('; ') : ''} confirmText={decision?.status === 'REJECTED' ? 'Rejeitar solicitação' : 'Aprovar ' + (decision?.ids.length ?? 0) + ' solicitação(ões)'} variant={decision?.status === 'REJECTED' ? 'danger' : 'primary'} isLoading={busy} onConfirm={saveDecision} />
  </div>;
}

function StatusBadge({ row }: { row: VacationRow }) { return <span className="inline-flex rounded-full bg-bg-sub px-2.5 py-1 text-xs font-medium">{VACATION_STATUS_LABEL[row.status] ?? row.status}</span>; }
function employeeOptionLabel(employee: Employee) { return normalizeDisplayName(employee.name) + ' · ' + (employee.registration || employee.id.slice(0, 8).toUpperCase()); }

function NewVacationModal({ employees, existingVacations, initialEmployeeId, lockEmployee, employeeError, employeeLoading, onRetryEmployees, onClose, onDone }: { employees: Employee[]; existingVacations: VacationRow[]; initialEmployeeId: string; lockEmployee?: boolean; employeeError?: string | null; employeeLoading: boolean; onRetryEmployees: () => void; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ employeeId: initialEmployeeId, acquisitionPeriod: (new Date().getFullYear() - 1) + '/' + new Date().getFullYear(), startDate: '', endDate: '' });
  const [observation, setObservation] = useState('');
  const [sellDays, setSellDays] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [entitlements, setEntitlements] = useState<VacationEntitlement[] | null>(null);
  const [entitlementError, setEntitlementError] = useState('');
  const [retry, setRetry] = useState(0);
  const [entitlementLoading, setEntitlementLoading] = useState(false);
  const selectedEmployee = employees.find(employee => employee.id === form.employeeId);
  const days = diffDays(form.startDate, form.endDate);
  const window = selectedEmployee?.admissionDate && form.startDate ? acquisitionWindow(selectedEmployee.admissionDate, form.startDate) : null;
  const entitlement = window ? entitlements?.find(item => item.acquisitionStart.slice(0, 10) === window.from) : null;
  const balance = entitlement ? availableDays(entitlement) : null;
  const soldDays = sellDays ? 10 : 0;
  const overlap = existingVacations.find(row => row.employeeId === form.employeeId && ['PENDING', 'APPROVED'].includes(row.status) && form.startDate <= row.endDate.slice(0, 10) && form.endDate >= row.startDate.slice(0, 10));
  const currentEligibility = selectedEmployee?.admissionDate ? acquisitionWindow(selectedEmployee.admissionDate, new Date().toISOString().slice(0, 10)) : null;
  const valid = !!selectedEmployee && !!currentEligibility && !!window && /^\d{4}\/\d{4}$/.test(form.acquisitionPeriod) && days >= 5 && days <= 30 && !overlap && (balance === null || days + soldDays <= balance) && (!sellDays || !entitlement || soldDays <= Math.floor(entitlement.entitledDays / 3)) && !employeeError && !entitlementLoading;
  const create = useMutation(() => {
    const payload: CreateVacationInput & { soldDays: number } = { employeeId: form.employeeId, acquisitionPeriod: form.acquisitionPeriod, startDate: form.startDate + 'T12:00:00.000Z', endDate: form.endDate + 'T12:00:00.000Z', daysUsed: days, soldDays, observation: observation || undefined };
    return api.vacations.create(payload);
  }, { onSuccess: onDone });

  useEffect(() => {
    if (!form.employeeId) { setEntitlements(null); return; }
    const controller = new AbortController();
    setEntitlements(null); setEntitlementLoading(true); setEntitlementError('');
    const token = readAuthSession().token;
    fetch(API_URL + '/vacations/employee/' + encodeURIComponent(form.employeeId) + '/entitlements', { signal: controller.signal, headers: { Authorization: 'Bearer ' + (token ?? '') } })
      .then(async response => { if (!response.ok) throw new Error('Não foi possível consultar os ciclos e saldos.'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setEntitlements(data); })
      .catch(error => { if (!controller.signal.aborted) setEntitlementError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setEntitlementLoading(false); });
    return () => controller.abort();
  }, [form.employeeId, retry]);
  useEffect(() => { if (window) setForm(previous => ({ ...previous, acquisitionPeriod: window.label })); }, [window?.label]);
  function close() { if (create.loading) return; if (form.startDate || form.endDate || observation || sellDays || form.employeeId !== initialEmployeeId) setDiscard(true); else onClose(); }
  if (discard) return <ConfirmDialog isOpen onClose={() => setDiscard(false)} onConfirm={onClose} title="Descartar solicitação?" description="As datas e observações preenchidas ainda não foram enviadas." confirmText="Descartar preenchimento" cancelText="Continuar preenchendo" />;
  return <Modal isOpen onClose={close} title="Nova solicitação de férias" description="Escolha o funcionário, o período e as datas. Campos com * são obrigatórios." maxWidth="max-w-2xl" footer={<><Button type="button" variant="outline" disabled={create.loading} onClick={close}>Cancelar</Button><Button type="submit" form="vacation-request" disabled={!valid} isLoading={create.loading}>Solicitar férias</Button></>}>
    <form id="vacation-request" className="space-y-4" onSubmit={event => { event.preventDefault(); if (valid && !create.loading) create.mutate().catch(() => {}); }}>
      {create.error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{create.error}</p>}
      {employeeError && <ErrorState message={employeeError} onRetry={onRetryEmployees} />}
      {lockEmployee
        ? <p className="rounded-lg border border-border bg-bg-sub p-3 text-sm">Solicitação em seu nome{selectedEmployee ? ': ' + normalizeDisplayName(selectedEmployee.name) : ''}.</p>
        : <label className="block space-y-1 text-sm font-medium">Funcionário *<select required className="input-v2 text-base" value={form.employeeId} disabled={employeeLoading} onChange={event => { setSellDays(false); setForm(previous => ({ ...previous, employeeId: event.target.value })); }}><option value="">{employeeLoading ? 'Carregando funcionários…' : 'Selecione o funcionário'}</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employeeOptionLabel(employee)}</option>)}</select></label>}
      {selectedEmployee && <p className="rounded-lg border border-border bg-bg-sub p-3 text-sm">{currentEligibility ? 'Tempo mínimo de admissão cumprido.' : 'O funcionário ainda não completou o período de admissão exigido pelo serviço.'} Admissão: {formatDate(selectedEmployee.admissionDate)}.</p>}
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1 text-sm font-medium">Início *<input type="date" required className="input-v2 text-base" value={form.startDate} onChange={event => setForm(previous => ({ ...previous, startDate: event.target.value }))} /></label><label className="space-y-1 text-sm font-medium">Fim *<input type="date" required min={form.startDate || undefined} className="input-v2 text-base" value={form.endDate} onChange={event => setForm(previous => ({ ...previous, endDate: event.target.value }))} /></label></div>
      <label className="block space-y-1 text-sm font-medium">Período aquisitivo *<input required pattern="\d{4}/\d{4}" className="input-v2 text-base" value={form.acquisitionPeriod} onChange={event => setForm(previous => ({ ...previous, acquisitionPeriod: event.target.value }))} aria-describedby="vacation-period-help" /></label>
      <p id="vacation-period-help" className="text-sm text-fg-sub">Formato AAAA/AAAA. O servidor confirma o ciclo aplicável ao início informado.</p>
      <div aria-live="polite" className="rounded-lg border border-border bg-bg-sub p-4"><p className="font-semibold">{days} dias de descanso{sellDays ? ' + 10 dias de abono' : ''}</p><p className="mt-1 text-sm text-fg-sub">{entitlementLoading ? 'Consultando saldo…' : balance !== null ? 'Saldo disponível neste ciclo: ' + balance + ' dias. Já usados: ' + entitlement.usedDays + '; vendidos: ' + entitlement.soldDays + '; reservados: ' + entitlement.reservedDays + '.' : 'Saldo ainda não confirmado para este ciclo. O serviço valida o direito, faltas e reservas ao enviar.'}</p>{entitlement && <p className="mt-1 text-sm">Prazo concessivo: {formatDate(entitlement.concessionEnd)}</p>}</div>
      {entitlementError && <div role="alert" className="space-y-2 text-sm text-amber-900"><p>{entitlementError} O saldo será validado no envio.</p><Button type="button" variant="outline" onClick={() => setRetry(value => value + 1)}>Consultar saldo novamente</Button></div>}
      {days > 0 && (days < 5 || days > 30) && <p role="alert" className="text-sm text-rose-800">Informe um período de 5 a 30 dias, conforme a validação atual do serviço.</p>}
      {overlap && form.startDate && form.endDate && <p role="alert" className="text-sm text-rose-800">Já existe uma solicitação pendente ou aprovada em {formatPeriod(overlap.startDate, overlap.endDate)}.</p>}
      {balance !== null && days + soldDays > balance && <p role="alert" className="text-sm text-rose-800">Dias de descanso e abono excedem o saldo deste ciclo.</p>}
      <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-purple-700" checked={sellDays} disabled={!currentEligibility} onChange={event => setSellDays(event.target.checked)} /><span><span className="font-medium">Solicitar abono pecuniário de 10 dias</span><span className="mt-1 block text-fg-sub">Os dias vendidos consomem saldo. A elegibilidade e o limite de abono são confirmados pelo servidor.</span></span></label>
      {sellDays && entitlement && soldDays > Math.floor(entitlement.entitledDays / 3) && <p role="alert" className="text-sm text-rose-800">O direito deste ciclo não permite vender 10 dias. Desmarque o abono para continuar.</p>}
      <label className="block space-y-1 text-sm font-medium">Observação (opcional)<textarea className="input-v2 min-h-24 text-base" value={observation} onChange={event => setObservation(event.target.value)} placeholder="Motivo ou informação complementar" /></label>
      <p className="text-sm text-fg-sub">Fracionamento, saldo, conflitos e concessão dependem da validação do servidor. A solicitação só é registrada após confirmação do envio.</p>
    </form>
  </Modal>;
}
