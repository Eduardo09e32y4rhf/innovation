import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit3, KeyRound, Ban, CheckCircle2, FileText, History, Trash2 } from 'lucide-react';
import type { AppUser } from '@/app/lib/api';

interface UserActionsMenuProps {
  user: AppUser;
  canManage: boolean;
  onEdit: (user: AppUser) => void;
  onResetPassword: (user: AppUser) => void;
  onToggleBlock: (user: AppUser) => void;
  onDownloadTerm: (user: AppUser) => void;
  onHistory: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
}

export function UserActionsMenu({
  user,
  canManage,
  onEdit,
  onResetPassword,
  onToggleBlock,
  onDownloadTerm,
  onHistory,
  onDelete,
}: UserActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  if (!canManage) {
    return (
      <span className="text-[11px] font-medium text-slate-400">Acesso restrito</span>
    );
  }

  const isBlocked = user.isActive === false;

  return (
    <div className="relative flex items-center gap-2" ref={menuRef}>
      <button
        onClick={() => onEdit(user)}
        className="btn-v2-outline inline-flex h-8 items-center gap-2 px-3 text-[11px]"
      >
        <Edit3 size={12} />
        Editar
      </button>

      <button
        onClick={() => setOpen(!open)}
        aria-label={`Mais ações para ${user.name}`}
        className="btn-v2-outline flex h-8 w-8 items-center justify-center p-0"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 rounded-v2 border border-border bg-bg-elev py-1 shadow-v2-xl">
          <button
            onClick={() => {
              setOpen(false);
              onResetPassword(user);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"
          >
            <KeyRound size={14} /> Redefinir senha
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onToggleBlock(user);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"
          >
            {isBlocked ? (
              <>
                <CheckCircle2 size={14} /> Desbloquear acesso
              </>
            ) : (
              <>
                <Ban size={14} /> Bloquear acesso
              </>
            )}
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onDownloadTerm(user);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"
          >
            <FileText size={14} /> Baixar termo
          </button>

          <button
            onClick={() => {
              setOpen(false);
              onHistory(user);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-fg-mut transition-colors hover:bg-bg-sub hover:text-fg"
          >
            <History size={14} /> Ver histórico
          </button>

          <div className="my-1 border-t border-border" />

          <button
            onClick={() => {
              setOpen(false);
              onDelete(user);
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-bold text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 size={14} /> Excluir acesso
          </button>
        </div>
      )}
    </div>
  );
}
