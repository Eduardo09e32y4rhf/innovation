import { Users, Ban, KeyRound, Building2 } from 'lucide-react';
import type { AppUser, UsersUsage } from '@/app/lib/api';

interface UserSummaryCardsProps {
  rows: AppUser[];
  usage: UsersUsage | null;
}

export function UserSummaryCards({ rows, usage }: UserSummaryCardsProps) {
  const activeUsers = rows.filter((user) => user.isActive !== false).length;
  const blockedUsers = rows.filter(
    (user) => user.isActive === false || (user.failedLoginAttempts ?? 0) >= 3
  ).length;
  const pendingPasswordChange = rows.filter((user) => user.forcePasswordChange).length;

  const usedLicenses = usage?.used ?? rows.length;
  const maxLicenses = usage?.max ?? 0;
  const isFull = maxLicenses > 0 && usedLicenses >= maxLicenses;

  const cards = [
    {
      title: 'Usuários ativos',
      value: activeUsers,
      icon: Users,
      iconColor: 'text-teal-700',
    },
    {
      title: 'Bloqueados',
      value: blockedUsers,
      icon: Ban,
      iconColor: blockedUsers > 0 ? 'text-rose-600' : 'text-slate-600',
    },
    {
      title: 'Troca pendente',
      value: pendingPasswordChange,
      icon: KeyRound,
      iconColor: pendingPasswordChange > 0 ? 'text-amber-600' : 'text-slate-600',
    },
    {
      title: 'Licenças',
      value: maxLicenses > 0 ? `${usedLicenses} / ${maxLicenses}` : usedLicenses,
      icon: Building2,
      iconColor: isFull ? 'text-amber-600' : 'text-slate-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="ops-card flex flex-col justify-center rounded-[14px] border border-slate-200 bg-white p-5"
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 ${card.iconColor}`}
            >
              <card.icon size={20} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {card.title}
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
