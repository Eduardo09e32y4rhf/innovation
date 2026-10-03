'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useWorkspace } from './workspace-context';
import { isNavActive, tenantRoute } from './nav-config';

export function MobileBottomNav({ onMenu }: { onMenu?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const { items } = useWorkspace();
  const preferred = ['dashboard', 'employees', 'escalas', 'vacations'];
  const destinations = [
    ...preferred.flatMap((id) => items.filter((item) => item.id === id)),
    ...items.filter((item) => !preferred.includes(item.id)),
  ].slice(0, 4);
  return <nav aria-label="Navegação principal no celular" className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-elev lg:hidden">
    <ul className="flex min-h-[68px] items-stretch px-1">
      {destinations.map((item) => <li key={item.id} className="min-w-0 flex-1"><Link href={tenantRoute(tenant, item.href)} aria-current={isNavActive(pathname, tenant, item) ? 'page' : undefined} className={'flex h-full min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 ' + (isNavActive(pathname, tenant, item) ? 'text-brand-700 dark:text-brand-300' : 'text-fg-mut')}>
        <item.icon size={20} aria-hidden="true" /><span className="text-center text-[11px] font-semibold leading-tight">{item.label}</span>
      </Link></li>)}
      <li className="min-w-0 flex-1"><button type="button" aria-label="Abrir todos os destinos" onClick={onMenu} className="flex h-full min-h-14 w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-fg-mut"><Menu size={20} aria-hidden="true" /><span className="text-[11px] font-semibold">Mais</span></button></li>
    </ul>
  </nav>;
}
