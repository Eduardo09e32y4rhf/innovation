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
  const go = (suffix: string) => { setOpen(false); router.push('/' + encodeURIComponent(tenant) + '/dashboard/' + suffix); };
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
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
    {open && <div role="menu" aria-label="Conta do usuário" className={'absolute right-0 z-[75] w-[min(88vw,320px)] rounded-xl border border-border bg-bg-elev p-2 shadow-v2-xl ' + (placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2')}>
      <div className="mb-1 border-b border-border px-3 py-3"><p className="break-words text-sm font-semibold text-fg">{user?.name || 'Usuário'}</p><p className="break-all text-xs text-fg-mut">{user?.email}</p><p className="mt-1 text-xs text-fg-mut">{ROLE_LABEL[role] || role}{company?.name ? ' · ' + company.name : ''}</p></div>
      <button role="menuitem" type="button" onClick={() => go('settings?section=security')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><UserRound size={18} aria-hidden="true" />Minha conta</button>
      <button role="menuitem" type="button" onClick={() => go('settings?section=security')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><KeyRound size={18} aria-hidden="true" />Alterar senha</button>
      <div className="my-2 border-y border-border py-2"><p className="px-3 pb-1 text-xs font-semibold text-fg-mut">Aparência</p>
        {([{ value: 'light', label: 'Claro', icon: Sun }, { value: 'dark', label: 'Escuro', icon: Moon }, { value: 'system', label: 'Sistema', icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <button key={value} role="menuitemradio" aria-checked={appearance === value} type="button" onClick={() => setAppearance(value)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><Icon size={18} aria-hidden="true" />{label}{appearance === value && <span className="ml-auto text-brand-600 dark:text-brand-300" aria-hidden="true">✓</span>}</button>)}
      </div>
      <button role="menuitem" type="button" onClick={() => go('support')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-fg hover:bg-bg-sub"><HelpCircle size={18} aria-hidden="true" />Ajuda e suporte</button>
      <button role="menuitem" type="button" onClick={() => { setOpen(false); logout(); router.replace('/login'); }} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-danger hover:bg-danger/10"><LogOut size={18} aria-hidden="true" />Sair</button>
    </div>}
  </div>;
}
