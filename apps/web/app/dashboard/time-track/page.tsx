'use client';

import { useMemo, useState } from 'react';
import { Clock3, Download, FileSpreadsheet, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee, type PunchType, type TimeTrack } from '@/app/lib/api';
import { formatDate, formatMinutes, formatTime } from '@/app/lib/format';

const PUNCH_SEQUENCE: { value: PunchType; field: keyof TimeTrack; label: string }[] = [
  { value: 'ENTRY', field: 'entry', label: 'Entrada' },
  { value: 'LUNCH_START', field: 'lunchStart', label: 'Saida almoco' },
  { value: 'LUNCH_RETURN', field: 'lunchReturn', label: 'Retorno almoco' },
  { value: 'EXIT', field: 'exit', label: 'Saida' },
];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function toDateKey(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function toCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: TimeTrack[]) {
  const header = ['Funcionario', 'Data', 'Entrada', 'Saida almoco', 'Retorno almoco', 'Saida', 'Total trabalhado', 'Saldo'];
  const lines = [header.map(toCsvCell).join(',')];
  for (const row of rows) {
    lines.push([
      row.employee?.name ?? '',
      formatDate(row.date),
      formatTime(row.entry),
      formatTime(row.lunchStart),
      formatTime(row.lunchReturn),
      formatTime(row.exit),
      formatMinutes(row.totalWorked),
      formatMinutes(row.dailyBalance),
    ].map(toCsvCell).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function TimeTrackPage() {
  const tracks = useQuery(() => api.timeTrack.list(), []);
  const employees = useQuery(() => api.employees.list(), []);
  const [open, setOpen] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());

  const activeEmployees = (employees.data ?? []).filter((employee) => employee.status === 'ACTIVE');
  const rows = useMemo(() => {
    return (tracks.data ?? []).filter((row) => {
      if (employeeFilter && row.employeeId !== employeeFilter) return false;
      if (monthFilter && !toDateKey(row.date).startsWith(monthFilter)) return false;
      return true;
    });
  }, [tracks.data, employeeFilter, monthFilter]);

  const selectedEmployee = activeEmployees.find((employee) => employee.id === employeeFilter);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Controle de ponto</p>
          <h2 className="text-2xl font-black text-slate-950">Folha de ponto da empresa</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            onClick={() => downloadCsv(`folha-ponto-${selectedEmployee?.name ?? 'empresa'}-${monthFilter || 'todos'}.csv`, rows)}
            disabled={rows.length === 0}
            className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50"
          >
            <Download size={14} /> Exportar filtro
          </button>
          <button
            onClick={() => downloadCsv(`folha-ponto-empresa-${monthFilter || 'todos'}.csv`, (tracks.data ?? []).filter((row) => !monthFilter || toDateKey(row.date).startsWith(monthFilter)))}
            disabled={(tracks.data ?? []).length === 0}
            className="btn-outline inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black disabled:opacity-50"
          >
            <FileSpreadsheet size={14} /> Exportar empresa
          </button>
          <button
            onClick={() => setOpen(true)}
            className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white"
          >
            <Clock3 size={14} /> Lancar ponto
          </button>
        </div>
      </header>

      <section className="ops-card grid gap-3 rounded-[8px] border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_180px]">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Filtrar por funcionario</span>
          <select
            value={employeeFilter}
            onChange={(event) => setEmployeeFilter(event.target.value)}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          >
            <option value="">Todos os funcionarios</option>
            {activeEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Mes da folha</span>
          <input
            type="month"
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
            className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
          />
        </label>
      </section>

      {tracks.loading ? (
        <LoadingState label="Carregando folha de ponto..." />
      ) : tracks.error ? (
        <ErrorState message={tracks.error} onRetry={tracks.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhum registro de ponto para o filtro selecionado." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Funcionario</th>
                  <th className="pb-3 pr-4">Data</th>
                  <th className="pb-3 pr-4">Entrada</th>
                  <th className="pb-3 pr-4">Almoco</th>
                  <th className="pb-3 pr-4">Saida</th>
                  <th className="pb-3 pr-4">Trabalhado</th>
                  <th className="pb-3 pr-4">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-xs text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-950">{row.employee?.name ?? '-'}</td>
                    <td className="py-3 pr-4">{formatDate(row.date)}</td>
                    <td className="py-3 pr-4">{formatTime(row.entry)}</td>
                    <td className="py-3 pr-4">{formatTime(row.lunchStart)} - {formatTime(row.lunchReturn)}</td>
                    <td className="py-3 pr-4">{formatTime(row.exit)}</td>
                    <td className="py-3 pr-4">{formatMinutes(row.totalWorked)}</td>
                    <td className={`py-3 pr-4 font-medium ${(row.dailyBalance ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatMinutes(row.dailyBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {open && (
        <ManualTimeSheetModal
          employees={activeEmployees}
          employeesLoading={employees.loading}
          employeesError={employees.error}
          defaultEmployeeId={employeeFilter}
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            tracks.refetch();
          }}
        />
      )}
    </div>
  );
}

function ManualTimeSheetModal({
  employees, employeesLoading, employeesError, defaultEmployeeId, onClose, onDone,
}: {
  employees: Pick<Employee, 'id' | 'name'>[];
  employeesLoading: boolean;
  employeesError: string | null;
  defaultEmployeeId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entry, setEntry] = useState('08:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchReturn, setLunchReturn] = useState('13:00');
  const [exit, setExit] = useState('17:00');
  const [observation, setObservation] = useState('Lancamento manual RH');

  const register = useMutation(async () => {
    const marks = [
      { type: 'ENTRY' as PunchType, value: entry },
      { type: 'LUNCH_START' as PunchType, value: lunchStart },
      { type: 'LUNCH_RETURN' as PunchType, value: lunchReturn },
      { type: 'EXIT' as PunchType, value: exit },
    ].filter((mark) => mark.value);

    for (const mark of marks) {
      await api.timeTrack.register({
        employeeId,
        type: mark.type,
        timestamp: `${date}T${mark.value}:00.000`,
        observation,
      });
    }
  }, { onSuccess: onDone });

  const valid = Boolean(employeeId && date && (entry || lunchStart || lunchReturn || exit));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[12px] border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-950">Lancar folha de ponto</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {(register.error || employeesError) && (
          <p className="mb-3 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {register.error || employeesError}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Funcionario</span>
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500"
            >
              <option value="">{employeesLoading ? 'Carregando equipe...' : 'Selecione...'}</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-xs font-medium text-slate-600">
            <span>Data da folha</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>

          {PUNCH_SEQUENCE.map((item) => {
            const value = item.value === 'ENTRY' ? entry : item.value === 'LUNCH_START' ? lunchStart : item.value === 'LUNCH_RETURN' ? lunchReturn : exit;
            const setter = item.value === 'ENTRY' ? setEntry : item.value === 'LUNCH_START' ? setLunchStart : item.value === 'LUNCH_RETURN' ? setLunchReturn : setExit;
            return (
              <label key={item.value} className="space-y-1 text-xs font-medium text-slate-600">
                <span>{item.label}</span>
                <input type="time" value={value} onChange={(event) => setter(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
              </label>
            );
          })}

          <label className="space-y-1 text-xs font-medium text-slate-600 sm:col-span-2">
            <span>Observacao</span>
            <input value={observation} onChange={(event) => setObservation(event.target.value)} className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>
        </div>

        {!employeesLoading && employees.length === 0 ? (
          <p className="mt-4 rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Cadastre um funcionario ativo antes de lancar a folha de ponto.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline h-10 rounded-[8px] px-4 text-xs font-bold">Cancelar</button>
          <button
            onClick={() => valid && register.mutate().catch(() => {})}
            disabled={!valid || employees.length === 0 || register.loading}
            className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-60"
          >
            {register.loading ? 'Lancando...' : 'Lancar folha'}
          </button>
        </div>
      </div>
    </div>
  );
}