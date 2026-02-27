'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
    Menu, Bell, ArrowLeft
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthService } from '../services/api';
import { Sidebar } from './Sidebar';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface UserProfile {
    id: number;
    name: string;
    email: string;
    role?: string;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
export function getInitials(name: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── TOP BAR ────────────────────────────────────────────────────────────────
function TopBar({ user, title, onToggleSidebar }: { user: UserProfile | null; title?: string; onToggleSidebar: () => void }) {
    const router = useRouter();
    const pathname = usePathname();
    const isHome = pathname === '/dashboard';

    return (
        <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
            {/* Mobile menu toggle */}
            <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 -ml-2 text-white/40 hover:text-white transition-colors"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Back button */}
            {!isHome && (
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-white/40 hover:text-white transition-all px-2 py-1.5 rounded-lg hover:bg-white/5 shrink-0"
                    title="Voltar"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-xs hidden sm:inline">Voltar</span>
                </button>
            )}

            {/* Page title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                <span className="text-xs text-white/30 font-medium truncate">
                    {title ?? 'Sistema operacional'}
                </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 shrink-0">
                <button className="relative text-white/30 hover:text-white transition">
                    <Bell className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#8b5cf6] rounded-full text-[8px] flex items-center justify-center font-bold">3</span>
                </button>

                {user && (
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/8 cursor-default">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white font-black text-[9px]">
                            {getInitials(user.name)}
                        </div>
                        <span className="text-xs font-medium text-white hidden sm:inline">{user.name.split(' ')[0]}</span>
                    </div>
                )}
            </div>
        </header>
    );
}

// ─── APP LAYOUT ─────────────────────────────────────────────────────────────
export default function AppLayout({
    children,
    title,
}: {
    children: React.ReactNode;
    title?: string;
}) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const router = useRouter();

    useEffect(() => {
        AuthService.me()
            .then(setUser)
            .catch(() => {
                // router.push('/signin'); // Commented out to avoid redirect loop during development if auth is not fully set up
            });
    }, [router]);

    // Close sidebar on window resize if greater than lg breakpoint
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="flex min-h-screen bg-[#000000] text-white">
            {/* Ambient glow */}
            <div className="fixed top-0 right-0 w-[500px] h-[400px] bg-[#8b5cf6]/5 rounded-full blur-[150px] pointer-events-none z-0" />

            <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className={`flex-1 flex flex-col min-h-screen relative z-10 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-[240px]' : 'lg:ml-[240px]'}`}>
                <TopBar user={user} title={title} onToggleSidebar={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
