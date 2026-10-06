'use client';

import Link from 'next/link';
import { Briefcase, CalendarClock, FileCheck2, Inbox } from 'lucide-react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { greetingText } from '@/app/lib/dashboard-day';
import { jobsApi } from '../jobs/jobs-api';

const when = (value: string) => new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Dashboard do RH - R&S: somente recrutamento. Nao consulta folha, ponto, funcionarios nem ferias.
 * Os numeros vem de /jobs/stats, que ja respeita o escopo de vagas do usuario.
 */
export function RecruitmentDashboard({ tenant }: { tenant: string }) {
  const { user, company } = useAuth();
  const stats = useQuery(() => jobsApi.stats(), [company?.id, user?.id]);
  const base = `/${tenant}/dashboard/jobs`;

  if (stats.loading && !stats.data) return <LoadingState label="Carregando seu painel…" />;
  if (stats.error && !stats.data) return <ErrorState message="Não foi possível carregar os indicadores agora." onRetry={stats.refetch} />;
  const data = stats.data;
  if (!data) return null;

  const pendingScreening = data.applications.byStatus?.APPLIED ?? 0;
  const indicators = [
    { label: 'Vagas abertas', value: data.jobs.open, icon: Briefcase, href: base },
    { label: 'Candidaturas para triagem', value: pendingScreening, icon: Inbox, href: base },
    { label: 'Entrevistas próximas', value: data.totals?.upcomingInterviews ?? 0, icon: CalendarClock, href: base },
    { label: 'Documentos a conferir', value: data.totals?.pendingDocuments ?? 0, icon: FileCheck2, href: base },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-fg">{greetingText(user?.name)}</h1>
        <p className="mt-1 text-sm text-fg-sub">Seu painel de recrutamento e seleção.</p>
      </header>

      {stats.error && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Os dados podem estar desatualizados: não foi possível atualizar agora.</p>}

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicators.map(({ label, value, icon: Icon, href }) => (
          <li key={label}>
            <Link href={href} className="card-v2 flex min-h-24 flex-col justify-between p-4 focus-visible:ring-2 focus-visible:ring-brand">
              <span className="flex items-center gap-2 text-sm text-fg-sub"><Icon size={16} aria-hidden="true" /> {label}</span>
              <span className="text-3xl font-semibold text-fg">{value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="rs-attention" className="card-v2 space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="rs-attention" className="text-base font-semibold">Requer atenção</h2>
          <Link href={base} className="text-sm font-medium text-brand">Ver todas</Link>
        </div>
        {data.nextInterviews.length === 0 && pendingScreening === 0 && (data.totals?.pendingDocuments ?? 0) === 0
          ? <p className="text-sm text-fg-sub">Nada pendente por enquanto.</p>
          : (
            <ul className="space-y-2 text-sm">
              {pendingScreening > 0 && <li><Link href={base} className="underline">{pendingScreening} candidatura(s) aguardando triagem</Link></li>}
              {(data.totals?.pendingDocuments ?? 0) > 0 && <li><Link href={base} className="underline">{data.totals?.pendingDocuments} documento(s) aguardando conferência</Link></li>}
              {data.nextInterviews.slice(0, 3).map((item) => (
                <li key={item.id}><Link href={`${base}/${item.jobId}`} className="underline">{when(item.scheduledAt)} · {item.candidateName} — {item.jobTitle}</Link></li>
              ))}
            </ul>
          )}
      </section>

      <p className="text-xs text-fg-sub">Os números consideram apenas as vagas sob sua responsabilidade (ou sem responsável definido).</p>
    </div>
  );
}