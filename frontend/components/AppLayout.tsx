'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard, MessageSquare, DollarSign, Briefcase,
    Users, LifeBuoy, LogOut, ChevronRight,
    Bell, Settings, ArrowLeft, Flame, Trophy, Menu, X,
    HeartHandshake, Timer, BarChart3
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthService } from '../services/api';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface UserProfile {
    id: number;
    name: string;
    email: string;
    role?: string;
    subscription_status?: string;
    trial_expires_at?: string;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
export function getInitials(name: string) {
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function XpBar({ xp, maxXp, level }: { xp: number; maxXp: number; level: number }) {
    const pct = Math.min((xp / maxXp) * 100, 100);
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-white/30 font-medium">Nível {level} → {level + 1}</span>
                <span className="text-[9px] text-[#8b5cf6] font-bold">{xp}/{maxXp} XP</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── MENU CONFIG ──────────────────────────────────
const MAIN_MENU = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat IA', href: '/chat-ia', icon: MessageSquare },
    { name: 'Financeiro', href: '/finance', icon: DollarSign },
    { name: 'Vagas (ATS)', href: '/ats', icon: Briefcase },
    { name: 'Suporte', href: '/support', icon: LifeBuoy },
    { name: 'Onboarding', href: '/onboarding', icon: Users },
];

const ADVANCED_MENU = [
    { name: 'Painel de RH', href: '/dashboard/rh', icon: HeartHandshake },
    { name: 'Meu Ponto', href: '/dashboard/ponto', icon: Timer },
    { name: 'B.I. Analytics', href: '/dashboard/analytics', icon: BarChart3 },
];

// ─── SIDEBAR ────────────────────────────────────────────────────────────────
function Sidebar({ user, isOpen, onClose }: { user: UserProfile | null, isOpen: boolean, onClose: () => void }) {
    const pathname = usePathname();

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    };

    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            <aside className={`fixed left-0 top-0 bottom-0 w-[240px] bg-black/80 backdrop-blur-2xl border-r border-white/5 z-[70] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
                    <Link href="/" className="text-lg font-black tracking-tighter" onClick={onClose}>
                        INNOV<span className="text-[#8b5cf6]">A</span>TION IA
                    </Link>
                    <button onClick={onClose} className="lg:hidden text-white/40 hover:text-white p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* User profile */}
                {user && (
                    <div className="px-4 py-4 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] flex items-center justify-center text-white font-black text-xs shadow-lg shadow-[#8b5cf6]/30">
                                    {getInitials(user.name)}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                                    <span className="text-[9px] text-orange-400 font-medium">Ativo</span>
                                </div>
                            </div>
                            <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded font-black shrink-0">Nv.7</span>
                        </div>
                        <div className="mt-3">
                            <XpBar xp={2340} maxXp={3000} level={7} />
                        </div>
                    </div>
                )}

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto">
                    <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] mb-2 px-2">Principal</p>
                    <div className="space-y-0.5">
                        {MAIN_MENU.map((item) => {
                            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                        ? 'bg-[#8b5cf6]/15 text-white border border-[#8b5cf6]/20'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#8b5cf6]' : 'group-hover:text-white/80'}`} />
                                    <span className="text-sm font-medium">{item.name}</span>
                                    {active && <ChevronRight className="w-3 h-3 ml-auto text-[#8b5cf6]" />}
                                </Link>
                            );
                        })}
                    </div>

                    <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] mb-2 px-2 mt-4">Avançado</p>
                    <div className="space-y-0.5">
                        {ADVANCED_MENU.map((item) => {
                            const active = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                                        ? 'bg-[#8b5cf6]/15 text-white border border-[#8b5cf6]/20'
                                        : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-[#8b5cf6]' : 'group-hover:text-white/80'}`} />
                                    <span className="text-sm font-medium">{item.name}</span>
                                    {active && <ChevronRight className="w-3 h-3 ml-auto text-[#8b5cf6]" />}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div className="px-3 py-3 border-t border-white/5 shrink-0">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="font-medium">Sair</span>
                    </button>
                </div>
            </aside>
        </>
    );
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
            .then((u: UserProfile) => {
                if (u.subscription_status !== 'active' && u.trial_expires_at) {
                    const expiresAt = new Date(u.trial_expires_at);
                    if (new Date() > expiresAt) {
                        router.push('/pricing?expired=true');
                        return;
                    }
                }
                setUser(u);
            })
            .catch(() => {
                router.push('/login');
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

                {user && user.subscription_status !== 'active' && user.trial_expires_at && new Date(user.trial_expires_at) > new Date() && (
                    <div className="bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-b border-orange-500/30 px-4 py-2 flex items-center justify-between shrink-0">
                        <p className="text-[11px] text-orange-200">
                            <strong>Teste Grátis:</strong> Seu acesso expira em {Math.ceil((new Date(user.trial_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias. Após isso, os recursos estarão bloqueados.
                        </p>
                        <Link href="/pricing" className="text-[10px] font-bold uppercase tracking-wider bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded transition">
                            Assinar Premium
                        </Link>
                    </div>
                )}

                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
