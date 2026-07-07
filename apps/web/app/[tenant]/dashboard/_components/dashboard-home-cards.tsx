import Link from 'next/link';
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

type Status = 'active' | 'pending' | 'error' | 'info';
type Accent = 'blue' | 'purple' | 'amber' | 'yellow';

const accentMap: Record<Accent, string> = {
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 shadow-blue-500/10',
  purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 shadow-purple-500/10',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 shadow-amber-500/10',
  yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 shadow-yellow-500/10',
};

const statusIconMap: Record<Status, ReactNode> = {
  active: <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />,
  pending: <Loader2 size={14} className="text-amber-400 shrink-0 animate-spin" />,
  error: <AlertCircle size={14} className="text-red-400 shrink-0" />,
  info: <TrendingUp size={14} className="text-blue-400 shrink-0" />,
};

export function StatCard({
  title,
  value,
  change,
  icon,
  accent = 'purple',
  status = 'active',
}: {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  accent?: Accent;
  status?: Status;
}) {
  return (
    <div className={`card-innovation card-stat p-5 bg-gradient-to-br ${accentMap[accent]} shadow-lg`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-white/5 rounded-xl">{icon}</div>
        <span className={`badge badge-${status} text-[10px]`}>{change}</span>
      </div>
      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{title}</p>
      <h4 className="text-2xl font-black">{value}</h4>
      <div className="progress-bar mt-3">
        <div className="progress-fill" style={{ width: '65%' }} />
      </div>
    </div>
  );
}

export function ActivityItem({
  label,
  description,
  time,
  status = 'active',
}: {
  label: string;
  description: string;
  time: string;
  status?: Status;
}) {
  return (
    <div className="flex gap-3 items-start py-3.5 border-b border-white/4 last:border-0 table-row-hover rounded-xl px-2">
      <div className="mt-0.5">{statusIconMap[status]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{description}</p>
      </div>
      <span className="text-[10px] text-gray-600 font-mono shrink-0">{time}</span>
    </div>
  );
}

export function QuickAccessCard({
  title,
  description,
  gradient,
  href,
  icon: Icon,
  badge,
  badgeType,
}: {
  title: string;
  description: string;
  gradient: string;
  href: string;
  icon: LucideIcon;
  badge: string;
  badgeType: Status;
}) {
  return (
    <Link href={href} className="card-innovation block p-4 group">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight">{title}</p>
          <p className="text-xs text-gray-500 leading-tight mt-0.5">{description}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`badge badge-${badgeType} text-[9px]`}>{badge}</span>
          <ArrowUpRight size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
