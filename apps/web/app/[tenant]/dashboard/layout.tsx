'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardTopbar } from './_components/dashboard-topbar';
import { PasswordChangeGate } from './_components/password-change-gate';
import { PrivacyConsentGate } from './_components/privacy-consent-gate';
import { PendingNotificationsGate } from './_components/pending-notifications-gate';
import { ProposalGate } from './_components/proposal-gate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = user?.profile?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN';
  const isDev = user?.profile?.toUpperCase() === 'DEV' || user?.role?.toUpperCase() === 'DEV';
  const billingBlocked = !isDev && (user?.companyStatus === 'SUSPENDED' || user?.companyStatus === 'CANCELLED' || user?.billingStatus === 'PAST_DUE' || user?.billingStatus === 'CANCELED' || user?.billingStatus === 'PENDING_PAYMENT');

  useEffect(() => {
    if (!billingBlocked || !isAdmin || pathname.endsWith('/settings')) return;
    const tenant = pathname.split('/')[1];
    router.replace(`/${tenant}/dashboard/settings?billing=1`);
  }, [billingBlocked, isAdmin, pathname, router]);
  
  return (
    <ProtectedRoute>
      <PasswordChangeGate>
        <div className="app-shell">
          <DashboardSidebar open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          {mobileMenuOpen && (
            <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          )}
          <main className="min-w-0 flex-1 flex flex-col">
            {billingBlocked && (
              <div className="bg-rose-500 text-white text-center py-2 px-4 text-sm font-bold shadow-sm z-50 relative">
                Sua fatura está vencida. Regularize o pagamento para evitar o bloqueio da plataforma.
              </div>
            )}
            <DashboardTopbar onMenu={() => setMobileMenuOpen(true)} />
            <PrivacyConsentGate>
            <PendingNotificationsGate>
            <ProposalGate>
              <div className="mx-auto w-full p-4 sm:p-6 lg:p-8">
                {children}
              </div>
            </ProposalGate>
            </PendingNotificationsGate>
            </PrivacyConsentGate>
          </main>
        </div>
      </PasswordChangeGate>
    </ProtectedRoute>
  );
}
