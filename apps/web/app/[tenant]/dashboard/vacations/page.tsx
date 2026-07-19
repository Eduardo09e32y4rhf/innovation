'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, X, Calendar, Clock, AlertCircle, FileText, Download, History, RefreshCw, AlertTriangle, Timer, ThumbsDown } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Company, type CreateVacationInput, type Employee, type VacationStatus } from '@/app/lib/api';
import { VACATION_STATUS_LABEL, formatPeriod, formatDate, ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { hasPermission } from '@/app/lib/permissions';
import { buildPdfShell, section, infoGrid, signatureBlock, printPdf, type PdfCompanyInfo } from '@/app/lib/pdf-utils';

const MAX_VACATION_DAYS = 30;

// ─── ELIGIBILITY HELPERS ────────────────────────────────────────────────────

function monthDiff(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) +
    (end.getDate() >= start.getDate() ? 0 : -1);
}

interface EligibilityInfo {
  monthsSinceAdmission: number;
  isEligible: boolean;           // Completou 12 meses
  remainingDays: number;         // Dias restantes para completar 12 meses
  remainingMonths: number;
  remainingYearsText: string;
  eligibilityDate: string;
  admissionDateStr: string;
  // Período Concessivo: quanto falta para 1a e 11 meses (prazo fatal)
  concessivePeriodMonths: number;  // Total de meses desde admissão
  concessiveDeadlineText: string;  // Quanto tempo falta para o prazo fatal
  isConcessiveUrgent: boolean;     // Está no 11º mês concessivo (obrigatório tirar)
  isConcessiveWarning: boolean;    // Passou de 9m20d no período concessivo (alerta RH)
  mustTakeAll: boolean;            // Obrigado a tirar todos os dias de uma vez
  canSellDays: boolean;            // Pode vender até 10 dias (Abono Pecuniário)
  canFraction: boolean;            // Pode fracionar em parcelas
  isCritical: boolean;             // Passou de 10 meses no período concessivo
}

function calcEligibility(admissionDateStr: string): EligibilityInfo | null {
  try {
    const now = new Date();
    const admission = new Date(admissionDateStr);
    if (Number.isNaN(admission.getTime())) return null;

    // Meses desde a admissão
    const totalMonths = monthDiff(admission, now);

    // Data de elegibilidade (1 ano)
    const eligibilityDate = new Date(admission);
    eligibilityDate.setFullYear(eligibilityDate.getFullYear() + 1);

    // Tempo restante para completar 12 meses
    const remainingMs = Math.max(0, eligibilityDate.getTime() - now.getTime());
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(remainingDays / 365);
    const remainingMonths = Math.floor((remainingDays % 365) / 30);
    const days = remainingDays - (years * 365) - (remainingMonths * 30);
    let remainingYearsText = '';
    if (years > 0) remainingYearsText += `${years} ano(s), `;
    remainingYearsText += `${remainingMonths} mes(es) e ${days} dia(s)`;

    const isEligible = totalMonths >= 12;

    // Período Concessivo: começa quando o funcionário completa 12 meses
    // Prazo fatal: 1 ano e 11 meses de casa (11º mês do período concessivo)
    const concessiveMonths = isEligible ? totalMonths - 12 : 0; // meses dentro do período concessivo
    
    // Calcular o prazo fatal: 23 meses desde admissão (1a11m)
    const fatalDeadline = new Date(admission);
    fatalDeadline.setMonth(fatalDeadline.getMonth() + 23);
    const msToFatal = Math.max(0, fatalDeadline.getTime() - now.getTime());
    const daysToFatal = Math.ceil(msToFatal / 86400000);
    const concessiveDeadlineText = daysToFatal === 0 
      ? 'PRAZO ESGOTADO!' 
      : `${Math.floor(daysToFatal / 30)} mes(es) e ${daysToFatal % 30} dia(s) para o vencimento`;

    // Regras da CLT:
    // - concessiveMonths >= 11: 11º mês concessivo = URGENTE, obrigado a tirar tudo
    // - concessiveMonths >= 10: Alerta crítico para RH
    // - concessiveMonths >= 9 e 20 dias: Alerta para RH (conforme solicitado)
    const nowDayOfMonth = now.getDate();
    const isConcessiveUrgent  = isEligible && concessiveMonths >= 11; // 1a e 11m
    const isCritical          = isEligible && concessiveMonths >= 10; // 1a e 10m
    const isConcessiveWarning = isEligible && (concessiveMonths >= 9 && (concessiveMonths > 9 || nowDayOfMonth >= 20));

    // Antes do 11º mês: pode fracionar e pode vender dias
    // No 11º mês: proibido fracionar, proibido vender, obrigado a tirar os 30 dias
    const mustTakeAll = isConcessiveUrgent;
    const canSellDays = isEligible && !mustTakeAll;
    const canFraction = isEligible && !mustTakeAll;

    return {
      monthsSinceAdmission: totalMonths,
      isEligible,
      remainingDays,
      remainingMonths,
      remainingYearsText,
      eligibilityDate: eligibilityDate.toISOString().slice(0, 10),
      admissionDateStr: admission.toISOString().slice(0, 10),
      concessivePeriodMonths: concessiveMonths,
      concessiveDeadlineText,
      isConcessiveUrgent,
      isConcessiveWarning,
      mustTakeAll,
      canSellDays,
      canFraction,
      isCritical,
    };
  } catch {
    return null;
  }
}

