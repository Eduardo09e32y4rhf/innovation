'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button, PageHeader } from '@/app/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';
import { useQuery } from '../_components/use-platform-query';
import api, { type PlatformCompany } from '@/app/lib/api';

type Analysis = { riskLevel?: string; reasons?: string[]; recommendations?: string[]; source?: string };
export function InteligenciaView({ params }: { params: { tenant: string } }) {
  const [search, setSearch] = useState('');
  const [riskData, setRiskData] = useState<Record<string, Analysis>>({});
  const [summaryData, setSummaryData] = useState<Record<string, { summaryText?: string }>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [analyzedAt, setAnalyzedAt] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string[]>([]);
  const pendingRef = useRef(new Set<string>());
  const companies = useQuery(() => api.platform.listCompanies({ limit: 1000 }).then(result => result.data), []);
  const filtered = useMemo(() => (companies.data || []).filter(company => [company.name, company.document || ''].some(value => value.toLowerCase().includes(search.trim().toLowerCase()))), [companies.data, search]);
  const counts = useMemo(() => {
    const result = { high: 0, medium: 0, low: 0, unknown: 0 };
    for (const company of companies.data || []) {
      const level = riskData[company.id]?.riskLevel;
      if (level === 'HIGH') result.high++;
      else if (level === 'MEDIUM') result.medium++;
      else if (level === 'LOW') result.low++;
      else result.unknown++;
    }
    return result;
  }, [companies.data, riskData]);

  async function runAiRisk(company: PlatformCompany) {
    if (pendingRef.current.has(company.id)) return;
    pendingRef.current.add(company.id);
    setPending([...pendingRef.current]);
    setErrors(previous => ({ ...previous, [company.id]: '' }));
    try {
      const [risk, summary] = await Promise.all([api.ai.platform.companyRisk(company.id), api.ai.platform.companySummary(company.id).catch(() => null)]);
      setRiskData(previous => ({ ...previous, [company.id]: risk }));
      if (summary) setSummaryData(previous => ({ ...previous, [company.id]: summary }));
      setAnalyzedAt(previous => ({ ...previous, [company.id]: new Date().toLocaleString('pt-BR') }));
      toast.success(`Análise concluída para ${company.name}.`);
    } catch (error) {
      setErrors(previous => ({ ...previous, [company.id]: error instanceof Error ? error.message : 'Análise indisponível. Tente novamente.' }));
    } finally {
      pendingRef.current.delete(company.id);
      setPending([...pendingRef.current]);
    }
  }

  return <div className="min-w-0 space-y-4">
    <PageHeader title="Inteligência operacional" subtitle="Análises de risco como apoio à revisão. Os resultados não alteram empresas ou cobranças." actions={<Button variant="outline" onClick={companies.refetch} isLoading={companies.loading}><RefreshCw size={18} /> Atualizar dados</Button>} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[['Empresas carregadas', companies.data?.length], ['Risco alto', counts.high], ['Em atenção', counts.medium], ['Risco baixo', counts.low], ['Não analisadas', counts.unknown]].map(([label, value]) => <article key={String(label)} className="card-v2 p-4"><p className="text-sm text-fg-mut">{label}</p><p className="mt-1 text-2xl font-semibold text-fg">{companies.data ? value : '—'}</p></article>)}
    </div>
    <p className="text-sm text-fg-mut">Indicadores das empresas carregadas (até 1.000). Análises desta sessão; empresas sem resultado permanecem não analisadas.</p>
    <section className="card-v2 min-w-0 overflow-hidden">
      <label className="block border-b border-border p-4"><span className="mb-1 block text-sm font-medium text-fg">Buscar empresa</span><div className="relative"><Search aria-hidden="true" size={18} className="absolute left-3 top-3 text-fg-mut" /><input className="input-v2 w-full pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou CNPJ" /></div></label>
      {companies.error ? <ErrorState message={companies.error} onRetry={companies.refetch} /> : companies.loading && !companies.data ? <LoadingState label="Carregando empresas..." /> : !filtered.length ? <EmptyState message="Nenhuma empresa encontrada." /> : <div className="divide-y divide-border">{filtered.map(company => {
        const risk = riskData[company.id];
        const label = risk?.riskLevel === 'HIGH' ? 'Risco alto' : risk?.riskLevel === 'MEDIUM' ? 'Em atenção' : risk?.riskLevel === 'LOW' ? 'Risco baixo' : 'Não analisada';
        return <article key={company.id} className="min-w-0 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0"><Link className="break-words text-base font-semibold text-fg hover:underline" href={`/${params.tenant}/dashboard/platform/${company.id}?tab=general`}>{company.name} <ArrowRight size={16} className="inline" /></Link><p className="mt-1 text-sm text-fg-mut">{company.document || 'CNPJ não informado'} · {company.plan || 'Plano não informado'} · {company.usersCount ?? '—'} usuários · {company.employeesCount ?? '—'} funcionários</p><p className="mt-1 text-sm font-medium text-fg"><Activity size={16} className="mr-1 inline" />{pending.includes(company.id) ? 'Analisando...' : label}</p><p className="text-xs text-fg-mut">{analyzedAt[company.id] ? `Consultada em ${analyzedAt[company.id]}` : 'Sem análise nesta sessão'}</p></div>
            <Button variant="outline" isLoading={pending.includes(company.id)} onClick={() => void runAiRisk(company)}>{risk ? 'Reanalisar risco' : 'Analisar risco'}</Button>
          </div>
          {errors[company.id] && <p role="alert" className="mt-3 text-sm text-danger">{errors[company.id]}</p>}
          {risk && <div className="mt-3 grid gap-4 rounded-xl bg-bg-sub p-4 md:grid-cols-2">
            {summaryData[company.id]?.summaryText && <p className="text-sm text-fg md:col-span-2">{summaryData[company.id].summaryText}</p>}
            <div><h2 className="text-sm font-semibold text-fg">Indicadores e motivos</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-mut">{(risk.reasons || []).map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>
            <div><h2 className="text-sm font-semibold text-fg">Recomendações</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-fg-mut">{(risk.recommendations || []).map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ul></div>
            <p className="text-xs text-fg-mut md:col-span-2">Fonte: {risk.source || 'IA'}. Confira os dados antes de decidir; o resultado pode ficar desatualizado.</p>
          </div>}
        </article>;
      })}</div>}
    </section>
  </div>;
}
