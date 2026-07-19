'use client';

import type { ReactNode } from 'react';
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
  
  return (
    <ProtectedRoute>
      <PasswordChangeGate>
        <div className="app-shell">
          <DashboardSidebar />
          <main className="min-w-0 flex-1 flex flex-col">
            {user?.billingStatus === 'PAST_DUE' && (
              <div className="bg-rose-500 text-white text-center py-2 px-4 text-sm font-bold shadow-sm z-50 relative">
                Sua fatura está vencida. Regularize o pagamento para evitar o bloqueio da plataforma.
              </div>
            )}
            <DashboardTopbar />
            <PrivacyConsentGate>
            <PendingNotificationsGate>
            <ProposalGate>
              <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
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