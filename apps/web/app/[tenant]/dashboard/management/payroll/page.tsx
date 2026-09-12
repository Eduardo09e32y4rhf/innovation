'use client';

import {
  BadgeDollarSign,
  Calculator,
  Check,
  CheckCircle2,
  DollarSign,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type Employee, ApiError } from '@/app/lib/api';

import { payrollApi } from './payroll-api';
import { PAYROLL_STATUS_LABEL, type PayrollItem, type PayrollStatus } from './types';

// ─── constants ───────────────────────────────────────────────────────────────

const ALLOWED_ROLES = new Set(['DEV', 'ADMIN', 'RH']);

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function brl(value: number | string): string {
  return BRL.format(Number(value ?? 0));
}

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - 2 + i);

// ─── status badge ─────────────────────────────────────────────────────────────

function statusClasses(status: PayrollStatus): string {
  switch (status) {
    case 'DRAFT': return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'PROCESSING': return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'APPROVED': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PAID': return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    case 'CANCELLED': return 'border-red-200 bg-red-50 text-red-700';
    default: return 'border-slate-200 bg-slate-100 text-slate-600';
  }
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const { user } = useAuth();
  const role = (user?.profile ?? user?.role ?? '').toUpperCase();
  const canAccess = ALLOWED_ROLES.has(role);

  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [filterMonth, setFilterMonth] = useState(CURRENT_MONTH);
  const [calcModalOpen, setCalcModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const payrollQuery = useQuery(
    () => payrollApi.list(filterYear, filterMonth),
    [filterYear, filterMonth],
    { enabled: canAccess },
  );

  const employeesQuery = useQuery(
    () => api.employees.list(),
    [],
    { enabled: canAccess && calcModalOpen },
  );

  const rows = payrollQuery.data ?? [];

  const totals = useMemo(
    () => ({
      employees: rows.length,
      gross: rows.reduce((s, r) => s + Number(r.grossSalary ?? 0), 0),
      net: rows.reduce((s, r) => s + Number(r.netSalary ?? 0), 0),
      approved: rows.filter((r) => r.status === 'APPROVED' || r.status === 'PAID').length,
    }),
    [rows],
  );

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <BadgeDollarSign className="mx-auto text-amber-600" size={30} />
          <h1 className="mt-3 text-lg font-black text-amber-950">Acesso restrito à folha de pagamento</h1>
          <p className="mt-2 text-sm font-medium text-amber-800">
            Esta área está disponível para os perfis DEV, ADMIN e RH.
          </p>
        </div>
      </div>
    );
  }

  async function handleApprove(item: PayrollItem) {
    setBusyId(item.id);
    try {
      await payrollApi.approve(item.id);
      toast.success('Folha aprovada com sucesso.');
      payrollQuery.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível aprovar a folha.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAsPaid(item: PayrollItem) {
    setBusyId(item.id);
    try {
      await payrollApi.markAsPaid(item.id);
      toast.success('Folha marcada como paga.');
      payrollQuery.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível marcar como paga.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: PayrollItem) {
    const name = item.employee?.name ?? 'este registro';
    if (!window.confirm(`Excluir a folha de "${name}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(item.id);
    try {
      await payrollApi.remove(item.id);
      toast.success('Folha excluída.');
      payrollQuery.refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir a folha.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full space-y-5">
      {/* Header */}
      <header className="page-header items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Gestão</p>
          <h1 className="text-2xl font-black text-slate-950">Folha de Pagamento</h1>
          <p className="text-sm font-medium text-slate-500">
            Calcule, aprove e gerencie os pagamentos dos funcionários.
          </p>
        </div>
        <button type="button" onClick={() => setCalcModalOpen(true)} className="crystal-button">
          <Calculator size={14} /> Calcular Folha
        </button>
      </header>

      {payrollQuery.loading ? (
        <LoadingState label="Carregando folha de pagamento..." />
      ) : payrollQuery.error ? (
        <ErrorState message={payrollQuery.error} onRetry={payrollQuery.refetch} />
      ) : (
        <>
          {/* Summary cards */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} label="Total de Funcionários" value={totals.employees} tone="violet" />
            <SummaryCard icon={DollarSign} label="Total Bruto" value={brl(totals.gross)} tone="blue" />
            <SummaryCard icon={BadgeDollarSign} label="Total Líquido" value={brl(totals.net)} tone="teal" />
            <SummaryCard icon={CheckCircle2} label="Folhas Aprovadas" value={totals.approved} tone="amber" />
          </section>

          {/* Filters */}
          <section className="ops-card rounded-[14px] border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Ano</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="form-control min-w-[120px]"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Mês</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="form-control min-w-[150px]"
                >
                  {MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* Table */}
          {rows.length === 0 ? (
            <div className="ops-card rounded-[14px] border border-slate-200 bg-white">
              <EmptyState
                message={`Nenhuma folha calculada para ${MONTHS[filterMonth - 1]} de ${filterYear}.`}
              />
              <div className="-mt-5 flex justify-center pb-8">
                <button type="button" onClick={() => setCalcModalOpen(true)} className="crystal-button">
                  <Calculator size={14} /> Calcular primeira folha
                </button>
              </div>
            </div>
          ) : (
            <section className="ops-card overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
              {/* Table header */}
              <div className="hidden grid-cols-[minmax(200px,2fr)_120px_100px_100px_100px_120px_110px_120px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-500 lg:grid">
                <span>Funcionário</span>
                <span>Salário Bruto</span>
                <span>INSS</span>
                <span>IRRF</span>
                <span>FGTS</span>
                <span>Salário Líquido</span>
                <span>Status</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-slate-100">
                {rows.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 lg:grid-cols-[minmax(200px,2fr)_120px_100px_100px_100px_120px_110px_120px] lg:items-center lg:gap-3 lg:px-5"
                  >
                    {/* Employee */}
                    <div className="min-w-0">
                      <p className="font-black text-slate-950 truncate">
                        {item.employee?.name ?? `Funcionário ${item.employeeId.slice(0, 8)}`}
                      </p>
                      {item.employee?.position && (
                        <p className="mt-0.5 text-[10px] font-medium text-slate-500 truncate">
                          {item.employee.position}
                          {item.employee.department ? ` · ${item.employee.department}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Gross */}
                    <div>
                      <span className="lg:hidden text-[10px] font-black uppercase text-slate-400">Bruto </span>
                      <span className="text-sm font-bold text-slate-800">{brl(item.grossSalary)}</span>
                    </div>

                    {/* INSS */}
                    <div>
                      <span className="lg:hidden text-[10px] font-black uppercase text-slate-400">INSS </span>
                      <span className="text-sm font-medium text-rose-600">{brl(item.inss)}</span>
                    </div>

                    {/* IRRF */}
                    <div>
                      <span className="lg:hidden text-[10px] font-black uppercase text-slate-400">IRRF </span>
                      <span className="text-sm font-medium text-rose-600">{brl(item.irrf)}</span>
                    </div>

                    {/* FGTS */}
                    <div>
                      <span className="lg:hidden text-[10px] font-black uppercase text-slate-400">FGTS </span>
                      <span className="text-sm font-medium text-slate-600">{brl(item.fgts)}</span>
                    </div>

                    {/* Net */}
                    <div>
                      <span className="lg:hidden text-[10px] font-black uppercase text-slate-400">Líquido </span>
                      <span className="text-base font-black text-emerald-600">{brl(item.netSalary)}</span>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase ${statusClasses(item.status)}`}
                      >
                        {PAYROLL_STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {item.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(item)}
                          disabled={busyId === item.id}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          <Check size={11} /> Aprovar
                        </button>
                      )}
                      {item.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsPaid(item)}
                          disabled={busyId === item.id}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 text-[10px] font-bold text-teal-700 hover:bg-teal-100 disabled:opacity-50"
                        >
                          <DollarSign size={11} /> Marcar Pago
                        </button>
                      )}
                      {item.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={busyId === item.id}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Trash2 size={11} /> Excluir
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Calculate modal */}
      {calcModalOpen && (
        <CalcPayrollModal
          employees={employeesQuery.data ?? []}
          loadingEmployees={employeesQuery.loading}
          onClose={() => setCalcModalOpen(false)}
          onSuccess={() => {
            setCalcModalOpen(false);
            payrollQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────

type Tone = 'violet' | 'teal' | 'blue' | 'amber';

const TONE_CLASSES: Record<Tone, string> = {
  violet: 'bg-violet-50 text-violet-700',
  teal: 'bg-teal-50 text-teal-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
};

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  tone: Tone;
}) {
  return (
    <div className="ops-card flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-black leading-none text-slate-950">{value}</p>
      </div>
    </div>
  );
}

// ─── CalcPayrollModal ─────────────────────────────────────────────────────────

interface CalcPayrollModalProps {
  employees: Employee[];
  loadingEmployees: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CalcPayrollModal({ employees, loadingEmployees, onClose, onSuccess }: CalcPayrollModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [year, setYear] = useState(CURRENT_YEAR);
  const [saving, setSaving] = useState(false);

  const valid = Boolean(employeeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await payrollApi.create({ employeeId, referenceMonth: month, referenceYear: year });
      toast.success('Folha calculada com sucesso.');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível calcular a folha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        {/* Modal header */}
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Calculator size={20} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Calcular Folha</h2>
              <p className="text-xs font-medium text-slate-500">Selecione o funcionário e o período</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee select */}
          <label className="form-group">
            <span>Funcionário *</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={saving || loadingEmployees}
              required
              className="form-control"
            >
              <option value="">
                {loadingEmployees ? 'Carregando funcionários...' : 'Selecione um funcionário...'}
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.position ? ` — ${emp.position}` : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Month and Year */}
          <div className="grid grid-cols-2 gap-3">
            <label className="form-group">
              <span>Mês *</span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={saving}
                className="form-control"
              >
                {MONTHS.map((name, idx) => (
                  <option key={name} value={idx + 1}>{name}</option>
                ))}
              </select>
            </label>
            <label className="form-group">
              <span>Ano *</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={saving}
                className="form-control"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="btn-outline px-4">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valid || saving}
              className="crystal-button disabled:opacity-50"
            >
              {saving ? (
                <>Calculando...</>
              ) : (
                <><Calculator size={14} /> Calcular</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}