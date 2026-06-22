'use client';

import Link from 'next/link';
import { Edit3, Search, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api, type Employee } from '@/app/lib/api';
import { EMPLOYEE_STATUS_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

export default function EmployeesPage() {
  const { user } = useAuth();
  const profile = user?.profile?.toUpperCase();
  const canEdit = profile === 'DEV' || profile === 'ADMIN' || profile === 'RH';
  const isGestor = profile === 'GESTOR';
  const { data, loading, error, refetch } = useQuery(() => api.employees.list(), []);
  const [search, setSearch] = useState('');
  const terminate = useMutation((id: string) => api.employees.terminate(id), { onSuccess: () => refetch() });
  const remove = useMutation((id: string) => api.employees.delete(id), { onSuccess: () => refetch() });

  const employees = data ?? [];
  const managerById = useMemo(() => new Map(employees.map((employee) => [employee.id, normalizeDisplayName(employee.name)])), [employees]);
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = search.replace(/\D/g, '');
    return employees
      .filter((employee) => {
        if (!term && !digits) return true;
        const managerName = employee.managerId ? managerById.get(employee.managerId) ?? '' : '';
        return normalizeDisplayName(employee.name).toLowerCase().includes(term)
          || String(employee.registration ?? '').toLowerCase().includes(term)
          || String(employee.department ?? '').toLowerCase().includes(term)
          || managerName.toLowerCase().includes(term)
          || employee.cpf.replace(/\D/g, '').includes(digits);
      })
      .toSorted((a, b) => collator.compare(normalizeDisplayName(a.name), normalizeDisplayName(b.name)));
  }, [employees, managerById, search]);

  async function handleTerminate(employee: Employee) {
    if (employee.status === 'TERMINATED') return;
    const ok = window.confirm(`Desligar ${normalizeDisplayName(employee.name)}? O cadastro será marcado como desligado.`);
    if (!ok) return;
    await terminate.mutate(employee.id).catch(() => {});
  }

  async function handleDelete(employee: Employee) {
    const expected = normalizeDisplayName(employee.name);
    const typed = window.prompt(`Excluir definitivamente ${expected}? Digite o nome do funcionário para confirmar.`);
    if (typed !== expected) return;
    await remove.mutate(employee.id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionários</p>
          <h2 className="text-2xl font-black text-slate-950">{isGestor ? 'Minha equipe' : 'Cadastro da equipe'}</h2>
        </div>
        {canEdit && (
          <Link href="/dashboard/employees/new" className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white">
            <UserPlus size={14} />
            Novo
          </Link>
        )}
      </header>

      <section className="ops-card rounded-[8px] border border-slate-200 bg-white p-4">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          <span>Pesquisar por nome, CPF, matrícula, gestor ou departamento</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Digite para filtrar a equipe" className="h-10 w-full rounded-[8px] border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-teal-500" />
          </div>
        </label>
      </section>

      {(terminate.error || remove.error) && (
        <p className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{terminate.error || remove.error}</p>
      )}

      {loading ? (
        <LoadingState label="Carregando funcionários..." />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : employees.length === 0 ? (
        <EmptyState message={isGestor ? 'Nenhum funcionário na sua equipe.' : 'Nenhum funcionário cadastrado. Clique em Novo para começar.'} />
      ) : filteredEmployees.length === 0 ? (
        <EmptyState message="Nenhum funcionário encontrado para a pesquisa." />
      ) : (
        <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="text-[11px] font-medium text-slate-500">
                  <th className="pb-3 pr-4">Nome</th>
                  <th className="pb-3 pr-4">Matrícula</th>
                  <th className="pb-3 pr-4">Gestor</th>
                  <th className="pb-3 pr-4">Departamento</th>
                  <th className="pb-3 pr-4">Cargo</th>
                  <th className="pb-3 pr-4">Status</th>
                  {canEdit && <th className="pb-3">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => {
                  const managerName = employee.managerId ? managerById.get(employee.managerId) : '';
                  return (
                    <tr key={employee.id} className="border-t border-slate-100 text-xs text-slate-700">
                      <td className="py-3 pr-4 font-medium text-slate-950">{normalizeDisplayName(employee.name)}</td>
                      <td className="py-3 pr-4">{employee.registration || '-'}</td>
                      <td className="py-3 pr-4">{managerName || ''}</td>
                      <td className="py-3 pr-4">{employee.department}</td>
                      <td className="py-3 pr-4">{employee.position}</td>
                      <td className="py-3 pr-4"><StatusBadge status={employee.status} /></td>
                      {canEdit && (
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/dashboard/employees/new?id=${employee.id}`} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]">
                              <Edit3 size={12} />Editar
                            </Link>
                            <button onClick={() => handleTerminate(employee)} disabled={employee.status === 'TERMINATED' || terminate.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] disabled:opacity-50">
                              <UserMinus size={12} />Desligar
                            </button>
                            <button onClick={() => handleDelete(employee)} disabled={remove.loading} className="btn-outline inline-flex h-8 items-center gap-2 px-3 text-[11px] text-rose-600 disabled:opacity-50">
                              <Trash2 size={12} />Excluir
                            </button>
                          </div>
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