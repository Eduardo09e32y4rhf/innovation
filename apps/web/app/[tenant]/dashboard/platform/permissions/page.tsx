'use client';

import { useMemo, useState } from 'react';
import { Check, Save, ShieldCheck, Users } from 'lucide-react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { PERMISSIONS_LABELS, type Permission } from '@/app/lib/permissions';

const ROLES = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const ROLE_LABELS: Record<string, string> = { ADMIN: 'Administrador', RH: 'Recursos Humanos', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionario', CONSULTA: 'Apenas consulta' };

export default function GlobalPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState('GESTOR');
  const [localPermissions, setLocalPermissions] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const permissionsData = useQuery(() => request<{ role: string; permissions: string[] }[]>('/platform/global-permissions'), []);
  const currentPermissions = permissionsData.data?.find((item) => item.role === selectedRole)?.permissions || [];
  const activePermissions = localPermissions ?? currentPermissions;
  const changed = localPermissions !== null;
  const groupedPermissions = useMemo(() => Object.entries(PERMISSIONS_LABELS as Record<string, string>), []);
  const save = useMutation((permissions: string[]) => request(`/platform/global-permissions/${selectedRole}`, { method: 'PATCH', body: { permissions } }), { onSuccess: () => { permissionsData.refetch(); setLocalPermissions(null); setSaved(true); } });

  function selectRole(role: string) { setSelectedRole(role); setLocalPermissions(null); setSaved(false); }
  function togglePermission(permission: string) { setSaved(false); setLocalPermissions(activePermissions.includes(permission) ? activePermissions.filter((item) => item !== permission) : [...activePermissions, permission]); }

  if (permissionsData.loading) return <LoadingState label="Carregando permissoes globais..." />;
  if (permissionsData.error) return <ErrorState message={permissionsData.error} onRetry={permissionsData.refetch} />;

  return (
    <div className="mx-auto w-full space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><ShieldCheck size={20} /></div><div><h2 className="text-lg font-black text-slate-950">Permissoes globais</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Defina o que cada perfil pode fazer. A alteracao vale para todos os usuarios daquele perfil e fica registrada no servidor.</p></div></div></header>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">Perfis do sistema</p>{ROLES.map((role) => <button type="button" key={role} onClick={() => selectRole(role)} className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold transition ${selectedRole === role ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`}><span>{ROLE_LABELS[role]}</span>{selectedRole === role && <Check size={15} />}</button>)}</aside>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Users size={16} className="text-violet-600" /><h3 className="text-base font-black text-slate-950">{ROLE_LABELS[selectedRole]}</h3></div><p className="mt-1 text-xs text-slate-500">{activePermissions.length} de {groupedPermissions.length} permissoes ativas</p></div><button type="button" onClick={() => save.mutate(activePermissions)} disabled={!changed || save.loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={14} />{save.loading ? 'Salvando...' : changed ? 'Salvar alteracoes' : 'Sem alteracoes'}</button></div><div className="grid gap-3 p-5 sm:grid-cols-2">{groupedPermissions.map(([permission, label]) => <label key={permission} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${activePermissions.includes(permission) ? 'border-violet-300 bg-violet-50/60' : 'border-slate-200 hover:bg-slate-50'}`}><input type="checkbox" checked={activePermissions.includes(permission)} onChange={() => togglePermission(permission)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" /><span><span className="block text-sm font-bold text-slate-900">{label}</span><span className="mt-0.5 block text-[10px] text-slate-400">{permission}</span></span></label>)}</div>{saved && <p className="mx-5 mb-5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Permissoes salvas com sucesso.</p>}</section>
      </div>
    </div>
  );
}
