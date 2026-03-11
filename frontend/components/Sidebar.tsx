'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, MessageSquare, DollarSign, Briefcase,
    FileText, LifeBuoy, Users, CreditCard, Globe, LogOut,
    HeartHandshake, Clock, BookOpen, Zap, Activity, BarChart3, Timer
} from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const mainMenu = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Chat IA', href: '/chat-ia', icon: MessageSquare },
        { name: 'Financeiro', href: '/finance', icon: DollarSign },
        { name: 'Vagas (ATS)', href: '/ats', icon: Briefcase },
        { name: 'Projetos', href: '/projects', icon: FileText },
        { name: 'Suporte', href: '/support', icon: LifeBuoy },
        { name: 'Onboarding', href: '/onboarding', icon: Users },
    ];

    const advancedMenu = [
        { name: 'Painel de RH', href: '/dashboard/rh', icon: HeartHandshake },
        { name: 'Meu Ponto', href: '/dashboard/ponto', icon: Timer },
        { name: 'B.I. Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Central de Serviços', href: '/csc', icon: BookOpen },
        { name: 'Financeiro Avançado', href: '/finance-advanced', icon: Clock },
        { name: 'Automação / Compras', href: '/projects-advanced', icon: Zap },
    ];

    const publicMenu = [
        { name: 'Planos & Preços', href: '/pricing', icon: CreditCard },
        { name: 'Portal de Vagas', href: '/jobs', icon: Globe },
        { name: 'Status da Plataforma', href: '/status', icon: Activity },
    ];


    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-white/80 backdrop-blur-xl border-r border-slate-200 z-50 flex flex-col shadow-sm">
            <div className="p-6">
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter">INNOV<span className="text-blue-600">A</span>TION IA</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Enterprise Platform</p>
            </div>

            <nav className="flex-1 px-4 overflow-y-auto pt-4 scrollbar-hide">
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mb-4 px-2">Principal</p>
                <div className="space-y-1 mb-8">
                    {mainMenu.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="font-bold">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mb-4 px-2">Avançado</p>
                <div className="space-y-1 mb-8">
                    {advancedMenu.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="font-bold">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.2em] mb-4 px-2">Público</p>
                <div className="space-y-1 mb-8">
                    {publicMenu.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
                            >
                                <Icon className="w-5 h-5 shrink-0" />
                                <span className="font-bold">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="p-4 border-t border-slate-100">
                <button
                    onClick={handleLogout}
                    className="w-full py-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" /> Sair do Sistema
                </button>
            </div>
        </aside>
    );
}
