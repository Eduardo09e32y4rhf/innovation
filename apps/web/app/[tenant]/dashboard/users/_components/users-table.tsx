import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { UserActionsMenu } from './user-actions-menu';
import { userAccessPolicy } from './access-policy';
import type { AppUser } from '@/app/lib/api';

interface UsersTableProps {
  rows: AppUser[]; currentRole?: string; currentUserId?: string; showCompanyColumn?: boolean;
  canManageRow: (currentRole?: string, targetRole?: string) => boolean;
  onEdit: (user: AppUser) => void; onResetPassword: (user: AppUser) => void;
  onToggleBlock: (user: AppUser) => void; onDownloadTerm: (user: AppUser) => void;
  onHistory: (user: AppUser) => void; onDelete: (user: AppUser) => void;
}
function lastAccess(value?: string | null) {
  return value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca acessou';
}
function UserStatus({ user }: { user: AppUser }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${user.isActive === false ? 'bg-rose-50 text-rose-700' : user.forcePasswordChange ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
    {user.isActive === false ? 'Bloqueado' : user.forcePasswordChange ? 'Troca pendente' : 'Ativo'}
  </span>;
}
export function UsersTable({ rows, currentRole, currentUserId, showCompanyColumn = false, canManageRow,
  onEdit, onResetPassword, onToggleBlock, onDownloadTerm, onHistory, onDelete }: UsersTableProps) {
  function actions(user: AppUser) {
    const policy = userAccessPolicy(currentRole, currentUserId, user);
    return <UserActionsMenu user={user} canManage={policy.edit && canManageRow(currentRole, user.role)} canRead={policy.read}
      canReset={policy.reset} canBlock={policy.block} canDelete={policy.delete} canDownload={policy.download}
      onEdit={onEdit} onResetPassword={onResetPassword} onToggleBlock={onToggleBlock}
      onDownloadTerm={onDownloadTerm} onHistory={onHistory} onDelete={onDelete} />;
  }
  function identity(user: AppUser) {
    const policy = userAccessPolicy(currentRole, currentUserId, user);
    return <div className="min-w-0">
      <button type="button" disabled={!policy.read} onClick={() => onEdit(user)}
        className="min-h-11 text-left text-sm font-semibold text-fg underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2">
        {normalizeDisplayName(user.name)}
      </button>
      <p className="break-all text-sm text-fg-mut">{user.email}</p>
      <p className="mt-1 text-xs text-fg-mut">{user.employee ? `${user.employee.name} · Matrícula ${user.employee.registration || 'não informada'}` : 'Sem funcionário vinculado'}</p>
    </div>;
  }
  return <>
    <ul className="grid gap-3 lg:hidden" aria-label="Usuários encontrados">
      {rows.map(user => <li key={user.id} className="card-v2 min-w-0 space-y-4 p-4">
        {identity(user)}
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-fg">{ROLE_LABEL[user.role] ?? user.role}</span><UserStatus user={user} /></div>
        <dl className="space-y-2 text-sm text-fg-mut">
          {showCompanyColumn && <div><dt className="font-medium">Empresa</dt><dd className="break-words">{user.company?.name ?? 'Não informada'}</dd></div>}
          <div><dt className="font-medium">Último acesso</dt><dd>{lastAccess(user.lastActiveAt)}</dd></div>
        </dl>
        {actions(user)}
      </li>)}
    </ul>
    <div className="card-v2 hidden lg:block">
      <div role="region" aria-label="Tabela de usuários" tabIndex={0} className="overflow-x-auto p-4">
        <table className="w-full min-w-[900px] text-left text-sm">
          <caption className="sr-only">Usuários, perfis, situação e ações permitidas</caption>
          <thead><tr className="border-b border-border text-fg-mut">
            <th scope="col" className="px-3 py-3 font-medium">Usuário e vínculo</th>
            {showCompanyColumn && <th scope="col" className="px-3 py-3 font-medium">Empresa</th>}
            <th scope="col" className="px-3 py-3 font-medium">Perfil</th><th scope="col" className="px-3 py-3 font-medium">Situação</th>
            <th scope="col" className="px-3 py-3 font-medium">Último acesso</th><th scope="col" className="px-3 py-3 font-medium">Ações</th>
          </tr></thead>
          <tbody>{rows.map(user => <tr key={user.id} className="border-b border-border last:border-0">
            <td className="px-3 py-4">{identity(user)}</td>
            {showCompanyColumn && <td className="px-3 py-4">{user.company?.name ?? 'Não informada'}</td>}
            <td className="px-3 py-4">{ROLE_LABEL[user.role] ?? user.role}</td><td className="px-3 py-4"><UserStatus user={user} /></td>
            <td className="px-3 py-4">{lastAccess(user.lastActiveAt)}</td><td className="px-3 py-4">{actions(user)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </>;
}