export default function VacationsPage() {
  const { user } = useAuth();
  const canApprove = hasPermission(user, 'vacations.approve');
  const isGestor = !hasPermission(user, 'users.manage_employees') && hasPermission(user, 'vacations.request_team');

  const vacations = useQuery(() => api.vacations.list(), []);
  const employees = useQuery(() => api.employees.list(), []);
  const company = useQuery(() => api.companies.me(), []);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'rejected' | 'history' | 'alerts'>('active');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Receipt Sub-Modal State
  const [receiptModalRow, setReceiptModalRow] = useState<typeof rows[0] | null>(null);
  const [receiptData, setReceiptData] = useState({ remuneracao: '', abono: '', descontos: '', adicionais: '' });

  const updateStatus = useMutation(
    ({ id, status }: { id: string; status: VacationStatus }) => api.vacations.updateStatus(id, status),
    { onSuccess: () => vacations.refetch() },
  );

  const rows = vacations.data ?? [];

  useEffect(() => {
    const id = window.setInterval(() => vacations.refetch(), 30000);
    return () => window.clearInterval(id);
  }, [vacations]);

  // Separate tabs: active (pending+approved), rejected, history (cancelled+completed)
  const activeRows = rows.filter(r => r.status === 'PENDING');
  const rejectedRows = rows.filter(r => r.status === 'REJECTED');
  const historyRows = rows.filter(r => r.status === 'CANCELLED' || r.status === 'COMPLETED' || r.status === 'APPROVED');

  const pendingCount = rows.filter(row => row.status === 'PENDING').length;
  const approvedCount = rows.filter(row => row.status === 'APPROVED').length;
  const rejectedCount = rows.filter(row => row.status === 'REJECTED').length;
  const completedCount = rows.filter(row => row.status === 'COMPLETED').length;

  // Calculate used vacation days per employee
  const vacationDaysByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    rows
      .filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED')
      .forEach(r => {
        map.set(r.employeeId, (map.get(r.employeeId) || 0) + r.daysUsed);
      });
    return map;
  }, [rows]);

  // Detect period conflicts
  const activePeriods = useMemo(() => {
    return activeRows.map(r => ({
      employeeId: r.employeeId,
      startDate: new Date(r.startDate),
      endDate: new Date(r.endDate),
      id: r.id,
    }));
  }, [activeRows]);

  function hasConflict(employeeId: string, startDate: string, endDate: string): { conflict: boolean; withName?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const conflict = activePeriods.find(p => 
      p.employeeId !== employeeId &&
      start <= p.endDate && end >= p.startDate
    );
    if (conflict) {
      const emp = rows.find(r => r.id === conflict.id)?.employee;
      return { conflict: true, withName: emp?.name };
    }
    return { conflict: false };
  }

  function handleSelectAll() {
    if (selectedRows.length === activeRows.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(activeRows.map(r => r.id));
    }
  }

  function handleSelect(id: string) {
    setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  async function handleBulkApprove() {
    for (const id of selectedRows) {
      await updateStatus.mutate({ id, status: 'APPROVED' }).catch(() => {});
    }
    setSelectedRows([]);
  }

  function handleDownloadReceipt(row: typeof rows[0]) {
    setReceiptModalRow(row);
    setReceiptData({ remuneracao: '', abono: '', descontos: '', adicionais: '' });
  }

  function handleConfirmDownloadReceipt() {
    if (!receiptModalRow) return;
    downloadVacationReceipt(receiptModalRow, company.data ?? null, receiptData);
    setReceiptModalRow(null);
  }

  
  const alertEmployees = useMemo(() => {
    if (!employees.data) return [];
    return employees.data.map(emp => {
      if (!emp.admissionDate) return null;
      const el = calcEligibility(emp.admissionDate);
      // Mostrar alerta a partir de 9 meses e 20 dias do período concessivo (conforme CLT)
      if (!el || !el.isConcessiveWarning) return null;
      const usedDays = vacationDaysByEmployee.get(emp.id) || 0;
      const totalEarned = Math.floor(el.monthsSinceAdmission / 12) * 30;
      const remainingDaysTotal = Math.max(0, totalEarned - usedDays);
      if (remainingDaysTotal > 0) {
        return { ...emp, remainingDaysTotal, el };
      }
      return null;
    }).filter(Boolean);
  }, [employees.data, vacationDaysByEmployee]);

  const displayRows = tab === 'active' ? activeRows : tab === 'rejected' ? rejectedRows : historyRows;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="page-header items-center">
        <div>
          <p className="page-label">FÉRIAS</p>
          <h2 className="page-title">{isGestor ? 'Férias da equipe' : 'Solicitações'}</h2>
        </div>
        <button onClick={() => setOpen(true)} className="btn-nubank">
          <Plus size={14} /> Nova solicitação
        </button>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Pendentes" value={pendingCount} icon={Clock} color="amber" />
        <StatCard label="Aprovadas" value={approvedCount} icon={Check} color="emerald" />
        <StatCard label="Concluídas" value={completedCount} icon={RefreshCw} color="teal" />
        <StatCard label="Rejeitadas" value={rejectedCount} icon={X} color="rose" />
      </section>

      {updateStatus.error && (
        <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-5 py-3 text-xs text-rose-700">{updateStatus.error}</p>
      )}

      {/* Tabs */}
      {!vacations.loading && !vacations.error && rows.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="tab-bar">
            <button onClick={() => setTab('active')} className={tab === 'active' ? 'tab-item-active' : 'tab-item'}>Ativas ({activeRows.length})</button>
            <button onClick={() => setTab('rejected')} className={tab === 'rejected' ? 'tab-item-active' : 'tab-item'}>Recusadas ({rejectedRows.length})</button>
            <button onClick={() => setTab('history')} className={tab === 'history' ? 'tab-item-active' : 'tab-item'}>Histórico ({historyRows.length})</button>
            {canApprove && (
              <button onClick={() => setTab('alerts')} className={tab === 'alerts' ? 'tab-item-active' : 'tab-item'}>
                <AlertTriangle size={13} strokeWidth={3} /> Avisos ({alertEmployees.length})
              </button>
            )}
          </div>
          {/* Bulk actions */}
          {canApprove && tab === 'active' && selectedRows.length > 0 && (
            <div className="flex gap-2">
              <button onClick={handleBulkApprove} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
                <Check size={13} strokeWidth={2.5} />
                Aprovar {selectedRows.length} selecionada(s)
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'alerts' ? (
        <section className="overflow-hidden rounded-[18px] border border-amber-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="border-b border-amber-100 bg-amber-50/50 px-5 py-4">
            <h3 className="text-sm font-black text-amber-900">Avisos de Férias Obrigatórias (CLT)</h3>
            <p className="mt-1 text-xs text-amber-700">Funcionários com período concessivo avançado. A CLT exige que as férias sejam concedidas até 11 meses após o período aquisitivo — após isso, a empresa paga em dobro.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-white text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 border-b border-slate-100">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Admissão</th>
                  <th className="px-6 py-4">Meses de Casa</th>
                  <th className="px-6 py-4">Prazo Concessivo</th>
                  <th className="px-6 py-4 text-right">Saldo Restante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertEmployees.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-sm font-semibold text-slate-500">Nenhum alerta de férias pendentes. Todos os funcionários estão dentro do prazo.</td></tr>
                )}
                {alertEmployees.map((emp: any) => {
                  const { el } = emp;
                  const isUrgent = el.isConcessiveUrgent;
                  const isCritical = el.isCritical;
                  const bgClass = isUrgent
                    ? 'bg-gradient-to-br from-rose-500 to-red-600'
                    : isCritical
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600'
                    : 'bg-gradient-to-br from-amber-500 to-orange-500';
                  return (
                    <tr key={emp.id} className="group transition-all duration-200 hover:bg-slate-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-sm font-black text-white shadow-sm ${bgClass}`}>
                            {emp.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-950">{normalizeDisplayName(emp.name) ?? '—'}</p>
                            {isUrgent && (
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle size={10} strokeWidth={2.5} />
                                URGENTE — 11º mês: obrigatório tirar as férias já!
                              </p>
                            )}
                            {!isUrgent && isCritical && (
                              <p className="text-[10px] font-bold text-orange-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle size={10} strokeWidth={2.5} />
                                10º mês — Notificação obrigatória (CLT)
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">{formatDate(emp.admissionDate)}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">{el.monthsSinceAdmission} meses</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                          isUrgent ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          isCritical ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {el.concessiveDeadlineText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center justify-center rounded-[8px] px-3 py-1.5 text-xs font-black shadow-sm ${isUrgent ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                          {emp.remainingDaysTotal} dias
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : vacations.loading ? (
        <LoadingState label="Carregando solicitações..." />
      ) : vacations.error ? (
        <ErrorState message={vacations.error} onRetry={vacations.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhuma solicitação de férias registrada." />
      ) : (
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="bg-gradient-to-r from-slate-100 to-slate-50 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">
                  {canApprove && tab === 'active' && <th className="px-4 py-4 w-10"><input type="checkbox" checked={selectedRows.length === activeRows.length} onChange={handleSelectAll} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" /></th>}
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Período</th>
                  <th className="px-6 py-4">Dias</th>
                  <th className="px-6 py-4">Saldo</th>
                  <th className="px-6 py-4">Período Aquisitivo</th>
                  <th className="px-6 py-4">Status</th>
                  {canApprove && tab === 'active' && <th className="px-6 py-4 text-right">Aprovação</th>}
                  {tab === 'history' && <th className="px-6 py-4 text-right">Recibo</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map((row) => {
                  const statusColors: Record<string, string> = {
                    PENDING: 'bg-amber-50 text-amber-700 border-amber-200/60',
                    APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                    REJECTED: 'bg-rose-50 text-rose-700 border-rose-200/60',
                    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200/60',
                    COMPLETED: 'bg-teal-50 text-teal-700 border-teal-200/60',
                  };
                  const statusClass = statusColors[row.status] || 'bg-slate-50 text-slate-600 border-slate-200/60';
                  
                  // Balance calculation
                  const usedDays = vacationDaysByEmployee.get(row.employeeId) || 0;
                  const remaining = MAX_VACATION_DAYS - usedDays;
                  const conflict = tab === 'active' && row.status === 'PENDING' ? hasConflict(row.employeeId, row.startDate, row.endDate) : { conflict: false };

                  return (
                    <tr key={row.id} className={`group transition-all duration-200 hover:bg-slate-50/40 ${conflict.conflict ? 'bg-rose-50/30' : ''}`}>
                      {canApprove && tab === 'active' && (
                        <td className="px-4 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedRows.includes(row.id)} 
                            onChange={() => handleSelect(row.id)} 
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            disabled={row.status !== 'PENDING'}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-teal-500 to-cyan-600 text-sm font-black text-white shadow-sm">
                            {row.employee?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-950">{normalizeDisplayName(row.employee?.name) ?? '—'}</p>
                            {conflict.conflict && (
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                                <AlertTriangle size={10} strokeWidth={2.5} />
                                Conflito: {conflict.withName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-semibold text-slate-700">{formatPeriod(row.startDate, row.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-900">
                          {row.daysUsed}d
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all ${remaining >= 0 ? 'bg-teal-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min((usedDays / MAX_VACATION_DAYS) * 100, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-black ${remaining >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                            {remaining}d restantes
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">{row.acquisitionPeriod}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-[8px] border px-3 py-1.5 text-[11px] font-black ${statusClass}`}>
                          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                            row.status === 'PENDING' ? 'bg-amber-500' : 
                            row.status === 'APPROVED' || row.status === 'COMPLETED' ? 'bg-emerald-500' : 
                            'bg-rose-500'
                          }`} />
                          {VACATION_STATUS_LABEL[row.status] ?? row.status}
                        </span>
                      </td>
                      {canApprove && tab === 'active' && (
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => updateStatus.mutate({ id: row.id, status: 'APPROVED' }).catch(() => {})}
                              disabled={row.status !== 'PENDING' || updateStatus.loading}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-[11px] font-black text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                            >
                              <Check size={13} strokeWidth={2.5} />
                              Aprovar
                            </button>
                            <button
                              onClick={() => updateStatus.mutate({ id: row.id, status: 'REJECTED' }).catch(() => {})}
                              disabled={row.status !== 'PENDING' || updateStatus.loading}
                              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-gradient-to-r from-rose-500 to-pink-600 px-4 text-[11px] font-black text-white shadow-md shadow-rose-500/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                            >
                              <X size={13} strokeWidth={2.5} />
                              Rejeitar
                            </button>
                          </div>
                        </td>
                      )}
                      {tab === 'history' && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(row)}
                            className="btn-outline-premium inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3 text-[11px] font-black transition-all hover:-translate-y-0.5"
                          >
                            <FileText size={12} strokeWidth={2.5} />
                            Recibo
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <NewVacationModal
          employees={employees.data ?? []}
          existingVacations={rows}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            vacations.refetch();
          }}
        />
      )}

      {/* Financial Data Receipt Sub-Modal */}
      {receiptModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Gerar Recibo Oficial</h3>
                <p className="text-xs text-slate-500">Insira os valores para impressão do recibo legal</p>
              </div>
              <button onClick={() => setReceiptModalRow(null)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700">Remuneração Base (R$)</label>
                <input type="number" step="0.01" value={receiptData.remuneracao} onChange={e => setReceiptData({...receiptData, remuneracao: e.target.value})} className="w-full rounded-[10px] border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700">Abono Pecuniário (R$)</label>
                <input type="number" step="0.01" value={receiptData.abono} onChange={e => setReceiptData({...receiptData, abono: e.target.value})} className="w-full rounded-[10px] border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" placeholder="0.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">Outros Proventos (R$)</label>
                  <input type="number" step="0.01" value={receiptData.adicionais} onChange={e => setReceiptData({...receiptData, adicionais: e.target.value})} className="w-full rounded-[10px] border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" placeholder="0.00" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">Total Descontos (R$)</label>
                  <input type="number" step="0.01" value={receiptData.descontos} onChange={e => setReceiptData({...receiptData, descontos: e.target.value})} className="w-full rounded-[10px] border border-slate-200 bg-slate-50 p-2.5 text-sm font-medium outline-none transition-all focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10" placeholder="0.00" />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setReceiptModalRow(null)} className="btn-outline-premium h-10 px-4 text-xs font-black">Cancelar</button>
              <button onClick={handleConfirmDownloadReceipt} className="btn-premium h-10 px-4 text-xs font-black">
                Gerar Recibo Oficial PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    teal: 'from-teal-500 to-cyan-600 shadow-teal-500/25',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/25',
  };
  return (
    <div className="group relative overflow-hidden rounded-[16px] border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-[12px] bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
          <Icon size={20} strokeWidth={2.5} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── PERIOD CONFLICT CHECK ─────────────────────────────────────────────────

function diffDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
}

function NewVacationModal({
  employees, existingVacations, onClose, onDone,
}: {
  employees: Employee[];
  existingVacations: { employeeId: string; startDate: string; endDate: string; status: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    employeeId: '',
    acquisitionPeriod: `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`,
    startDate: '',
    endDate: '',
  });
  const [observation, setObservation] = useState('');

  const days = diffDays(form.startDate, form.endDate);
  const daysUsed = existingVacations
    .filter(v => v.employeeId === form.employeeId && (v.status === 'APPROVED' || v.status === 'COMPLETED'))
    .reduce((sum, v) => sum + diffDays(v.startDate, v.endDate), 0);
  const remainingDays = MAX_VACATION_DAYS - daysUsed;
  const exceedsBalance = days > remainingDays;

  // Regra CLT: máximo 30 dias por solicitação
  const exceedsMaxPeriod = days > 30;

  // Regra CLT: antecedência mínima de 45 dias
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDateObj = form.startDate ? new Date(form.startDate + 'T00:00:00') : null;
  const daysUntilStart = startDateObj ? Math.floor((startDateObj.getTime() - today.getTime()) / 86400000) : 0;
  const tooClose = form.startDate ? daysUntilStart < 45 : false;

  // Check conflict with existing active periods
  const conflict = existingVacations.find(v => 
    v.employeeId === form.employeeId && 
    v.status !== 'REJECTED' && v.status !== 'CANCELLED' &&
    new Date(form.startDate) <= new Date(v.endDate) && new Date(form.endDate) >= new Date(v.startDate)
  );
  const conflictMessage = conflict ? `Conflito: ${formatPeriod(conflict.startDate, conflict.endDate)} já registrado.` : null;

  // Eligibility check: 12 months from admission
  const selectedEmployee = employees.find(e => e.id === form.employeeId);
  const eligibility = selectedEmployee?.admissionDate ? calcEligibility(selectedEmployee.admissionDate) : null;
  
  // Abono pecuniário (venda de 10 dias) - só antes do 11º mês concessivo
  const [sellDays, setSellDays] = useState(false);
  const effectiveDays = sellDays ? days + 10 : days; // Conta os dias vendidos no total consumido

  // Calcular min date: hoje + 45 dias
  const minStartDate = new Date(today);
  minStartDate.setDate(minStartDate.getDate() + 45);
  const minStartDateStr = minStartDate.toISOString().slice(0, 10);

  const create = useMutation(
    () => {
      const payload: CreateVacationInput = {
        employeeId: form.employeeId,
        acquisitionPeriod: form.acquisitionPeriod,
        // Enviar como YYYY-MM-DDTHH:mm:ss sem UTC para não mudar o dia
        startDate: form.startDate + 'T12:00:00.000Z',
        endDate: form.endDate + 'T12:00:00.000Z',
        daysUsed: days,
        observation: [observation, sellDays ? 'Abono pecuniário (venda de 10 dias) solicitado.' : ''].filter(Boolean).join(' ') || undefined,
      };
      return api.vacations.create(payload);
    },
    { onSuccess: onDone },
  );

  const valid = form.employeeId && form.startDate && form.endDate && days > 0 
    && !exceedsBalance && !exceedsMaxPeriod && !conflictMessage && !tooClose
    && (eligibility?.isEligible ?? true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[18px] border border-slate-200/60 bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Nova solicitação de férias</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X size={18} /></button>
        </div>

        {create.error && (
          <p className="mb-4 rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{create.error}</p>
        )}

        <div className="space-y-4">
          <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Funcionário</span>
            <select
              value={form.employeeId}
              onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))}
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            >
              <option value="">Selecione...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{employeeOptionLabel(emp)}</option>
              ))}
            </select>
          </label>

          {form.employeeId && eligibility && !eligibility.isEligible && (
            <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <Timer size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">
                    Não elegível para férias — Contador regressivo
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-amber-700">
                    Admissão em {formatDate(eligibility.admissionDateStr)} · {eligibility.monthsSinceAdmission} meses de casa
                  </p>
                  <p className="mt-1 text-[11px] font-black text-amber-800">
                    Elegível a partir de {formatDate(eligibility.eligibilityDate)} · Faltam {eligibility.remainingYearsText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {form.employeeId && eligibility && eligibility.isEligible && (
            <div className={`rounded-[10px] border px-4 py-3 ${
              eligibility.isConcessiveUrgent
                ? 'border-rose-200 bg-rose-50'
                : eligibility.isCritical
                ? 'border-orange-200 bg-orange-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}>
              <div className="flex items-start gap-2">
                {eligibility.isConcessiveUrgent ? (
                  <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <Check size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-xs font-bold ${
                    eligibility.isConcessiveUrgent ? 'text-rose-800' : eligibility.isCritical ? 'text-orange-800' : 'text-emerald-800'
                  }`}>
                    {eligibility.isConcessiveUrgent
                      ? '⚠️ URGENTE — 11º mês concessivo: obrigatório tirar todos os dias!'
                      : eligibility.isCritical
                      ? 'Alerta: 10º mês — notificação obrigatória emitida ao RH'
                      : 'Elegível para férias'}
                  </p>
                  <p className={`mt-1 text-[11px] font-semibold ${
                    eligibility.isConcessiveUrgent ? 'text-rose-700' : eligibility.isCritical ? 'text-orange-700' : 'text-emerald-700'
                  }`}>
                    Admissão em {formatDate(eligibility.admissionDateStr)} · {eligibility.monthsSinceAdmission} meses de casa
                  </p>
                  {eligibility.isEligible && (
                    <p className="mt-0.5 text-[11px] font-black text-slate-700">
                      Período concessivo: {eligibility.concessiveDeadlineText}
                    </p>
                  )}
                  {eligibility.mustTakeAll && (
                    <p className="mt-1 text-[11px] font-black text-rose-800">Não é possível fracionar nem vender dias neste estágio.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {form.employeeId && (
            <div className="rounded-[10px] border border-teal-200/60 bg-gradient-to-br from-teal-50 to-cyan-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Saldo de dias</p>
                <p className={`text-sm font-black ${remainingDays >= 0 ? 'text-teal-700' : 'text-rose-700'}`}>
                  {daysUsed} usados / {remainingDays} restantes
                </p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div 
                  className={`h-full rounded-full ${remainingDays >= 0 ? 'bg-teal-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min((daysUsed / MAX_VACATION_DAYS) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Período aquisitivo</span>
            <input
              value={form.acquisitionPeriod}
              onChange={(e) => setForm((f) => ({ ...f, acquisitionPeriod: e.target.value }))}
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Início</span>
              <input
                type="date"
                min={minStartDateStr}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </label>
            <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              <span>Fim</span>
              <input
                type="date"
                min={form.startDate || minStartDateStr}
                max={form.startDate ? (() => { const d = new Date(form.startDate + 'T00:00:00'); d.setDate(d.getDate() + 29); return d.toISOString().slice(0, 10); })() : undefined}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              />
            </label>
          </div>
          <p className="text-[10px] font-semibold text-slate-500">* Mínimo 45 dias de antecedência (CLT) · Máximo 30 dias por solicitação</p>

          {tooClose && form.startDate && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700">Antecedência insuficiente: a CLT exige mínimo 45 dias. Faltam {45 - daysUntilStart} dias para atingir o prazo mínimo.</p>
              </div>
            </div>
          )}

          {exceedsMaxPeriod && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700">Período excede o limite máximo de 30 dias por solicitação (CLT).</p>
              </div>
            </div>
          )}

          {conflictMessage && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700">{conflictMessage}</p>
              </div>
            </div>
          )}

          {exceedsBalance && (
            <div className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0" />
                <p className="text-xs font-semibold text-rose-700">Saldo insuficiente: {days} dias solicitados, apenas {remainingDays} disponíveis.</p>
              </div>
            </div>
          )}

          <div className="rounded-[10px] border border-teal-200/60 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
            <p className="text-xs font-semibold text-slate-600">Total de dias</p>
            <p className="mt-1 text-lg font-black text-teal-700">{days} {days === 1 ? 'dia' : 'dias'}</p>
          </div>

          {/* Abono Pecuniário: só antes do 11º mês concessivo */}
          {eligibility?.canSellDays && days > 0 && (
            <label className="flex items-center gap-3 rounded-[10px] border border-indigo-200 bg-indigo-50 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sellDays}
                onChange={e => setSellDays(e.target.checked)}
                className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="text-xs font-bold text-indigo-800">Solicitar Abono Pecuniário (Venda de 10 dias)</p>
                <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">O funcionário recebe 10 dias de férias convertidos em pécunia (valor em dinheiro), conforme CLT Art. 143.</p>
              </div>
            </label>
          )}

          <label className="space-y-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            <span>Observação (opcional)</span>
            <input
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Motivo ou informação complementar"
              className="h-11 w-full rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-outline-premium h-10 rounded-[10px] px-5 text-xs font-black">Cancelar</button>
          <button
            onClick={() => valid && create.mutate().catch(() => {})}
            disabled={!valid || create.loading}
            className="crystal-button h-10 rounded-[10px] bg-gradient-to-r from-teal-500 to-cyan-600 px-5 text-xs font-black text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-500/30 active:translate-y-0 disabled:opacity-60"
          >
            {create.loading ? 'Enviando...' : 'Solicitar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PDF RECEIPT ─────────────────────────────────────────────────────────────

function downloadVacationReceipt(vacation: { employee?: Employee; startDate: string; endDate: string; acquisitionPeriod: string; daysUsed: number; status: VacationStatus; observation?: string }, companyData: Company | null, financial: { remuneracao: string, abono: string, descontos: string, adicionais: string }) {
  const employee = vacation.employee;
  const companyInfo: PdfCompanyInfo | null = companyData
    ? {
        name: normalizeDisplayName(companyData.name),
        legalName: companyData.legalName,
        document: companyData.cnpj ?? null,
        logoUrl: companyData.logoUrl ?? null,
        address: [companyData.street, companyData.streetNumber, companyData.neighborhood, companyData.city, companyData.state, companyData.cep].filter(Boolean).map(String).join(', ') || undefined,
        phone: companyData.phone ?? null,
        email: companyData.email ?? null,
      }
    : null;

  const title = 'Aviso e Recibo de Férias';
  const subtitle = 'Documento Oficial';

  const employeeInfo = [
    { label: 'Nome Completo', value: normalizeDisplayName(employee?.name || '—') },
    { label: 'Matrícula', value: employee?.registration || (employee?.id ? employee.id.slice(0, 8).toUpperCase() : '-') },
    { label: 'Cargo', value: employee?.position || '-' },
    { label: 'CPF', value: employee?.cpf || '-' },
    { label: 'CTPS', value: '-' }, // Field not in schema yet
    { label: 'Admissão', value: formatDate(employee?.admissionDate) },
  ];

  // Cálculos Básicos
  const remuneracao = parseFloat(financial.remuneracao) || 0;
  const abono = parseFloat(financial.abono) || 0;
  const adicionais = parseFloat(financial.adicionais) || 0;
  const descontos = parseFloat(financial.descontos) || 0;
  
  const tercoFérias = remuneracao / 3;
  const tercoAbono = abono > 0 ? abono / 3 : 0;
  
  const totalProventos = remuneracao + tercoFérias + abono + tercoAbono + adicionais;
  const liquido = totalProventos - descontos;

  const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const financialTable = `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-family:Inter,sans-serif;">
      <thead>
        <tr>
          <th style="padding:10px;text-align:left;font-size:10px;font-weight:800;color:#475569;border-bottom:2px solid #cbd5e1;">Descrição / Rubrica</th>
          <th style="padding:10px;text-align:right;font-size:10px;font-weight:800;color:#059669;border-bottom:2px solid #cbd5e1;">Vencimentos (R$)</th>
          <th style="padding:10px;text-align:right;font-size:10px;font-weight:800;color:#e11d48;border-bottom:2px solid #cbd5e1;">Descontos (R$)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:10px;font-size:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;">Remuneração de Férias (${vacation.daysUsed} dias)</td>
          <td style="padding:10px;text-align:right;font-size:10px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${BRL(remuneracao)}</td>
          <td style="padding:10px;text-align:right;font-size:10px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">-</td>
        </tr>
        <tr>
          <td style="padding:10px;font-size:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;">1/3 Constitucional s/ Férias</td>
          <td style="padding:10px;text-align:right;font-size:10px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${BRL(tercoFérias)}</td>
          <td style="padding:10px;text-align:right;font-size:10px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">-</td>
        </tr>
        ${abono > 0 ? `
        <tr>
          <td style="padding:10px;font-size:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;">Abono Pecuniário</td>
          <td style="padding:10px;text-align:right;font-size:10px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${BRL(abono)}</td>
          <td style="padding:10px;text-align:right;font-size:10px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">-</td>
        </tr>
        <tr>
          <td style="padding:10px;font-size:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;">1/3 Constitucional s/ Abono</td>
          <td style="padding:10px;text-align:right;font-size:10px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${BRL(tercoAbono)}</td>
          <td style="padding:10px;text-align:right;font-size:10px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">-</td>
        </tr>
        ` : ''}
        ${adicionais > 0 ? `
        <tr>
          <td style="padding:10px;font-size:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;">Outros Proventos/Adicionais</td>
          <td style="padding:10px;text-align:right;font-size:10px;font-weight:600;color:#0f172a;border-bottom:1px solid #f1f5f9;">${BRL(adicionais)}</td>
          <td style="padding:10px;text-align:right;font-size:10px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">-</td>
        </tr>
        ` : ''}
        ${descontos > 0 ? `
        <tr>
          <td style="padding:10px;font-size:10px;color:#0f172a;border-bottom:1px solid #f1f5f9;">INSS / IRRF / Outros Descontos</td>
          <td style="padding:10px;text-align:right;font-size:10px;color:#94a3b8;border-bottom:1px solid #f1f5f9;">-</td>
          <td style="padding:10px;text-align:right;font-size:10px;font-weight:600;color:#e11d48;border-bottom:1px solid #f1f5f9;">${BRL(descontos)}</td>
        </tr>
        ` : ''}
      </tbody>
      <tfoot>
        <tr>
          <td style="padding:12px 10px;font-size:10px;font-weight:800;color:#0f172a;text-align:right;">TOTAIS:</td>
          <td style="padding:12px 10px;text-align:right;font-size:12px;font-weight:900;color:#059669;background:#f0fdfa;">${BRL(totalProventos)}</td>
          <td style="padding:12px 10px;text-align:right;font-size:12px;font-weight:900;color:#e11d48;background:#fef2f2;">${BRL(descontos)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:16px;text-align:center;margin-top:16px;">
      <div style="font-size:10px;font-weight:800;text-transform:uppercase;color:#475569;letter-spacing:0.05em;">Líquido a Receber</div>
      <div style="font-size:24px;font-weight:900;color:#0f172a;margin-top:4px;">${BRL(liquido)}</div>
    </div>
  `;

  const body = `
    <p style="font-size:10px;color:#475569;text-align:justify;margin-bottom:20px;line-height:1.6;">Nos termos das disposições legais vigentes, comunicamos que lhe serão concedidas férias relativas ao período aquisitivo especificado abaixo. Solicitamos apor sua assinatura neste aviso e recibo.</p>
    
    ${section('Dados do Colaborador', infoGrid(employeeInfo, 3))}

    ${section('Período de Férias', `
      <div style="margin-bottom:16px;">
        ${infoGrid([
          { label: 'Período Aquisitivo', value: vacation.acquisitionPeriod },
          { label: 'Início do Gozo', value: formatDate(vacation.startDate) },
          { label: 'Término do Gozo', value: formatDate(vacation.endDate) },
          { label: 'Dias Gozados', value: String(vacation.daysUsed) },
        ], 4)}
      </div>
    `)}

    ${section('Demonstrativo de Valores', financialTable)}
    
    <div style="font-size:10px;color:#475569;text-align:center;margin:32px 0;">
      Recebi da empresa a importância líquida de <strong>${BRL(liquido)}</strong> constante neste recibo, da qual dou plena e geral quitação.
    </div>

    ${signatureBlock(['Assinatura do Empregado', 'Empregador / RH'])}
  `;

  const html = buildPdfShell({ title, subtitle, landscape: false }, companyInfo, body);
  printPdf(html, `recibo-ferias-${slugify(employee?.name || 'funcionario')}.pdf`);
}

// ─── PDF UTILITIES ───────────────────────────────────────────────────────────

function employeeOptionLabel(employee: Employee) {
  const registration = employee.registration || employee.id.slice(0, 8).toUpperCase();
  return `${normalizeDisplayName(employee.name)} - ${registration}`;
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'documento';
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&', '<': '<', '>': '>', '"': '"' }[char] ?? char));
}