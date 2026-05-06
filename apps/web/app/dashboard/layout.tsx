'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  CreditCard, 
  Settings, 
  LogOut, 
  Bell,
  Search,
  Cpu,
  Smartphone,
  Contact
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const pathname = usePathname();

  const isRouteActive = (route: string) => {
    if (route === '/dashboard' && pathname === '/dashboard') return true;
    if (route !== '/dashboard' && pathname?.startsWith(route)) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-[#05050a] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col glass z-50">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 grad-bg rounded-lg flex items-center justify-center font-bold text-white shadow-lg">I</div>
          <span className="text-xl font-bold tracking-tighter">INNOVATION<span className="text-purple-500">.IA</span></span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" href="/dashboard" active={isRouteActive('/dashboard')} />
          <NavItem icon={<MessageSquare size={20} />} label="CRM Operacional" href="/dashboard/chat" active={isRouteActive('/dashboard/chat')} />
          <NavItem icon={<Smartphone size={20} />} label="WhatsApp" href="/dashboard/whatsapp/accounts" active={isRouteActive('/dashboard/whatsapp')} />
          <NavItem icon={<Contact size={20} />} label="Contatos" href="/dashboard/whatsapp/contacts" active={isRouteActive('/dashboard/whatsapp/contacts')} />
          <NavItem icon={<Users size={20} />} label="Recursos Humanos" href="/dashboard/rh/pipeline" active={isRouteActive('/dashboard/rh')} />
          <NavItem icon={<CreditCard size={20} />} label="Financeiro" href="/dashboard/finance/pricing" active={isRouteActive('/dashboard/finance')} />
          <NavItem icon={<Cpu size={20} />} label="AI Engines" href="/dashboard/ai" active={isRouteActive('/dashboard/ai')} />
        </nav>

        <div className="p-4 border-t border-white/5">
          <NavItem icon={<Settings size={20} />} label="Configurações" href="/dashboard/settings" active={isRouteActive('/dashboard/settings')} />
          <NavItem icon={<LogOut size={20} />} label="Sair" href="/" className="text-red-400" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-1.5 w-96">
            <Search size={18} className="text-gray-500" />
            <input type="text" placeholder="Buscar em toda a plataforma..." className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-full text-gray-300 outline-none" />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="text-right">
                <p className="text-sm font-bold">Eduardo Admin</p>
                <p className="text-xs text-gray-500">Innovation Elite</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 border-2 border-white/10"></div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, href = "#", active = false, className = "" }) => (
  <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
    active ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
  } ${className}`}>
    <span className={`${active ? 'text-white' : 'text-gray-500 group-hover:text-purple-400'} transition-colors`}>
      {icon}
    </span>
    {label}
  </Link>
);

export default DashboardLayout;
