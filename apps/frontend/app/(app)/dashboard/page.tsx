'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  FolderKanban,
  Users,
  Briefcase,
  Brain,
  TrendingUp,
  Activity,
  Sparkles,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { AuthService, DashboardService } from '@/services/api';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number.isFinite(val) ? val : 0
  );

function KpiCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  accent
}: {
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  icon: typeof DollarSign;
  accent: string;
}) {
  const trendUp = trend?.includes('+');
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-xl ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend ? (
          <span
            className={`text-[11px] font-black uppercase tracking-wide ${
              trendUp ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            {trend}
          </span>
        ) : null}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {title}
      </p>
      <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{value}</p>
      {subtitle ? (
        <p className="text-[11px] text-slate-500 mt-1 font-medium">{subtitle}</p>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [firstName, setFirstName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [me, m, act] = await Promise.all([
          AuthService.me().catch(() => null),
          DashboardService.getMetrics(),
          DashboardService.getRecentActivity().catch(() => ({ activities: [] }))
        ]);
        if (!cancelled) {
          const raw =
            (me as any)?.full_name || (me as any)?.name || '';
          const fn = String(raw).trim().split(/\s+/)[0] || '';
          setFirstName(fn);
          setMetrics(m);
          setActivity(Array.isArray(act?.activities) ? act.activities : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Não foi possível carregar o cockpit.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const revChange = metrics?.revenue?.change_percent;
  const profitChange = metrics?.profit?.change_percent;
  const revTrend =
    typeof revChange === 'number'
      ? `${revChange >= 0 ? '+' : ''}${revChange}%`
      : undefined;
  const profitTrend =
    typeof profitChange === 'number'
      ? `${profitChange >= 0 ? '+' : ''}${profitChange}%`
      : undefined;

  return (
    <AppLayout title="Cockpit ERP — General">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                Enterprise Elite
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {firstName ? `Bem-vindo, ${firstName}` : 'Bem-vindo de volta'}
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Visão consolidada de finanças, ATS e operações — dados ao vivo da API.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-bold">
            {error}
          </div>
        )}

        {loading && !metrics ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            <p className="text-sm font-bold">Sincronizando cockpit...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <KpiCard
                title="Receita Mensal"
                value={formatCurrency(metrics?.revenue?.current ?? 0)}
                subtitle="Lançamentos de entrada (mês corrente)"
                trend={revTrend ?? '+0%'}
                icon={DollarSign}
                accent="bg-emerald-50 text-emerald-600"
              />
              <KpiCard
                title="Projetos Ativos"
                value={String(metrics?.projects ?? 0)}
                subtitle="Em execução"
                icon={FolderKanban}
                accent="bg-indigo-50 text-indigo-600"
              />
              <KpiCard
                title="Candidatos IA"
                value={String(metrics?.candidates ?? 0)}
                subtitle="Novas submissões / pipeline"
                icon={Users}
                accent="bg-violet-50 text-violet-600"
              />
              <KpiCard
                title="Vagas Ativas"
                value={String(metrics?.active_jobs ?? 0)}
                subtitle="Em busca"
                icon={Briefcase}
                accent="bg-amber-50 text-amber-700"
              />
              <KpiCard
                title="Score IA"
                value={
                  metrics?.ai_score != null
                    ? `${Number(metrics.ai_score).toFixed(1)}/100`
                    : '—'
                }
                subtitle="Eficiência média (match)"
                icon={Brain}
                accent="bg-sky-50 text-sky-700"
              />
              <KpiCard
                title="Lucro Líquido"
                value={formatCurrency(metrics?.profit?.current ?? 0)}
                subtitle="Receitas − despesas (mês)"
                trend={profitTrend ?? '+0%'}
                icon={TrendingUp}
                accent="bg-teal-50 text-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-lg font-black text-slate-900">
                    Atividade em Tempo Real
                  </h2>
                </div>
                {activity.length === 0 ? (
                  <p className="text-sm text-slate-500 font-medium">
                    Nenhum evento recente. Ações no sistema aparecem aqui (auditoria).
                  </p>
                ) : (
                  <ul className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                    {activity.map((a: any) => (
                      <li
                        key={a.id}
                        className="text-sm border-b border-slate-50 pb-3 last:border-0"
                      >
                        <span className="font-bold text-slate-800">{a.message}</span>
                        <span className="block text-[11px] text-slate-400 mt-1">
                          {a.timestamp
                            ? new Date(a.timestamp).toLocaleString('pt-BR')
                            : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-violet-600" />
                  <h2 className="text-lg font-black text-slate-900">
                    Inteligência Ativa
                  </h2>
                </div>
                <p className="text-sm text-slate-600 mb-4 font-medium">
                  Evolução da receita nos últimos meses (dados do backend).
                </p>
                <div className="flex items-end gap-2 h-40">
                  {(metrics?.revenue?.chart_data || []).map(
                    (d: any, i: number) => {
                      const v = Number(d?.revenue ?? d?.value ?? 0);
                      const vals = (metrics?.revenue?.chart_data || []).map(
                        (x: any) => Number(x?.revenue ?? x?.value ?? 0)
                      );
                      const max = Math.max(1, ...vals);
                      const h = Math.round((v / max) * 100);
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1 group"
                        >
                          <div
                            className="w-full bg-indigo-500 rounded-t-md min-h-[4px] transition-all group-hover:bg-indigo-600"
                            style={{ height: `${Math.max(8, h)}%` }}
                            title={`${d?.month}: ${formatCurrency(v)}`}
                          />
                          <span className="text-[9px] font-bold text-slate-400">
                            {d?.month}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
