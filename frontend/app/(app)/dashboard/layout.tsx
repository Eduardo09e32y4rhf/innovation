'use client';

import { Sidebar } from '@/components/Sidebar';
import { useState, useEffect } from 'react';
import { AuthService } from '@/services/api';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        AuthService.me().then(setUser).catch(() => {});
    }, []);

    return (
        <div className="flex min-h-screen bg-[#000000] text-white">
            <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex-1 lg:ml-[240px]">
                {children}
            </div>
        </div>
    );
}
