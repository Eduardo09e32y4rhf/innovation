'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardTopbar } from './_components/dashboard-topbar';
import { PasswordChangeGate } from './_components/password-change-gate';
import { PrivacyConsentGate } from './_components/privacy-consent-gate';
import { PendingNotificationsGate } from './_components/pending-notifications-gate';
import { BillingBlockScreen } from '../../components/billing-block-screen';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { company } = useAuth();

  // Bloqueio de Inadimplência
  if (company && (company as any).billingStatus === 'PAST_DUE_BLOCK') {
    return <BillingBlockScreen />;
  }

  return (
    <ProtectedRoute>
      <PasswordChangeGate>
        <div className="ops-dashboard flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden md:h-[100dvh] md:flex-row md:overflow-hidden">
          <DashboardSidebar />
          <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-y-auto">
            <DashboardTopbar />
            <PrivacyConsentGate>
            <PendingNotificationsGate>
              <div className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
                {children}
              </div>
            </PendingNotificationsGate>
            </PrivacyConsentGate>
          </main>
        </div>
      </PasswordChangeGate>
    </ProtectedRoute>
  );
}