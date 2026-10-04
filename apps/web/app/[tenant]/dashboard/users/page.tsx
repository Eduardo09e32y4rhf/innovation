'use client';

import { Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type AppUser } from '@/app/lib/api';
import { resolveUserRole } from '@/app/lib/user-role';
import { CreateUserModal } from './_v2/create-modal';
import { ROLE_INFO, STATUS_LABEL, STATUS_STYLE, accessStatus, canOpenPage, rolesFor, type AccessStatus } from './_v2/policy';
import { UserEditor } from './_v2/user-editor';

const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PAGE_SIZE = 25;
type StatusFilter = 'TODOS' | AccessStatus;

export default function UsersPage() {
  const { user: me, company, loading: authLoading } = useAuth();
  const role = resolveUserRole(me);
  const allowed = canOpenPage(role);
  const isDev = role === 'DEV';

  const users = useQuery(() => api.users.list(), [role, company?.id], { enabled: allowed });
  const usage = useQuery(() => api.users.usage(), [company?.id], { enabled: allowed });
  const companies = useQuery(() => api.platform.listCompanies({ limit: 1000 }).then((result) => result.data), [], { enabled: isDev });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('TODOS');
  const [roleFilter, setRoleFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => setPage(1), [search, status, roleFilter, companyFilter]);

  const rows = users.data ?? [];
  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = { TODOS: rows.length, ATIVO: 0, BLOQUEADO: 0, CANCELADO: 0 };
    for (const row of rows) result[accessStatus(row)] += 1;
    return result;
  }, [rows]);

  const filtered = useMemo(() => rows.filter((row) => {
    if (search && !norm(`${row.name} ${row.email} ${row.company?.name ?? ''} ${row.employee?.registration ?? ''}`).includes(norm(search.trim()))) return false;
    if (status !== 'TODOS' && accessStatus(row) !== status) return false;
    if (roleFilter && row.role !== roleFilter) return false;
    if (companyFilter && row.companyId !== companyFilter) return false;
    return true;
  }), [rows, search, status, roleFilter, companyFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const selected: AppUser | null = rows.find((row) => row.id === selectedId) ?? null;

  if (authLoading || !me) return <LoadingState label="Carregando…" />;
  if (!allowed) return <section className="card-v2 m-4 p-5"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-fg-sub">Seu perfil não gerencia usuários.</p></section>;

  const companyOptions = companies.data ?? [];
  const seatsFull = usage.data ? usage.data.used >= usage.data.max : false;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-3 py-4 sm:px-5 lg:px-6">
      <PageHeader title="Usuários" subtitle={isDev ? 'Todos os acessos da plataforma, por empresa.' : 'Quem acessa a sua empresa e com qual visão.'}
        actions={<div className="flex flex-wrap items-center gap-2">
          {usage.data && <span className={`rounded-full border px-3 py-1 text-xs font-medium ${seatsFull ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-border text-fg-sub'}`}>{usage.data.used} de {usage.data.max} licenças</span>}
          <Button variant="outline" onClick={() => { void users.refetch(); void usage.refetch(); }} aria-label="Atualizar lista"><RefreshCw size={15} aria-hidden="true" /></Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={16} aria-hidden="true" /> Novo acesso</Button>
        </div>} />

      <div className="card-v2 space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search size={16} className="absolute left-3 top-3.5 text-fg-sub" aria-hidden="true" />
            <input className="input-v2 min-h-11 w-full pl-9" placeholder="Buscar por nome, e-mail, empresa ou matrícula" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar usuários" />
          </label>
          <select className="input-v2 min-h-11" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filtrar por visão">
            <option value="">Todas as visões</option>{(isDev ? (Object.keys(ROLE_INFO) as (keyof typeof ROLE_INFO)[]) : rolesFor(role)).map((r) => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
          </select>
          {isDev && <select className="input-v2 min-h-11" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} aria-label="Filtrar por empresa"><option value="">Todas as empresas</option>{companyOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação do acesso">
          {(['TODOS', 'ATIVO', 'BLOQUEADO', 'CANCELADO'] as StatusFilter[]).map((item) => (
            <button key={item} type="button" aria-pressed={status === item} onClick={() => setStatus(item)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${status === item ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-border text-fg-sub hover:bg-bg-sub'}`}>
              {item === 'TODOS' ? 'Todos' : `${STATUS_LABEL[item]}s`} · {counts[item]}
            </button>
          ))}
        </div>
      </div>

      {users.error && <ErrorState message={users.error} onRetry={users.refetch} />}
      {users.loading && !users.data ? <LoadingState label="Carregando usuários…" /> : filtered.length === 0 ? <EmptyState message="Nenhum usuário encontrado." /> : (
        <>
          <ul className="card-v2 divide-y divide-border">
            {visible.map((row) => {
              const state = accessStatus(row);
              return (
                <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">{row.name.trim().charAt(0).toUpperCase()}</span>
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(row.id)}>
                    <span className="block truncate text-sm font-semibold text-fg">{row.name}</span>
                    <span className="block truncate text-xs text-fg-sub">{row.company?.name ?? '—'}</span>
                  </button>
                  <span className={`hidden rounded-full border px-2.5 py-0.5 text-xs font-medium sm:inline-block ${STATUS_STYLE[state]}`}>{STATUS_LABEL[state]}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(row.id)}><Pencil size={14} aria-hidden="true" /> Editar</Button>
                </li>
              );
            })}
          </ul>
          {pageCount > 1 && (
            <nav aria-label="Paginação" className="flex items-center justify-between text-sm text-fg-sub">
              <span>{filtered.length} usuário(s) · página {current} de {pageCount}</span>
              <span className="flex gap-2"><Button variant="outline" size="sm" disabled={current <= 1} onClick={() => setPage(current - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={current >= pageCount} onClick={() => setPage(current + 1)}>Próxima</Button></span>
            </nav>
          )}
        </>
      )}

      <UserEditor user={selected} isOpen={Boolean(selected)} onClose={() => setSelectedId(null)} actorRole={role} actorId={me.id} onChanged={() => { void users.refetch(); void usage.refetch(); }} />
      <CreateUserModal isOpen={createOpen} onClose={() => setCreateOpen(false)} roles={rolesFor(role)} isDev={isDev}
        companies={companyOptions.map((c) => ({ id: c.id, name: c.name }))} defaultCompanyId={company?.id} onCreated={() => { void users.refetch(); void usage.refetch(); }} />
    </div>
  );
}
