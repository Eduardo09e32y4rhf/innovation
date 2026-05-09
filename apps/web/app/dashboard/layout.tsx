'use client';

import type { ReactNode } from 'react';
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardTopbar } from './_components/dashboard-topbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ops-dashboard flex min-h-screen flex-col overflow-x-hidden md:h-screen md:flex-row md:overflow-hidden">
      <DashboardSidebar />
      <main className="flex min-w-0 flex-1 flex-col md:overflow-y-auto">
        <DashboardTopbar />
        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-9 lg:py-7">
          {children}
        </div>
      </main>
    </div>
  );
}
