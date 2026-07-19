import { ROLE_LABEL } from '@/app/lib/format';
import { normalizeDisplayName } from '@/app/lib/text';
import { UserActionsMenu } from './user-actions-menu';
import type { AppUser } from '@/app/lib/api';

interface UsersTableProps {
  rows: AppUser[];
  currentRole?: string;
  canManageRow: (currentRole?: string, targetRole?: string) => boolean;
  onEdit: (user: AppUser) => void;
  onResetPassword: (user: AppUser) => void;
  onToggleBlock: (user: AppUser) => void;
  onDownloadTerm: (user: AppUser) => void;
  onHistory: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
}

function getInitials(name?: string, email?: string) {
  const source = (name?.trim() || email?.split('@')[0] || 'US').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatLastActive(dateString?: string | null) {
  if (!dateString) return 'Nunca acessou';
  
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
    
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Hoje, ${time}`;
  if (isYesterday) return `Ontem, ${time}`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}, ${time}`;
}

export function UsersTable({
  rows,
  currentRole,
  canManageRow,
  onEdit,
  onResetPassword,
  onToggleBlock,
  onDownloadTerm,
  onHistory,
  onDelete,
}: UsersTableProps) {
  return (
    <div className="ops-card overflow-hidden rounded-[14px] border border-slate-200 bg-white">
      <div className="overflow-x-auto p-5">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-500">
              <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Usuário</th>
              {currentRole === 'DEV' && (
                <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Empresa</th>
              )}
              <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Perfil</th>
              <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Status</th>
              <th className="pb-3 pr-4 font-semibold uppercase tracking-wider">Último acesso</th>
              <th className="pb-3 font-semibold uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((user) => {
              const allowed = canManageRow(currentRole, user.role);
              const initials = getInitials(user.name, user.email);
              const isBlocked = user.isActive === false;
              const isPending = user.forcePasswordChange;

              let statusStyles = 'border-emerald-200 bg-emerald-50 text-emerald-700';
              let statusText = 'Ativo';

              if (isBlocked) {
                statusStyles = 'border-rose-200 bg-rose-50 text-rose-700';
                statusText = 'Bloqueado';
              } else if (isPending) {
                statusStyles = 'border-amber-200 bg-amber-50 text-amber-700';
                statusText = 'Troca pendente';
              }

              return (
                <tr
                  key={user.id}
                  className="group cursor-pointer border-b border-slate-50 text-xs transition-colors hover:bg-slate-50/50 last:border-0"
                  onClick={(e) => {
                    // Prevenir clique na linha se o clique for nos botões de ação
                    if ((e.target as HTMLElement).closest('button')) return;
                    onEdit(user);
                  }}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-600">
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {normalizeDisplayName(user.name)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {user.employee?.registration
                            ? `Matrícula ${user.employee.registration}`
                            : 'Sem funcionário vinculado'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {currentRole === 'DEV' && (
                    <td className="py-3 pr-4 font-medium text-slate-700">
                      {user.company?.name ?? '-'}
                    </td>
                  )}

                  <td className="py-3 pr-4">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </td>

                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase ${statusStyles}`}
                    >
                      {statusText}
                    </span>
                  </td>

                  <td className="py-3 pr-4 font-medium text-slate-600">
                    {formatLastActive(user.lastActiveAt)}
                  </td>

                  <td className="py-3">
                    <UserActionsMenu
                      user={user}
                      canManage={allowed}
                      onEdit={onEdit}
                      onResetPassword={onResetPassword}
                      onToggleBlock={onToggleBlock}
                      onDownloadTerm={onDownloadTerm}
                      onHistory={onHistory}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
