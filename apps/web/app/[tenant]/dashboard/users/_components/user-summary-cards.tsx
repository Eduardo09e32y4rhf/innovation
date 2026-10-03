import type { AppUser, UsersUsage } from '@/app/lib/api';

interface UserSummaryCardsProps { rows: AppUser[]; usage: UsersUsage | null; }
export function UserSummaryCards({ rows, usage }: UserSummaryCardsProps) {
  const cards = [
    ['Usuários ativos', rows.filter(user => user.isActive !== false).length],
    ['Bloqueados', rows.filter(user => user.isActive === false).length],
    ['Troca pendente', rows.filter(user => user.forcePasswordChange).length],
    ['Licenças da empresa atual', usage ? `${usage.used} / ${usage.max}` : 'Indisponível'],
    ['Já acessaram', rows.filter(user => !!user.lastActiveAt).length],
  ];
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {cards.map(([label, value]) => <div key={label} className="card-v2 min-w-0 p-4">
      <dt className="text-sm text-fg-mut">{label}</dt><dd className="mt-2 break-words text-2xl font-semibold text-fg">{value}</dd>
    </div>)}
  </dl>;
}
