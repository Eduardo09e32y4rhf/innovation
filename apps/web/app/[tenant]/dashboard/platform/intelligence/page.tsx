'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@/app/hooks/use-data';
import api, { PlatformCompany } from '@/app/lib/api';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle, Cpu, RefreshCw, Search, ArrowRight, Sparkles, Building2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function IntelligencePage({ params }: { params: { tenant: string } }) {
  const [search, setSearch] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [riskData, setRiskData] = useState<Record<string, any>>({});
  const [summaryData, setSummaryData] = useState<Record<string, any>>({});

  const companies = useQuery(() => api.platform.listCompanies({ limit: 1000 }).then(res => res.data), []);

  const filtered = useMemo(() => {
    if (!companies.data) return [];
    const term = search.toLowerCase();
    return companies.data.filter(c =>
      c.name.toLowerCase().includes(term) ||
      (c.document && c.document.toLowerCase().includes(term))
    );
  }, [companies.data, search]);

  async function runAiRisk(c: PlatformCompany) {
    setAnalyzingId(c.id);
    try {
      const [risk, summary] = await Promise.all([
        api.ai.platform.companyRisk(c.id),
        api.ai.platform.companySummary(c.id).catch(() => null),
      ]);
      setRiskData(prev => ({ ...prev, [c.id]: risk }));
      if (summary) setSummaryData(prev => ({ ...prev, [c.id]: summary }));
      toast.success(`Análise de IA concluída para ${c.name}.`);
    } catch (err) {
      toast.error('Não foi possível gerar análise de risco com a IA.');
    } finally {
      setAnalyzingId(null);
    }
  }

  const riskCounts = useMemo(() => {
    let high = 0, medium = 0, low = 0;
    Object.values(riskData).forEach(r => {
      if (r.riskLevel === 'HIGH') high++;
      else if (r.riskLevel === 'MEDIUM') medium++;
      else low++;
    });
    return { high, medium, low };
  }, [riskData]);

  if (companies.loading) return <LoadingState label="Carregando inteligência operacional da frota..." />;
  if (companies.error) return <ErrorState message={companies.error} onRetry={companies.refetch} />;

  return (
    <div className="mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 ring-1 ring-inset ring-indigo-400/30">
            <Sparkles size={14} className="animate-pulse text-indigo-400" />
            Inteligência Artificial Operacional
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Análise de Risco IA & Preditiva</h1>
          <p className="max-w-xl text-xs text-slate-300 leading-relaxed">
            Monitoramento de churn, detecção de anomalias financeiras e diagnóstico técnico automatizado para todas as empresas da frota SaaS Innovation RH.
          </p>
        </div>
        <button
          onClick={() => companies.refetch()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-bold text-white shadow-sm ring-1 ring-white/20 transition hover:bg-white/20"
        >
          <RefreshCw size={14} className={companies.loading ? 'animate-spin' : ''} />
          Atualizar Dados
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-black uppercase tracking-wider">Empresas Monitoradas</span>
            <Building2 size={18} className="text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{companies.data?.length || 0}</p>
          <span className="mt-1 text-[11px] font-semibold text-slate-400">Frota total ativa</span>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-black uppercase tracking-wider">Risco Crítico (High)</span>
            <ShieldAlert size={18} className="text-rose-500 animate-bounce" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{riskCounts.high}</p>
          <span className="mt-1 text-[11px] font-semibold text-rose-500">Inadimplência / Chamados</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-black uppercase tracking-wider">Em Atenção (Medium)</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{riskCounts.medium}</p>
          <span className="mt-1 text-[11px] font-semibold text-amber-500">Falhas de webhook ou limites</span>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-black uppercase tracking-wider">Saudáveis (Low)</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{riskCounts.low || (companies.data?.length || 0) - riskCounts.high - riskCounts.medium}</p>
          <span className="mt-1 text-[11px] font-semibold text-emerald-500">Operação estabilizada</span>
        </div>
      </div>

      {/* Search & List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 p-4">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar empresa por nome ou CNPJ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <EmptyState message="Nenhuma empresa encontrada com este critério." />
          ) : (
            filtered.map(c => {
              const risk = riskData[c.id];
              const summary = summaryData[c.id];
              const isAnalyzing = analyzingId === c.id;

              return (
                <div key={c.id} className="p-5 transition hover:bg-slate-50/80">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/${params.tenant}/dashboard/platform/${c.id}?tab=general`}
                          className="text-sm font-black text-slate-900 hover:text-indigo-600 transition flex items-center gap-1.5"
                        >
                          {c.name}
                          <ExternalLink size={13} className="text-slate-400" />
                        </Link>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {c.plan ?? 'FREE'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.billingStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                          c.billingStatus === 'TRIAL' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        }`}>
                          {c.billingStatus ?? 'TRIAL'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-500">
                        CNPJ: {c.document || 'Não informado'} • {c.usersCount || 0}/{c.maxUsers || 1} usuários • {c.employeesCount || 0} colaboradores
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {risk && (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                          risk.riskLevel === 'HIGH' ? 'bg-rose-600 text-white animate-pulse' :
                          risk.riskLevel === 'MEDIUM' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {risk.riskLevel === 'HIGH' ? '🔴 RISCO CRÍTICO' : risk.riskLevel === 'MEDIUM' ? '🟡 ATENÇÃO' : '🟢 SAUDÁVEL'}
                        </span>
                      )}

                      <button
                        onClick={() => runAiRisk(c)}
                        disabled={isAnalyzing}
                        className="inline-flex h-9 items-center gap-2 rounded-xl bg-indigo-50 px-3.5 text-xs font-black text-indigo-700 ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition shadow-sm"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw size={13} className="animate-spin text-indigo-600" />
                            Analisando com IA...
                          </>
                        ) : (
                          <>
                            <Cpu size={14} className="text-indigo-600" />
                            {risk ? 'Reanalisar Risco' : 'Rodar IA Análise'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* AI Diagnosis details card */}
                  {risk && (
                    <div className="mt-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-slate-50/80 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-indigo-600" />
                          <span className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                            Diagnóstico Operacional ({risk.source || 'AI'})
                          </span>
                        </div>
                        {summary?.summaryText && (
                          <span className="text-[11px] font-bold text-slate-600 italic max-w-lg truncate">
                            &ldquo;{summary.summaryText}&rdquo;
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
                        <div className="space-y-1.5">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <AlertTriangle size={13} className="text-amber-500" /> Indicadores & Motivos Detectados:
                          </span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-600">
                            {(risk.reasons || []).map((r: string, idx: number) => (
                              <li key={idx} className="font-medium">{r}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1.5">
                          <span className="font-bold text-indigo-900 flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-500" /> Recomendações da IA:
                          </span>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700 font-semibold">
                            {(risk.recommendations || []).map((rec: string, idx: number) => (
                              <li key={idx} className="text-indigo-950">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
