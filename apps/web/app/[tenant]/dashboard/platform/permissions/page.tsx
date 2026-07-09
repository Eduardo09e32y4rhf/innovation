'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import Link from 'next/link';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { PERMISSIONS_LABELS, type Permission } from '@/app/lib/permissions';

const ROLES = ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];
const ROLE_LABELS: Record<string, string> = {
  DEV: 'Desenvolvedor', COMERCIAL: 'Comercial', ADMIN: 'Administrador',
  RH: 'Recursos Humanos', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Apenas Consulta'
};

export default function GlobalPermissionsPage({ params: { tenant } }: { params: { tenant: string } }) {
  const [selectedRole, setSelectedRole] = useState('GESTOR');
  
  const permissionsData = useQuery(() => request<{ role: string; permissions: string[] }[]>('/platform/global-permissions'), []);
  
  const currentPermissions = permissionsData.data?.find(p => p.role === selectedRole)?.permissions || [];
  
  const [localPermissions, setLocalPermissions] = useState<string[] | null>(null);

  const save = useMutation((perms: string[]) => request(`/platform/global-permissions/${selectedRole}`, { method: 'PATCH', body: { permissions: perms } }), {
    onSuccess: () => { permissionsData.refetch(); setLocalPermissions(null); alert('Permissões salvas!'); }
  });

  const activePermissions = localPermissions ?? currentPermissions;

  function togglePermission(p: string) {
    if (activePermissions.includes(p)) {
      setLocalPermissions(activePermissions.filter(x => x !== p));
    } else {
      setLocalPermissions([...activePermissions, p]);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Gestão da Plataforma</h2>
          <div className="mt-4 flex gap-4 border-b border-slate-200">
            <Link href={`/${tenant}/dashboard/platform`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Empresas</Link>
            <Link href={`/${tenant}/dashboard/platform/plans`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Planos & Assinaturas</Link>
            <Link href={`/${tenant}/dashboard/platform/finance`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Financeiro (Em Breve)</Link>
            <Link href={`/${tenant}/dashboard/platform/permissions`} className="border-b-2 border-indigo-600 pb-2 text-sm font-bold text-indigo-600">Permissões Globais</Link>
          </div>
        </div>
        <button 
          onClick={() => save.mutate(activePermissions)}
          disabled={save.loading || localPermissions === null}
          className="crystal-button inline-flex h-10 items-center gap-2 rounded-[8px] px-4 text-xs font-black text-white disabled:opacity-50"
        >
          <Save size={14} /> Salvar Alterações
        </button>
      </header>

      {permissionsData.error ? (
        <ErrorState message={permissionsData.error} onRetry={permissionsData.refetch} />
      ) : permissionsData.loading ? (
        <LoadingState label="Carregando configurações..." />
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Selecione o Perfil</h3>
            {ROLES.map(role => (
              <button
                key={role}
                onClick={() => { setSelectedRole(role); setLocalPermissions(null); }}
                className={`text-left px-4 py-3 rounded-[8px] text-sm font-medium transition-colors ${selectedRole === role ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          <div className="flex-1 ops-card rounded-[12px] border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Permissões para {ROLE_LABELS[selectedRole]}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(PERMISSIONS_LABELS) as Permission[]).map(p => (
                <label key={p} className={`flex items-start gap-3 p-3 rounded-[8px] border cursor-pointer transition-colors ${activePermissions.includes(p) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={activePermissions.includes(p)}
                    onChange={() => togglePermission(p)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{PERMISSIONS_LABELS[p]}</div>
                    <div className="text-[11px] text-slate-500">{p}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
