'use client';

import { usePathname, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Award, Bell, CalendarDays, FileClock, HardHat, HeartPulse, LayoutDashboard, UserRoundPlus } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { cn } from '@/app/lib/cn';
import { usesRecruiterAgenda } from '@/app/lib/recruiter-account';
import { useWorkspace } from '../_components/shell-v2/workspace-context';
import { isAgendaPath } from '../_components/shell-v2/rs-route-access';
import styles from '../escalas/_components/operational-ui.module.css';

interface NavItem { name: string; href: string; icon: LucideIcon; exact?: boolean }
interface NavGroup { title: string; icon?: LucideIcon; items: NavItem[] }

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const tenant = String(params?.tenant ?? '');
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user } = useAuth();
  const profile = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const canManage = ['DEV', 'ADMIN', 'RH'].includes(profile);
  const base = `/${tenant}/dashboard/management`;
  const { company } = useWorkspace();
  // R&S (perfil RH_RS ou conta autonoma so de Recrutamento): Gestao e so a Agenda.
  const agendaOnly = usesRecruiterAgenda(profile, company?.activeModules);
  const outsideAgenda = agendaOnly && !isAgendaPath(pathname, base);
  useEffect(() => { if (outsideAgenda) router.replace(`${base}/agenda`); }, [outsideAgenda, base, router]);

  const groups: NavGroup[] = agendaOnly ? [
    { title: 'Agenda', items: [{ name: 'Agenda e reuniões', href: `${base}/agenda`, icon: CalendarDays }] },
  ] : [
    { title: 'Visão geral', items: [{ name: 'Central de Gestão', href: base, icon: LayoutDashboard, exact: true }] },
    { title: 'Agenda', items: [{ name: 'Agenda de compromissos', href: `${base}/agenda`, icon: CalendarDays }] },
    {
      title: 'Segurança do trabalho',
      icon: HardHat,
      items: [{ name: 'ASO e exames (PCMSO)', href: `${base}/seguranca/aso`, icon: HeartPulse }],
    },
    {
      title: 'Pessoas',
      items: [
        { name: 'Comunicados', href: `${base}/notifications`, icon: Bell },
        ...(canManage ? [
          { name: 'Admissão', href: `${base}/onboarding`, icon: UserRoundPlus },
          { name: 'Promoções', href: `${base}/promotions`, icon: Award },
          { name: 'Folha de pagamento', href: `${base}/payroll`, icon: FileClock },
        ] : []),
      ],
    },
  ];
  const flat = groups.flatMap((group) => group.items);
  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const current = flat.find(isActive) ?? flat[0];

  return (
    <div className={`${styles.surface} w-full min-w-0`}>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-fg">Gestão</h1>
        <p className="mt-0.5 text-sm text-fg-mut">{agendaOnly ? 'Organize seu dia e seu mês: compromissos, entrevistas e links de reunião (Teams, Meet, Zoom).' : 'Pendências, agenda, segurança do trabalho e rotinas de pessoas em um só lugar.'}</p>
      </header>

      {!agendaOnly && (
      <label className="mb-4 block lg:hidden">
        <span className="mb-1 block text-sm font-medium">Área</span>
        <select className="input-v2 w-full" value={current.href} onChange={(event) => router.push(event.target.value)}>
          {groups.map((group) => (
            <optgroup key={group.title} label={group.title}>
              {group.items.map((item) => <option key={item.href} value={item.href}>{item.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      )}

      <div className={agendaOnly ? '' : 'grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]'}>
        {!agendaOnly && (
        <nav className="hidden lg:block" aria-label="Áreas de gestão">
          <div className="card-v2 sticky top-4 space-y-4 p-3">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-fg-mut">
                  {group.icon ? <group.icon size={12} /> : null}
                  {group.title}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-10 items-center gap-2 rounded-v2-md px-2.5 text-sm font-medium transition-colors',
                            active ? 'bg-brand-600 text-white shadow-v2-sm' : 'text-fg-mut hover:bg-bg-sub hover:text-brand-700 dark:hover:text-white',
                          )}
                        >
                          <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        )}

        <div className="min-w-0">{outsideAgenda ? null : children}</div>
      </div>
    </div>
  );
}
