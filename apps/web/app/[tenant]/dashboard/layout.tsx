'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { PasswordChangeGate } from './_components/password-change-gate';
import { PrivacyConsentGate } from './_components/privacy-consent-gate';
import { PendingNotificationsGate } from './_components/pending-notifications-gate';
import { ProposalGate } from './_components/proposal-gate';
import { SidebarV2 } from './_components/shell-v2/sidebar';
import { TopbarV2 } from './_components/shell-v2/topbar';
import { MobileBottomNav } from './_components/shell-v2/mobile-bottom-nav';
import { WorkspaceProvider } from './_components/shell-v2/workspace-context';
import { WorkspaceRouteGate } from './_components/shell-v2/route-gate';
import type { SidebarMode } from './_components/shell-v2/sidebar';
import { resolveUserRole } from '@/app/lib/user-role';
import { readParsedAuthSession } from '@/app/lib/auth-session';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('auto');
  const [assisted, setAssisted] = useState(false);

  const isAdmin = resolveUserRole(user) === 'ADMIN';
  const isDev = resolveUserRole(user) === 'DEV';
  const billingBlocked =
    !isDev &&
    (user?.companyStatus === 'SUSPENDED' ||
      user?.companyStatus === 'CANCELLED' ||
      user?.billingStatus === 'PAST_DUE' ||
      user?.billingStatus === 'CANCELED' ||
      user?.billingStatus === 'PENDING_PAYMENT');

  useEffect(() => {
    if (!billingBlocked || !isAdmin || pathname.endsWith('/settings')) return;
    const tenant = pathname.split('/')[1];
    router.replace(`/${tenant}/dashboard/settings?billing=1`);
  }, [billingBlocked, isAdmin, pathname, router]);

  // Fecha o menu mobile ao navegar
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);
  useEffect(() => {
    setAssisted(readParsedAuthSession().isIsolatedTab);
    try {
      const stored = localStorage.getItem('workspace.sidebar');
      if (stored === 'compact' || stored === 'expanded') setSidebarMode(stored);
    } catch { /* Storage can be disabled. */ }
  }, []);

  const toggleMenu = () => {
    if (!window.matchMedia('(min-width: 1024px)').matches) { setMobileMenuOpen(true); return; }
    const expanded = sidebarMode === 'expanded' || (sidebarMode === 'auto' && window.matchMedia('(min-width: 1440px)').matches);
    const next = expanded ? 'compact' : 'expanded';
    setSidebarMode(next);
    try { localStorage.setItem('workspace.sidebar', next); } catch { /* Keep the current session preference. */ }
  };

  return (
    <ProtectedRoute>
      <PasswordChangeGate>
        <WorkspaceProvider>
        <a className="skip-link btn btn-primary" href="#workspace-content">Ir para o conteúdo</a>
        <div className="workspace-shell bg-bg">
          <Suspense fallback={<div className="hidden lg:block lg:w-[var(--sidebar-w,264px)]" />}>
            <SidebarV2 open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} mode={sidebarMode} />
          </Suspense>

          <div className="workspace-body flex flex-col">
            {assisted && <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 px-4 py-2 text-sm text-amber-950"><span>Acesso assistido: você está na empresa do cliente.</span><button type="button" className="btn btn-outline" onClick={() => { logout(); router.replace('/login'); }}>Encerrar acesso assistido</button></div>}
            {billingBlocked && (
              <div className="bg-danger text-white text-center py-2 px-4 text-sm font-bold">
                Sua fatura está vencida. Regularize o pagamento para evitar o bloqueio da plataforma.
              </div>
            )}

            <TopbarV2 onMenu={toggleMenu} />

            <PrivacyConsentGate>
              <PendingNotificationsGate>
                <ProposalGate>
                  <main id="workspace-content" className="workspace-content flex-1" tabIndex={-1}>
                    <WorkspaceRouteGate>{children}</WorkspaceRouteGate>
                  </main>
                </ProposalGate>
              </PendingNotificationsGate>
            </PrivacyConsentGate>
          </div>

          <MobileBottomNav onMenu={() => setMobileMenuOpen(true)} />
        </div>
        </WorkspaceProvider>
      </PasswordChangeGate>
    </ProtectedRoute>
  );
}
