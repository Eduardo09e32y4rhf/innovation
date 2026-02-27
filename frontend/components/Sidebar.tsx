'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, MessageSquare, DollarSign, Briefcase,
    FileText, LifeBuoy, Users, CreditCard, Globe, LogOut,
    HeartHandshake, Clock, BookOpen, Zap, Activity, ChevronRight, X, Flame
} from 'lucide-react';
import { getInitials } from './AppLayout';

interface UserProfile {
    id: number;
    name: string;
    email: string;
    role?: string;
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

export function Sidebar({ user, isOpen, onClose }: { user: UserProfile | null, isOpen: boolean, onClose: () => void }) {
    const pathname = usePathname();

    const mainMenu = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Meu Ponto', href: '/dashboard/ponto', icon: Clock },
        { name: 'RH e Chamados', href: '/dashboard/rh', icon: HeartHandshake },
        { name: 'B.I. Analytics', href: '/dashboard/analytics', icon: Activity },
    ];

    const advancedMenu = [
        { name: 'Chat IA', href: '/chat-ia', icon: MessageSquare },
        { name: 'Financeiro', href: '/finance', icon: DollarSign },
        { name: 'Vagas (ATS)', href: '/ats', icon: Briefcase },
        { name: 'Projetos', href: '/projects', icon: FileText },
    ];

    const supportMenu = [
        { name: 'Suporte', href: '/support', icon: LifeBuoy },
        { name: 'Onboarding', href: '/onboarding', icon: Users },
    ];


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
                        {mainMenu.map((item) => {
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

                    <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] mb-2 mt-4 px-2">Módulos</p>
                    <div className="space-y-0.5">
                        {advancedMenu.map((item) => {
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

                    <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] mb-2 mt-4 px-2">Suporte</p>
                    <div className="space-y-0.5">
                        {supportMenu.map((item) => {
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
