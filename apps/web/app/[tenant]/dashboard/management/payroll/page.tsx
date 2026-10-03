'use client';

import { Button } from '@/app/components/ui/button';

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
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type Employee, ApiError } from '@/app/lib/api';

import { PageHeader } from '@/app/components/ui/page-header';
import { Modal, ConfirmDialog } from '../../escalas/_components/operational-dialog';
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
  const [decision, setDecision] = useState<{ action: 'approve' | 'paid' | 'delete'; item: PayrollItem } | null>(null);
  const decisionLock = useRef(false);
  useEffect(() => { setDecision(null); setCalcModalOpen(false); }, [user?.companyId, filterYear, filterMonth]);

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
          <h1 className="mt-3 text-lg font-semibold text-amber-950">Acesso restrito à folha de pagamento</h1>
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
      setDecision(null);
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
      setDecision(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível marcar como paga.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: PayrollItem) {
    setBusyId(item.id);
    try {
      await payrollApi.remove(item.id);
      toast.success('Folha excluída.');
      payrollQuery.refetch();
      setDecision(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível excluir a folha.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full space-y-5">
      {/* Header */}
      <PageHeader title="Folha de pagamento" subtitle="Calcule, aprove e registre pagamentos por competência." actions={<Button onClick={() => setCalcModalOpen(true)}><Calculator size={18} /> Calcular folha</Button>} />
      <p className="text-sm text-slate-500">Valores da competência selecionada. Marcar como paga registra a quitação; não realiza transferência bancária.</p>

          {/* Filters */}
          <section className="ops-card rounded-[14px] border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Ano</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  disabled={busyId !== null} className="input-v2 min-w-[120px]"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Mês</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  disabled={busyId !== null} className="input-v2 min-w-[150px]"
                >
                  {MONTHS.map((name, idx) => (
                    <option key={name} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>


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

          {/* Table */}
          {rows.length === 0 ? (
            <div className="ops-card rounded-[14px] border border-slate-200 bg-white">
              <EmptyState
                message={`Nenhuma folha calculada para ${MONTHS[filterMonth - 1]} de ${filterYear}.`}
              />
              <div className="-mt-5 flex justify-center pb-8">
                <Button variant="primary" type="button" onClick={() => setCalcModalOpen(true)} className="">
                  <Calculator size={14} /> Calcular primeira folha
                </Button>
              </div>
            </div>
          ) : (
            <section className="ops-card overflow-x-auto rounded-[14px] border border-slate-200 bg-white">
              {/* Table header */}
              <div className="hidden grid-cols-[minmax(200px,2fr)_120px_100px_100px_100px_120px_110px_120px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-xs font-semibold text-slate-500 xl:grid">
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
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 xl:grid-cols-[minmax(180px,2fr)_repeat(5,minmax(85px,1fr))_110px_150px] xl:items-center xl:gap-3 xl:px-5"
                  >
                    {/* Employee */}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950 truncate">
                        {item.employee?.name ?? `Funcionário ${item.employeeId.slice(0, 8)}`}
                      </p>
                      {item.employee?.position && (
                        <p className="mt-0.5 text-xs font-medium text-slate-500 truncate">
                          {item.employee.position}
                          {item.employee.department ? ` · ${item.employee.department}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Gross */}
                    <div>
                      <span className="xl:hidden text-xs font-semibold text-slate-400">Bruto </span>
                      <span className="text-sm font-bold text-slate-800">{brl(item.grossSalary)}</span>
                    </div>

                    {/* INSS */}
                    <div>
                      <span className="xl:hidden text-xs font-semibold text-slate-400">INSS </span>
                      <span className="text-sm font-medium text-rose-600">{brl(item.inssAmount)}</span>
                    </div>

                    {/* IRRF */}
                    <div>
                      <span className="xl:hidden text-xs font-semibold text-slate-400">IRRF </span>
                      <span className="text-sm font-medium text-rose-600">{brl(item.irrfAmount)}</span>
                    </div>

                    {/* FGTS */}
                    <div>
                      <span className="xl:hidden text-xs font-semibold text-slate-400">FGTS </span>
                      <span className="text-sm font-medium text-slate-600">{brl(item.fgtsAmount)}</span>
                    </div>

                    {/* Net */}
                    <div>
                      <span className="xl:hidden text-xs font-semibold text-slate-400">Líquido </span>
                      <span className="text-base font-semibold text-emerald-600">{brl(item.netSalary)}</span>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(item.status)}`}
                      >
                        {PAYROLL_STATUS_LABEL[item.status] ?? item.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {item.status === 'DRAFT' && (
                        <Button variant="ghost"
                          type="button"
                          onClick={() => setDecision({ action: 'approve', item })}
                          disabled={busyId !== null}
                          className=""
                        >
                          <Check size={11} /> Aprovar
                        </Button>
                      )}
                      {item.status === 'APPROVED' && (
                        <Button variant="ghost"
                          type="button"
                          onClick={() => setDecision({ action: 'paid', item })}
                          disabled={busyId !== null}
                          className=""
                        >
                          <DollarSign size={18} /> Marcar como paga
                        </Button>
                      )}
                      {item.status === 'DRAFT' && (
                        <Button variant="ghost"
                          type="button"
                          onClick={() => setDecision({ action: 'delete', item })}
                          disabled={busyId !== null}
                          className=""
                        >
                          <Trash2 size={11} /> Excluir
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog isOpen={!!decision} onClose={() => setDecision(null)} title={decision?.action === 'paid' ? 'Registrar pagamento' : decision?.action === 'approve' ? 'Aprovar folha' : 'Excluir folha em rascunho'} description={decision ? `${decision.item.employee?.name ?? 'Funcionário'} · ${String(decision.item.referenceMonth).padStart(2, '0')}/${decision.item.referenceYear} · líquido ${brl(decision.item.netSalary)}. ${decision.action === 'paid' ? 'Confirme que o pagamento já foi realizado. Nenhuma transferência será feita.' : decision.action === 'delete' ? 'A folha será excluída; o funcionário será preservado.' : 'A aprovação libera o registro de pagamento.'}` : ''} confirmText={decision?.action === 'paid' ? 'Marcar como paga' : decision?.action === 'approve' ? 'Aprovar folha' : 'Excluir folha'} variant={decision?.action === 'delete' ? 'danger' : 'primary'} isLoading={busyId !== null} onConfirm={async () => {
        if (!decision || decisionLock.current) return;
        decisionLock.current = true;
        setBusyId(decision.item.id);
        try {
          const current = await payrollApi.get(decision.item.id);
          if (current.status !== decision.item.status || Number(current.netSalary) !== Number(decision.item.netSalary)) {
            toast.error('A folha foi alterada. Atualize e revise os valores antes de confirmar.'); payrollQuery.refetch(); setDecision(null); return;
          }
          if (decision.action === 'approve') await handleApprove(current);
          else if (decision.action === 'paid') await handleMarkAsPaid(current);
          else await handleDelete(current);
        } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível conferir a folha.'); }
        finally { setBusyId(null); decisionLock.current = false; }
      }} />
      {/* Calculate modal */}
      {calcModalOpen && (
        <CalcPayrollModal
          employees={employeesQuery.data ?? []}
          initialMonth={filterMonth} initialYear={filterYear}
          employeesError={employeesQuery.error} onRetryEmployees={employeesQuery.refetch}
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
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-xl font-semibold leading-none text-slate-950">{value}</p>
      </div>
    </div>
  );
}

// ─── CalcPayrollModal ─────────────────────────────────────────────────────────

interface CalcPayrollModalProps {
  employees: Employee[];
  loadingEmployees: boolean;
  initialMonth: number; initialYear: number; employeesError: string | null; onRetryEmployees: () => void;
  onClose: () => void;
  onSuccess: () => void;
}

function CalcPayrollModal({ employees, loadingEmployees, initialMonth, initialYear, employeesError, onRetryEmployees, onClose, onSuccess }: CalcPayrollModalProps) {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [saving, setSaving] = useState(false);

  const valid = Boolean(employeeId) && !employeesError && !loadingEmployees;
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setError(null);
    setSaving(true);
    try {
      await payrollApi.create({ employeeId, referenceMonth: month, referenceYear: year });
      toast.success('Folha calculada com sucesso.');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível calcular a folha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={() => { if (!saving) onClose(); }} title="Calcular folha" description="Selecione o funcionário e a competência.">
      {employeesError && <ErrorState message={employeesError} onRetry={onRetryEmployees} />}
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee select */}
          <label className="form-group">
            <span>Funcionário *</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={saving || loadingEmployees}
              required
              className="input-v2"
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
                className="input-v2"
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
                className="input-v2"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="outline" type="button" onClick={onClose} disabled={saving} className=" px-4">
              Cancelar
            </Button>
            <Button variant="primary"
              type="submit"
              disabled={!valid || saving}
              className=" disabled:opacity-50"
            >
              {saving ? (
                <>Calculando...</>
              ) : (
                <><Calculator size={14} /> Calcular</>
              )}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
