'use client';

import Link from 'next/link';
import { Edit3, UserMinus, UserPlus } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee } from '@/app/lib/api';
import { EMPLOYEE_STATUS_LABEL, formatCpf } from '@/app/lib/format';

export default function EmployeesPage() {
  const { data, loading, error, refetch } = useQuery(() => api.employees.list(), []);
  const terminate = useMutation((id: string) => api.employees.terminate(id), {
    onSuccess: () => refetch(),
  });

  const employees = data ?? [];

  async function handleTerminate(employee: Employee) {
    if (employee.status === 'TERMINATED') return;
    const ok = window.confirm(`Desligar ${employee.name}? O cadastro sera marcado como desligado.`);
    if (!ok) return;
    try {
      await terminate.mutate(employee.id);
    } catch {
      /* erro ja exibido via terminate.error */
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionários</p>
          <h2 className="text-2xl font-black text-slate-950">Cadastro da equipe</h2>
        </div>
        <Link href="/dashboard/employees/new" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
          <UserPlus size={14} />
          Novo
        </Link>
      </header>

      {terminate.error && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{terminate.error}</p>
      )}

      {loading ? (
        <LoadingState label="Carregando funcionarios..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : employees.length === 0 ? (
        <EmptyState message="Nenhum funcionario cadastrado. Clique em Novo para comecar." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">CPF</th>
                  <th className="pb-3 pr-4">Departamento</th>
                  <th className="pb-3 pr-4">Cargo</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-slate-100 text-xs text-slate-700">
                    <td className="py-3 pr-4 font-medium text-slate-950">{employee.name}</td>
                    <td className="py-3 pr-4">{formatCpf(employee.cpf)}</td>
                    <td className="py-3 pr-4">{employee.department}</td>
                    <td className="py-3 pr-4">{employee.position}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={employee.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/employees/new?id=${employee.id}`}
                          className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"
                        >
                          <Edit3 size={12} />Editar
                        </Link>
                        <button
                          onClick={() => handleTerminate(employee)}
                          disabled={employee.status === 'TERMINATED' || terminate.loading}
                          className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-50"
                        >
                          <UserMinus size={12} />Desligar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
    TERMINATED: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${map[status] ?? map.INACTIVE}`}>
      {EMPLOYEE_STATUS_LABEL[status] ?? status}
    </span>
  );
}
