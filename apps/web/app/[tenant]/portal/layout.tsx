'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/app/components/ProtectedRoute';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/app/contexts/AuthContext';

export default function PortalLayout({ children, params }: { children: React.ReactNode; params: { tenant: string } }) {
  const { user, company, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const base = '/' + encodeURIComponent(params.tenant) + '/portal';
  const items = [['', 'Início'], ['/ponto', 'Meu ponto'], ['/ferias', 'Férias'], ['/holerites', 'Holerites'], ['/documentos', 'Documentos']];
  return <ProtectedRoute><div className="min-h-screen bg-bg text-fg">
    <a href="#portal-content" className="sr-only focus:not-sr-only focus:block focus:p-4">Ir para o conteúdo</a>
    <header className="border-b border-border bg-bg-elev"><div className="mx-auto max-w-5xl space-y-3 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0"><Link href={base} className="text-lg font-semibold text-brand">Innovation RH</Link><p className="break-words text-sm text-fg-mut">{company?.name || 'Portal do funcionário'}</p></div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand" aria-hidden>{user?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'}</span>
          <span className="max-w-[180px] break-words text-sm">{user?.name}</span>
          <Button type="button" variant="outline" onClick={async () => { if (await logout()) router.replace('/login'); }}>Sair</Button>
        </div>
      </div>
      <nav aria-label="Portal do funcionário" className="flex flex-wrap gap-1">{items.map(([suffix, label]) => <Link key={suffix} href={base + suffix} aria-current={pathname === base + suffix ? 'page' : undefined}
        className={'btn ' + (pathname === base + suffix ? 'btn-primary' : 'btn-ghost')}>{label}</Link>)}</nav>
    </div></header>
    <main id="portal-content" className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
  </div></ProtectedRoute>;
}
