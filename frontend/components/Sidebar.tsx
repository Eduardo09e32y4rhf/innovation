'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, MessageSquare, DollarSign, Briefcase,
    FileText, LifeBuoy, Users, CreditCard, Globe, LogOut,
    HeartHandshake, Clock, BookOpen, Zap, Activity, RadioTower, ChevronRight
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
        { name: 'RH Avançado', href: '/rh', icon: HeartHandshake },
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
        <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-gray-950/95 backdrop-blur-xl border-r border-purple-500/20 z-50 flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-black gradient-text">INNOVATION.IA</h1>
                <p className="text-xs text-gray-600 mt-0.5">Enterprise Platform</p>
            </div>

            <nav className="flex-1 px-4 overflow-y-auto">
                <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 px-2">Principal</p>
                <div className="space-y-1 mb-6">
                    {mainMenu.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 mt-4 px-2">Avançado</p>
                <div className="space-y-1 mb-6">
                    {advancedMenu.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 px-2">Público</p>
                <div className="space-y-1">
                    {publicMenu.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="p-4 border-t border-purple-500/10">
                <div className="mb-4 px-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Sede</p>
                    <div className="flex items-center gap-2 mt-1 text-zinc-400">
                        <RadioTower className="w-3 h-3" />
                        <span className="text-xs">Osasco (Virtual)</span>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" /> Sair
                </button>
            </div>
        </aside>
    );
}
