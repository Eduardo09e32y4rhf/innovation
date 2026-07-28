'use client';

import { useMemo, useState } from 'react';
import { Check, Filter, RotateCcw, Save, Search, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';

type GlobalRole = 'DEV' | 'ADMIN' | 'COMERCIAL' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';
type PermissionCode =
  | 'admin'
  | 'config_company'
  | 'config_payroll'
  | 'config_time'
  | 'time_admin'
  | 'time_approve'
  | 'time_view'
  | 'time_clock'
  | 'manage_employees'
  | 'payroll'
  | 'documents'
  | 'settings_basic';

const ROLES: GlobalRole[] = ['DEV', 'ADMIN', 'COMERCIAL', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];

const ROLE_LABELS: Record<GlobalRole, string> = {
  DEV: 'DEV / Super Admin',
  ADMIN: 'Administrador',
  COMERCIAL: 'Comercial',
  RH: 'Recursos Humanos',
  GESTOR: 'Gestor',
  FUNCIONARIO: 'Funcionario',
  CONSULTA: 'Apenas consulta',
};

const ROLE_DEFAULTS: Record<GlobalRole, PermissionCode[]> = {
  DEV: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  ADMIN: ['admin', 'config_company', 'config_payroll', 'config_time', 'time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  COMERCIAL: [],
  RH: ['time_admin', 'time_approve', 'time_view', 'time_clock', 'manage_employees', 'payroll', 'documents', 'settings_basic'],
  GESTOR: ['time_approve', 'time_view', 'time_clock', 'manage_employees', 'settings_basic'],
  FUNCIONARIO: ['time_view', 'time_clock', 'settings_basic'],
  CONSULTA: ['time_view'],
};

const PERMISSION_LABELS: Record<PermissionCode, string> = {
  admin: 'Acesso administrativo total',
  config_company: 'Configurar empresa e plano',
  config_payroll: 'Configurar folha e beneficios',
  config_time: 'Configurar jornada e regras',
  time_admin: 'Administrar ponto da equipe',
  time_approve: 'Aprovar ajustes de ponto',
  time_view: 'Visualizar ponto',
  time_clock: 'Bater ponto',
  manage_employees: 'Gerenciar funcionarios',
  payroll: 'Acessar calculos de folha',
  documents: 'Visualizar documentos',
  settings_basic: 'Acessos basicos de configuracao',
};

const PERMISSION_GROUPS: Array<{ title: string; description: string; items: PermissionCode[] }> = [
  {
    title: 'Administracao',
    description: 'Permissoes que controlam o acesso mais sensivel da plataforma.',
    items: ['admin', 'config_company', 'config_payroll', 'config_time'],
  },
  {
    title: 'Ponto e jornada',
    description: 'Controle de batida, visao de equipe e aprovacao manual.',
    items: ['time_admin', 'time_approve', 'time_view', 'time_clock'],
  },
  {
    title: 'RH e documentos',
    description: 'Acesso a cadastro, arquivos e calculos operacionais.',
    items: ['manage_employees', 'payroll', 'documents'],
  },
  {
    title: 'Ajustes gerais',
    description: 'Acessos basicos para configuracoes e navegacao da plataforma.',
    items: ['settings_basic'],
  },
];

export default function GlobalPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<GlobalRole>('GESTOR');
  const [draftByRole, setDraftByRole] = useState<Partial<Record<GlobalRole, PermissionCode[]>>>({});
  const [search, setSearch] = useState('');

  const permissionsData = useQuery(() => request<{ role: GlobalRole; permissions: PermissionCode[] }[]>('/platform/global-permissions'), []);
  const currentPermissions = permissionsData.data?.find((item) => item.role === selectedRole)?.permissions || [];
  const activePermissions = draftByRole[selectedRole] ?? currentPermissions;
  const isDirty = Object.prototype.hasOwnProperty.call(draftByRole, selectedRole);
  const defaults = ROLE_DEFAULTS[selectedRole];

  const catalog = useMemo(() => (
    PERMISSION_GROUPS.flatMap((group) => group.items.map((permission) => ({
      permission,
      label: PERMISSION_LABELS[permission],
      group: group.title,
      description: group.description,
    })))
  ), []);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalog;
    return catalog.filter((item) =>
      item.permission.toLowerCase().includes(term)
      || item.label.toLowerCase().includes(term)
      || item.group.toLowerCase().includes(term),
    );
  }, [catalog, search]);

  const save = useMutation(
    (permissions: PermissionCode[]) => request(`/platform/global-permissions/${selectedRole}`, { method: 'PATCH', body: { permissions } }),
    {
      onSuccess: () => {
        permissionsData.refetch();
        setDraftByRole((current) => {
          const next = { ...current };
          delete next[selectedRole];
          return next;
        });
        toast.success(`Permissoes de ${ROLE_LABELS[selectedRole]} salvas.`);
      },
    },
  );

  function selectRole(role: GlobalRole) {
    setSelectedRole(role);
  }

  function setDraft(next: PermissionCode[]) {
    setDraftByRole((current) => ({ ...current, [selectedRole]: next }));
  }

  function togglePermission(permission: PermissionCode) {
    const next = activePermissions.includes(permission)
      ? activePermissions.filter((item) => item !== permission)
      : [...activePermissions, permission];
    setDraft(next);
  }

  function restoreDefaults() {
    setDraft(defaults);
  }

  function clearAll() {
    setDraft([]);
  }

  function selectAll() {
    setDraft(PERMISSION_GROUPS.flatMap((group) => group.items));
  }

  function clearChanges() {
    setDraftByRole((current) => {
      const next = { ...current };
      delete next[selectedRole];
      return next;
    });
  }

  if (permissionsData.loading) return <LoadingState label="Carregando permissoes globais..." />;
  if (permissionsData.error) return <ErrorState message={permissionsData.error} onRetry={permissionsData.refetch} />;

  const activeCount = activePermissions.length;
  const defaultCount = defaults.length;
  const delta = activeCount - defaultCount;

  return (
    <div className="mx-auto w-full space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><ShieldCheck size={20} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-600">Configuracao</p>
              <h2 className="mt-1 text-lg font-black text-slate-950">Permissoes globais</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Ajuste o que cada perfil pode fazer. As mudancas sao salvas no servidor, preservam rascunho por perfil e nao desaparecem ao trocar de aba.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${isDirty ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
              <span className={`h-2 w-2 rounded-full ${isDirty ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {isDirty ? 'Alteracoes pendentes' : 'Sincronizado'}
            </span>
            <button type="button" onClick={() => save.mutate(activePermissions)} disabled={!isDirty || save.loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Save size={14} />
              {save.loading ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Perfis do sistema</p>
          {ROLES.map((role) => {
            const permissions = permissionsData.data?.find((item) => item.role === role)?.permissions || ROLE_DEFAULTS[role];
            const dirty = Object.prototype.hasOwnProperty.call(draftByRole, role);
            return (
              <button
                type="button"
                key={role}
                onClick={() => selectRole(role)}
                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                  selectedRole === role ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{ROLE_LABELS[role]}</span>
                  {dirty && <span className={`rounded-full px-2 py-0.5 text-[10px] ${selectedRole === role ? 'bg-white/15 text-white' : 'bg-amber-50 text-amber-700'}`}>rascunho</span>}
                </span>
                <span className="text-[10px] font-black opacity-70">{permissions.length}</span>
              </button>
            );
          })}
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-violet-600" />
                  <h3 className="text-base font-black text-slate-950">{ROLE_LABELS[selectedRole]}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {activeCount} permissao(oes) ativa(s) | padrao do perfil: {defaultCount} | {delta === 0 ? 'mesmo nivel do padrao' : delta > 0 ? `+${delta} acima do padrao` : `${Math.abs(delta)} abaixo do padrao`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={selectAll} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <Check size={14} />
                  Marcar todas
                </button>
                <button type="button" onClick={clearAll} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <RotateCcw size={14} />
                  Limpar
                </button>
                <button type="button" onClick={restoreDefaults} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
                  <RotateCcw size={14} />
                  Restaurar padrao
                </button>
                <button type="button" onClick={clearChanges} disabled={!isDirty} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                  Cancelar rascunho
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar permissao, grupo ou codigo..."
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                />
              </label>
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500">
                <Filter size={14} className="mr-2" />
                {filteredCatalog.length} de {catalog.length} itens visiveis
              </div>
            </div>
          </div>

          {isDirty && (
            <div className="mx-5 mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Voce tem alteracoes pendentes neste perfil. Salve para publicar as mudancas no sistema.
            </div>
          )}

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {PERMISSION_GROUPS.map((group) => {
              const visibleItems = filteredCatalog.filter((item) => item.group === group.title);
              if (!visibleItems.length) return null;
              return (
                <div key={group.title} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-950">{group.title}</h4>
                      <p className="mt-1 text-[10px] leading-5 text-slate-500">{group.description}</p>
                    </div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-500">
                      {visibleItems.length}
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {visibleItems.map((item) => {
                      const checked = activePermissions.includes(item.permission);
                      return (
                        <label
                          key={item.permission}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                            checked ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePermission(item.permission)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">{item.permission}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-500">As alteracoes sao aplicadas por perfil e afetam todos os usuarios vinculados.</p>
            <button
              type="button"
              onClick={() => save.mutate(activePermissions)}
              disabled={!isDirty || save.loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              {save.loading ? 'Salvando...' : 'Salvar perfil'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
