'use client';

import type { ReactNode } from 'react';
import { DashboardSidebar } from './_components/dashboard-sidebar';
import { DashboardTopbar } from './_components/dashboard-topbar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ops-dashboard flex h-screen overflow-hidden">
      <DashboardSidebar />
      <main className="flex flex-col flex-1 overflow-y-auto">
        <DashboardTopbar />
        <div className="px-9 py-7 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
