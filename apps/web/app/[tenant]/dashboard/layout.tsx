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

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.profile?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN';
  const isDev = user?.profile?.toUpperCase() === 'DEV' || user?.role?.toUpperCase() === 'DEV';
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

  return (
    <ProtectedRoute>
      <PasswordChangeGate>
        <div className="min-h-dvh bg-bg flex">
          <Suspense fallback={<div className="hidden lg:block lg:w-[var(--sidebar-w,264px)]" />}>
            <SidebarV2 open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          </Suspense>

          <main className="min-w-0 flex-1 flex flex-col pb-20 lg:pb-0">
            {billingBlocked && (
              <div className="bg-danger text-white text-center py-2 px-4 text-sm font-bold">
                Sua fatura estÃ¡ vencida. Regularize o pagamento para evitar o bloqueio da plataforma.
              </div>
            )}

            <div className="px-3 sm:px-4 lg:pr-4">
              <TopbarV2 onMenu={() => setMobileMenuOpen(true)} />
            </div>

            <PrivacyConsentGate>
              <PendingNotificationsGate>
                <ProposalGate>
                  <div className="min-w-0 flex-1">{children}</div>
                </ProposalGate>
              </PendingNotificationsGate>
            </PrivacyConsentGate>
          </main>

          <MobileBottomNav onMenu={() => setMobileMenuOpen(true)} />
        </div>
      </PasswordChangeGate>
    </ProtectedRoute>
  );
}