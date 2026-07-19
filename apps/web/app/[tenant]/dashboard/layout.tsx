'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardTopbar } from './_components/dashboard-topbar';
import { PasswordChangeGate } from './_components/password-change-gate';
import { PrivacyConsentGate } from './_components/privacy-consent-gate';
import { PendingNotificationsGate } from './_components/pending-notifications-gate';
import { ProposalGate } from './_components/proposal-gate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <PasswordChangeGate>
        <div className="app-shell">
          <DashboardSidebar />
          <main className="main">
            <DashboardTopbar />
            <PrivacyConsentGate>
            <PendingNotificationsGate>
            <ProposalGate>
              <div className="content-area">
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