'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, DollarSign, Briefcase, FileText, LifeBuoy } from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Chat IA', href: '/chat-ia', icon: MessageSquare },
        { name: 'Financeiro', href: '/finance', icon: DollarSign },
        { name: 'Vagas (ATS)', href: '/ats', icon: Briefcase },
        { name: 'Projetos', href: '/projects', icon: FileText },
        { name: 'Suporte', href: '/support', icon: LifeBuoy },
    ];

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-gray-950/95 backdrop-blur-xl border-r border-purple-500/20 z-50 flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-black gradient-text">INNOVATION.IA</h1>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                {menuItems.map((item) => {
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
            </nav>

            <div className="mt-auto border-t border-purple-500/10">
                <div className="px-6 py-4 text-xs text-gray-500">
                    <div className="flex justify-between mb-2 space-x-2">
                        <Link href="/terms" className="hover:text-purple-400 transition-colors">Termos de Uso</Link>
                        <Link href="/rules" className="hover:text-purple-400 transition-colors">Regras</Link>
                    </div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Sede: Osasco (Virtual)</p>
                </div>

                <div className="p-6 pt-0">
                    <button className="w-full py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition text-sm font-medium flex items-center justify-center gap-2">
                        Sair
                    </button>
                </div>
            </div>
        </aside>
    );
}
