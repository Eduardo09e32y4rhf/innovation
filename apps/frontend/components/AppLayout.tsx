'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  DollarSign,
  Briefcase,
  Users,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Bell,
  Settings,
  ArrowLeft,
  Flame,
  Trophy,
  Menu,
  X,
  HeartHandshake,
  Timer,
  BarChart3,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  Trash2
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { AuthService, DashboardService, NotificationService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role?: string;
  subscription_status?: string;
  trial_expires_at?: string;
}

interface GamificationData {
  points: number;
  level: number;
  xp_in_level: number;
  next_level_xp: number;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────
export function getInitials(name: string) {
  if (!name) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function XpBar({
  xp,
  maxXp,
  level
}: {
  xp: number;
  maxXp: number;
  level: number;
}) {
  const pct = Math.min((xp / maxXp) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-blue-500/40 font-medium">
          Nível {level} → {level + 1}
        </span>
        <span className="text-[9px] text-[#a78bfa] font-bold">
          {xp}/{maxXp} XP
        </span>
      </div>
      <div className="h-1 bg-blue-600/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#c4b5fd] transition-all duration-1000"
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
  { name: 'Recrutamento (ATS)', href: '/dashboard/recrutamento', icon: Briefcase },
  { name: 'Meu Ponto', href: '/dashboard/ponto', icon: Timer },
  { name: 'Painel de RH', href: '/dashboard/rh', icon: Users },
  { name: 'BI & Insights', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Suporte', href: '/support', icon: LifeBuoy }
];

const ADVANCED_MENU = [
  { name: 'Gestão de Chamados', href: '/dashboard/support-admin', icon: LifeBuoy },
  { name: 'Plano de Ação', href: '/dashboard/plano-acao', icon: Zap }
];

// ─── NOTIFICATION DROPDOWN ──────────────────────────────────────────────────
function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await NotificationService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error(error);
    }
  };

  const clearAll = async () => {
    try {
      await NotificationService.clearAll();
      setNotifications([]);
    } catch (error) {
      console.error(error);
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          color: 'text-green-400',
          bg: 'bg-green-400/10'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          color: 'text-yellow-400',
          bg: 'bg-yellow-400/10'
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-400',
          bg: 'bg-red-400/10'
        };
      default:
        return { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute right-0 mt-2 w-80 glass-panel border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-[100]"
    >
      <div className="px-4 py-3 border-b border-blue-200 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Notificações
        </span>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="p-1.5 text-slate-900/30 hover:text-red-400 transition-colors rounded-lg hover:bg-blue-500/5"
            aria-label="Limpar notificações"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-10 flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-slate-900/20 font-medium">
              Buscando alertas...
            </span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center opacity-20">
            <Bell className="w-10 h-10 mb-2" />
            <p className="text-xs font-medium">Tudo limpo por aqui</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((n) => {
              const { icon: Icon, color, bg } = getTypeStyles(n.type);
              return (
                <div
                  key={n.id}
                  className={`p-4 hover:bg-blue-500/5 transition-colors cursor-pointer group relative ${!n.read ? 'bg-[#8b5cf6]/5' : ''}`}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className="flex gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p
                          className={`text-xs font-bold truncate ${!n.read ? 'text-slate-900' : 'text-slate-900/60'}`}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 bg-[#8b5cf6] rounded-full shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-900/40 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-slate-900/20 mt-2 block italic">
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-blue-200 bg-blue-500/[0.02]">
          <button
            onClick={() =>
              NotificationService.markAllAsRead().then(fetchNotifications)
            }
            className="w-full text-center text-[10px] text-[#8b5cf6] font-bold hover:text-[#a78bfa] transition-colors py-1"
          >
            Marcar todas como lidas
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── SIDEBAR ────────────────────────────────────────────────────────────────
function Sidebar({
  user,
  gamification,
  isOpen,
  onClose
}: {
  user: UserProfile | null;
  gamification: GamificationData;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-slate-200 z-[70] flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl shadow-slate-200/50`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-blue-500/15 flex items-center justify-between shrink-0">
          <Link
            href="/"
            className="text-xl font-black tracking-tighter text-slate-900 drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]"
            onClick={onClose}
          >
            INNOV<span className="text-blue-600">A</span>TION IA
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-900 p-1 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User profile */}
        <div className="px-4 py-4 border-b border-slate-100 shrink-0 min-h-[105px] bg-slate-50/50">
          {!user ? (
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-blue-500/10 rounded w-20" />
                  <div className="h-1.5 bg-blue-500/5 rounded w-12" />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-1.5 bg-blue-500/10 rounded w-10" />
                  <div className="h-1.5 bg-blue-500/10 rounded w-8" />
                </div>
                <div className="h-1 bg-blue-500/10 rounded-full" />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-slate-900 font-black text-xs shadow-lg shadow-blue-200">
                    {getInitials(user.name)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                    {user.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Flame className="w-2.5 h-2.5 text-orange-500" />
                    <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">
                      Ativo
                    </span>
                  </div>
                </div>
                <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black shrink-0 border border-amber-200 shadow-sm">
                  Nv.{gamification.level}
                </span>
              </div>
              <div className="mt-3">
                <XpBar xp={gamification.xp_in_level} maxXp={gamification.next_level_xp} level={gamification.level} />
              </div>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3 px-3">
            Explorar
          </p>
          <div className="space-y-0.5">
            {MAIN_MENU.map((item) => {
              const active =
                pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${active ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-600'}`}
                  />
                  <span className={`text-sm font-bold tracking-wide ${active ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]'}`}>{item.name}</span>
                  {active && (
                    <ChevronRight className="w-3 h-3 ml-auto text-slate-900" />
                  )}
                </Link>
              );
            })}
          </div>

          {user?.role === 'admin' && (
            <>
              <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-3 px-3 mt-6">
                Avançado e Admin
              </p>
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
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 transition-colors drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)] ${active ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-600'}`}
                      />
                      <span className={`text-sm font-bold tracking-wide ${active ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]' : 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]'}`}>{item.name}</span>
                      {active && (
                        <ChevronRight className="w-3 h-3 ml-auto text-slate-900" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-100 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-500/60 hover:text-rose-600 hover:bg-rose-50 transition-all text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-bold tracking-wide">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── TOP BAR ────────────────────────────────────────────────────────────────
function TopBar({
  user,
  title,
  onToggleSidebar
}: {
  user: UserProfile | null;
  title?: string;
  onToggleSidebar: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/dashboard';
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await NotificationService.getNotifications(true);
        setUnreadCount(data.length);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4 shadow-sm">
      {/* Mobile menu toggle */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 -ml-2 text-slate-900/30 hover:text-slate-900 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Back button */}
      {!isHome && (
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all px-2 py-1.5 rounded-lg hover:bg-slate-100 shrink-0"
          title="Voltar"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs hidden sm:inline font-bold">Voltar</span>
        </button>
      )}

      {/* Page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
        <span className="text-sm text-slate-900 font-black truncate drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)] tracking-wide uppercase">
          {title ?? 'Sistema operacional'}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-xl transition-all ${showNotifications ? 'bg-blue-500/20 text-slate-900' : 'text-slate-900/30 hover:text-slate-900 hover:bg-blue-500/10'}`}
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-[#8b5cf6] rounded-full text-[8px] flex items-center justify-center font-bold text-slate-900 shadow-lg shadow-[#8b5cf6]/40">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <NotificationDropdown
                onClose={() => setShowNotifications(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {user && (
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 cursor-default shadow-inner">
            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-slate-900 font-black text-[9px] shadow-sm">
              {getInitials((user as any).full_name || user.name)}
            </div>
            <span className="text-sm font-black tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)] text-slate-900 hidden sm:inline">
              {((user as any).full_name || user.name || 'Usuário').split(' ')[0]}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── APP LAYOUT ─────────────────────────────────────────────────────────────
export default function AppLayout({
  children,
  title
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [gamification, setGamification] = useState<GamificationData>({
    points: 0, level: 1, xp_in_level: 0, next_level_xp: 1000
  });

  const router = useRouter();
  const pathname = usePathname();

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

    // Busca dados reais de gamificação (XP, nível)
    DashboardService.getMetrics()
      .then((m: any) => {
        if (m?.user) {
          setGamification({
            points: m.user.points ?? 0,
            level: m.user.level ?? 1,
            xp_in_level: m.user.xp_in_level ?? 0,
            next_level_xp: m.user.next_level_xp ?? 1000,
          });
        }
      })
      .catch(() => { });
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
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="fixed top-0 right-0 w-[600px] h-[500px] bg-indigo-100/40 rounded-full blur-[180px] pointer-events-none z-0" aria-hidden />
      <div className="fixed bottom-0 left-[240px] w-[400px] h-[300px] bg-blue-100/30 rounded-full blur-[150px] pointer-events-none z-0" aria-hidden />

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-50/60 backdrop-blur-sm z-[80]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-[260px] bg-white border-r border-slate-100 z-[90] flex flex-col transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-8">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-[0.8rem] flex items-center justify-center shadow-lg shadow-indigo-100">
            <Sparkles size={22} />
          </div>
          <span className="font-black text-2xl tracking-tighter text-slate-900">Innovation<span className="text-indigo-600">.ia</span></span>
        </div>

        {/* User Card */}
        <div className="px-6 mb-6">
          <div className="bg-slate-50 border border-slate-50 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm shrink-0">
                {user ? getInitials((user as any).full_name || user.name) : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{(user as any).full_name || user?.name || 'Carregando...'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">Nv. {gamification.level} • VIP</p>
              </div>
            </div>
            <XpBar xp={gamification.xp_in_level} maxXp={gamification.next_level_xp} level={gamification.level} />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4 px-2">Navegação Principal</p>
          {MAIN_MENU.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:scale-[1.02]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-500'}`}
                />
                <span className="text-sm font-black">{item.name}</span>
              </Link>
            );
          })}

          {user?.role === 'admin' && (
            <>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4 px-2 mt-8">Administração</p>
              {ADVANCED_MENU.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
                      ? 'bg-slate-50 text-slate-900 shadow-xl'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-slate-900' : 'text-slate-700'}`} />
                    <span className="text-sm font-black">{item.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-6 border-t border-slate-50 mt-auto">
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all hover:bg-rose-100"
          >
            <LogOut size={14} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col min-h-screen w-full lg:pl-[260px] relative z-10 transition-all duration-300">
        <TopBar
          user={user}
          title={title}
          onToggleSidebar={() => setIsSidebarOpen(true)}
        />

        {user &&
          user.subscription_status !== 'active' &&
          user.trial_expires_at &&
          new Date(user.trial_expires_at) > new Date() && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 flex items-center justify-between shrink-0 shadow-lg relative z-20">
              <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Info size={14} />
                <strong>Período de Demonstração:</strong> Seu acesso expira em{' '}
                {Math.ceil((new Date(user.trial_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias.
              </p>
              <Link
                href="/pricing"
                className="text-[10px] font-black uppercase tracking-widest bg-white text-orange-600 px-4 py-1.5 rounded-lg transition hover:scale-105 shadow-md"
              >
                Assinar Enterprise
              </Link>
            </div>
          )}

        <main className="flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
