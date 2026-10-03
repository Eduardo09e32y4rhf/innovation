'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { X, RefreshCw } from 'lucide-react';
import { UserMenu } from '@/app/components/ui/user-menu';
import { useOverlay } from '@/app/components/ui/use-overlay';
import { useWorkspace } from './workspace-context';
import { isNavActive, tenantRoute, type NavGroup } from './nav-config';

export type SidebarMode = 'auto' | 'compact' | 'expanded';
export function SidebarV2({ open, onClose, mode = 'auto' }: { open: boolean; onClose: () => void; mode?: SidebarMode }) {
  const pathname = usePathname();
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const { company, items, error, retry } = useWorkspace();
  const [mobile, setMobile] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => { setLogoFailed(false); }, [company?.logoUrl]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const ref = useOverlay<HTMLElement>(open && mobile, onClose);
  const groups: NavGroup[] = ['Trabalho', 'Administração', 'Operação global'];
  return <>
    {open && <button type="button" tabIndex={-1} aria-label="Fechar menu" onClick={onClose} className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" />}
    <aside ref={ref} tabIndex={-1} aria-label="Menu principal" aria-hidden={mobile && !open ? true : undefined}
      role={mobile && open ? 'dialog' : undefined} aria-modal={mobile && open ? true : undefined}
      className={'workspace-sidebar flex flex-col workspace-sidebar-' + mode + (open ? ' workspace-sidebar-open' : '')}>
      <div className="flex min-h-20 items-center gap-1 px-4">
        <Link href={tenantRoute(tenant, '/dashboard')} onClick={onClose} className="workspace-brand flex min-h-11 min-w-0 flex-1 items-center gap-3" aria-label="Innovation RH — Dashboard">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand text-sm font-semibold text-white">
            {company?.logoUrl && !logoFailed ? <img src={company.logoUrl} width={40} height={40} alt="" className="h-full w-full bg-white object-contain" onError={() => setLogoFailed(true)} /> : 'IR'}
          </span>
          <span className="workspace-brand-copy min-w-0"><span className="block text-sm font-semibold text-fg">Innovation RH</span><span className="block truncate text-xs text-fg-mut" title={company?.name}>{company?.name || 'Área de trabalho'}</span></span>
        </Link>
        <button type="button" aria-label="Fechar menu principal" className="btn-icon shrink-0 lg:hidden" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Navegação principal">
        {groups.map((group) => {
          const destinations = items.filter((item) => item.group === group);
          if (!destinations.length) return null;
          return <div key={group}><p className="workspace-nav-group">{group}</p><ul className="space-y-1">
            {destinations.map((item) => <li key={item.id}><Link href={tenantRoute(tenant, item.href)} onClick={onClose} className="workspace-sidebar-link" title={item.label} aria-label={item.label} aria-current={isNavActive(pathname, tenant, item) ? 'page' : undefined}>
              <item.icon size={20} className="shrink-0" aria-hidden="true" /><span className="workspace-nav-label">{item.label}</span>
            </Link></li>)}
          </ul></div>;
        })}
      </nav>
      {error && <div className="px-3 pb-2"><button type="button" className="btn-v2-ghost w-full" onClick={retry} title="Recarregar dados da empresa"><RefreshCw size={18} aria-hidden="true" /><span className="workspace-nav-label">Recarregar empresa</span></button></div>}
      <div className="border-t border-border p-3"><UserMenu showName placement="top" /></div>
    </aside>
  </>;
}
