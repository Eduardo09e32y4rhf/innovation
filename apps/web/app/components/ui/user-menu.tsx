'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, KeyRound, HelpCircle, LogOut, Moon, Sun, Monitor, UserRound } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useAppearance } from '@/app/contexts/AppearanceContext';
import { ROLE_LABEL } from '@/app/lib/format';
import { resolveUserRole } from '@/app/lib/user-role';
import { UserAvatar } from './user-avatar';

export function UserMenu({ showName = false, placement = 'bottom' }: { showName?: boolean; placement?: 'top' | 'bottom' }) {
  const { user, company, logout } = useAuth();
  const { appearance, setAppearance } = useAppearance();
  const params = useParams();
  const router = useRouter();
  const tenant = String(params?.tenant || company?.slug || company?.id || user?.companyId || '');
  const role = resolveUserRole(user);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // Posição fixa calculada a partir do botão: não é cortada pela barra lateral nem sai da tela.
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const MENU_WIDTH = 300;
  const place = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(MENU_WIDTH, window.innerWidth - 16);
    const left = Math.max(8, Math.min(placement === 'top' ? rect.left : rect.right - width, window.innerWidth - width - 8));
    setPos(placement === 'top' ? { left, bottom: window.innerHeight - rect.top + 8 } : { left, top: rect.bottom + 8 });
  };
  const go = (suffix: string) => { setOpen(false); router.push('/' + encodeURIComponent(tenant) + '/dashboard/' + suffix); };
  useEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('resize', place);
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('resize', place); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return <div ref={root} className="relative min-w-0" onKeyDown={(event) => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const controls = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]') ?? []);
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? controls.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
    controls[next]?.focus();
  }}>
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open} aria-label={'Abrir menu de ' + (user?.name || 'usuário')}
      onClick={() => setOpen(!open)} className="flex min-h-11 w-full min-w-11 items-center gap-2 rounded-lg p-1.5 text-left hover:bg-bg-sub">
      <UserAvatar name={user?.name} email={user?.email} />
      {showName && <span className="workspace-user-copy min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-fg">{user?.name || 'Usuário'}</span><span className="block truncate text-xs text-fg-mut">{ROLE_LABEL[role] || role}</span></span>}
      {!showName && <ChevronDown size={16} className="hidden text-fg-mut sm:block" aria-hidden="true" />}
    </button>
    {open && pos && <div role="menu" aria-label="Conta do usuário" style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: Math.min(MENU_WIDTH, window.innerWidth - 16), maxHeight: 'calc(100vh - 16px)', overflowY: 'auto' }} className="z-[75] rounded-xl border border-border bg-bg-elev p-2 shadow-v2-xl">
      <div className="mb-1 border-b border-border px-3 py-3"><p className="break-words text-sm font-semibold text-fg">{user?.name || 'Usuário'}</p><p className="break-all text-xs text-fg-mut">{user?.email}</p><p className="mt-1 text-xs text-fg-mut">{ROLE_LABEL[role] || role}{company?.name ? ' · ' + company.name : ''}</p></div>
      <button role="menuitem" type="button" onClick={() => go('settings?section=security')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><UserRound size={18} aria-hidden="true" />Minha conta</button>
      <button role="menuitem" type="button" onClick={() => go('settings?section=security')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><KeyRound size={18} aria-hidden="true" />Alterar senha</button>
      <div className="my-2 border-y border-border py-2"><p className="px-3 pb-1 text-xs font-semibold text-fg-mut">Aparência</p>
        {([{ value: 'light', label: 'Claro', icon: Sun }, { value: 'dark', label: 'Escuro', icon: Moon }, { value: 'system', label: 'Sistema', icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <button key={value} role="menuitemradio" aria-checked={appearance === value} type="button" onClick={() => setAppearance(value)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><Icon size={18} aria-hidden="true" />{label}{appearance === value && <span className="ml-auto text-brand-600 dark:text-brand-300" aria-hidden="true">✓</span>}</button>)}
      </div>
      <button role="menuitem" type="button" onClick={() => go('support')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><HelpCircle size={18} aria-hidden="true" />Ajuda e suporte</button>
      <button role="menuitem" type="button" onClick={async () => { if (await logout()) { setOpen(false); router.replace('/login'); } }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-danger hover:bg-danger/10"><LogOut size={18} aria-hidden="true" />Sair</button>
    </div>}
  </div>;
}
