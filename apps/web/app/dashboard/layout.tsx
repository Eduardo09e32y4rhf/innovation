'use client';

import type { ReactNode } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardTopbar } from './_components/dashboard-topbar';
import { PasswordChangeGate } from './_components/password-change-gate';
import { PrivacyConsentGate } from './_components/privacy-consent-gate';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="ops-dashboard flex min-h-screen w-full max-w-full flex-col overflow-x-hidden md:h-screen md:flex-row md:overflow-hidden">
        <DashboardSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden md:overflow-y-auto">
          <DashboardTopbar />
          <PasswordChangeGate>
          <PrivacyConsentGate>
            <div className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-7">
              {children}
            </div>
          </PrivacyConsentGate>
        </PasswordChangeGate>
        </main>
      </div>
    </ProtectedRoute>
  );
}