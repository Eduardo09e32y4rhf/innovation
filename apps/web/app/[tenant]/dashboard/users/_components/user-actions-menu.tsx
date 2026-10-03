import { useState } from 'react';
import { MoreHorizontal, Edit3, KeyRound, Ban, CheckCircle2, FileText, History, Trash2 } from 'lucide-react';
import { Button, Modal } from '@/app/components/ui';
import type { AppUser } from '@/app/lib/api';
import { useAccessOverlay } from './use-access-overlay';

interface UserActionsMenuProps {
  user: AppUser; canManage: boolean; canRead?: boolean; canReset?: boolean; canBlock?: boolean; canDelete?: boolean; canDownload?: boolean;
  onEdit: (user: AppUser) => void; onResetPassword: (user: AppUser) => void;
  onToggleBlock: (user: AppUser) => void; onDownloadTerm: (user: AppUser) => void;
  onHistory: (user: AppUser) => void; onDelete: (user: AppUser) => void;
}
export function UserActionsMenu({ user, canManage, canRead = true, canReset = canManage, canBlock = canManage, canDelete = canManage,
  canDownload = canRead, onEdit, onResetPassword, onToggleBlock, onDownloadTerm, onHistory, onDelete }: UserActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useAccessOverlay(open, () => setOpen(false), `Ações de ${user.name}`);
  if (!canRead) return <span className="text-sm text-fg-mut">Acesso restrito</span>;
  const run = (action: (user: AppUser) => void) => { setOpen(false); action(user); };
  return <div className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" onClick={() => onEdit(user)} aria-label={`${canManage ? 'Editar' : 'Ver detalhes de'} ${user.name}`}>
      <Edit3 size={18} aria-hidden="true" />{canManage ? 'Editar' : 'Detalhes'}
    </Button>
    <Button type="button" variant="outline" aria-label={`Mais ações para ${user.name}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <MoreHorizontal size={18} aria-hidden="true" />
    </Button>
    <div ref={ref}><Modal isOpen={open} onClose={() => setOpen(false)} title="Ações do usuário" description={`${user.name} · ${user.email}`}>
      <div className="flex flex-col gap-3">
        {canReset && <Button type="button" variant="outline" onClick={() => run(onResetPassword)}><KeyRound size={18} aria-hidden="true" />Redefinir senha</Button>}
        {canBlock && <Button type="button" variant="outline" onClick={() => run(onToggleBlock)}>
          {user.isActive === false ? <CheckCircle2 size={18} aria-hidden="true" /> : <Ban size={18} aria-hidden="true" />}
          {user.isActive === false ? 'Desbloquear acesso' : 'Bloquear acesso'}
        </Button>}
        {canDownload && <Button type="button" variant="outline" onClick={() => run(onDownloadTerm)}><FileText size={18} aria-hidden="true" />Baixar termo</Button>}
        <Button type="button" variant="outline" onClick={() => run(onHistory)}><History size={18} aria-hidden="true" />Ver histórico de acesso</Button>
        {canDelete && <Button type="button" variant="danger" onClick={() => run(onDelete)}><Trash2 size={18} aria-hidden="true" />Excluir acesso</Button>}
      </div>
    </Modal></div>
  </div>;
}
