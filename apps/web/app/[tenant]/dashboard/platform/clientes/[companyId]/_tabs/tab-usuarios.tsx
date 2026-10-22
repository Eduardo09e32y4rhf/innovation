'use client';

import { useState } from 'react';
import { Button } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { api, type AppUser, type PlatformCompany } from '@/app/lib/api';
import { ROLE_LABEL } from '@/app/lib/format';
import { CompanyUsersModal } from '../../../_components/company-users-modal';
import { DataTable, type Column } from '../../../_components/data-table';
import { StateBlock } from '../../../_components/page-shell';

const columns: Column<AppUser>[] = [
  { key: 'name', label: 'Nome', cell: (u) => <span className="font-semibold">{u.name}</span> },
  { key: 'email', label: 'E-mail', cell: (u) => u.email },
  { key: 'role', label: 'Perfil', cell: (u) => ROLE_LABEL[u.role] ?? u.role },
  { key: 'status', label: 'Situação', cell: (u) => (u.isActive ? 'Ativo' : 'Inativo') },
];

/** Usuários da empresa. Quem pode alterar abre o gerenciador (criar, editar, desativar). */
export function TabUsuarios({ company, canWrite }: { company: PlatformCompany; canWrite: boolean }) {
  const users = useQuery(() => api.platform.listCompanyUsers(company.id), [company.id]);
  const [managing, setManaging] = useState(false);
  return (
    <div className="space-y-3">
      {canWrite && <div className="flex justify-end"><Button variant="outline" onClick={() => setManaging(true)}>Gerenciar usuários</Button></div>}
      <StateBlock loading={users.loading && !users.data} error={users.error} empty={!users.data?.length} emptyText="Nenhum usuário nesta empresa." loadingLabel="Carregando usuários…" onRetry={users.refetch}>
        <DataTable caption="Usuários da empresa" columns={columns} rows={users.data ?? []} rowKey={(u) => u.id} />
      </StateBlock>
      {managing && <CompanyUsersModal company={company} onClose={() => { setManaging(false); users.refetch(); }} />}
    </div>
  );
}
