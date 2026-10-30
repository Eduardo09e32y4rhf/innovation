'use client';

import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { PageHeader } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { request } from '@/app/lib/api';
import { SectionCard, inputClass } from '../_components/bits';

type Metrics = {
  period: { from: string; to: string };
  totals: { applications: number; hired: number; rejected: number; open: number };
  timeToHireDays: { average: number | null; median: number | null; samples: number };
  timeToFillDays: { average: number | null; median: number | null; samples: number };
  offerAcceptanceRate: number | null;
  funnel: Array<{ kind: string; label: string; count: number; conversionFromPrevious: number | null }>;
  withdrawalsByStage: Record<string, number>;
  rejectionReasons: Record<string, number>;
  bySource: Array<{ source: string; applications: number; hires: number; hireRate: number | null }>;
  recruiters: Array<{ userId: string; name: string; jobsAssigned: number; moves: number; hires: number }>;
  diversity: { responses: number; minGroup: number; gender: Record<string, number>; race: Record<string, number>; pcd: number | null };
  jobs: Array<{ id: string; title: string }>;
  pcd: { quota: { applies: boolean; employees: number; percent: number; required: number; filled: number; missing: number; met: boolean }; openPcdJobs: number };
};

const REASON: Record<string, string> = { PERFIL: 'Perfil não aderente', EXPERIENCIA: 'Experiência insuficiente', SALARIO: 'Pretensão salarial', LOCALIZACAO: 'Localização', DISPONIBILIDADE: 'Disponibilidade', COMPORTAMENTAL: 'Comportamental', DESISTENCIA: 'Desistência', VAGA_CANCELADA: 'Vaga cancelada', OUTRO: 'Outro', SEM_CODIGO: 'Sem motivo padronizado' };
const LABEL: Record<string, string> = { MULHER: 'Mulher', HOMEM: 'Homem', NAO_BINARIO: 'Não binário', AMARELA: 'Amarela', BRANCA: 'Branca', INDIGENA: 'Indígena', PARDA: 'Parda', PRETA: 'Preta', CAREERS_PORTAL: 'Portal de carreiras', LINKEDIN: 'LinkedIn', WHATSAPP: 'WhatsApp', INDICACAO: 'Indicação', OUTRO: 'Outro' };
const days = (value: number | null) => (value === null ? '—' : `${value.toLocaleString('pt-BR')} dias`);
const iso = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div className="card-v2 p-4"><p className="text-xs text-fg-sub">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>{hint && <p className="text-[11px] text-fg-mut">{hint}</p>}</div>;
}

function csv(m: Metrics) {
  const rows: unknown[][] = [['Indicador', 'Valor'], ['Candidaturas', m.totals.applications], ['Contratados', m.totals.hired], ['Tempo médio para contratar (dias)', m.timeToHireDays.average ?? ''], ['Tempo médio para preencher (dias)', m.timeToFillDays.average ?? ''], ['Aceite de propostas (%)', m.offerAcceptanceRate ?? ''], [], ['Etapa', 'Candidatos', 'Conversão (%)'], ...m.funnel.map((f) => [f.label, f.count, f.conversionFromPrevious ?? '']), [], ['Origem', 'Candidaturas', 'Contratados'], ...m.bySource.map((s) => [LABEL[s.source] ?? s.source, s.applications, s.hires]), [], ['Recrutador', 'Movimentações', 'Contratações'], ...m.recruiters.map((r) => [r.name, r.moves, r.hires])];
  const text = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `recrutamento-${m.period.from}-${m.period.to}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function RecruitmentMetricsPage() {
  const { tenant = '' } = useParams<{ tenant: string }>();
  const [from, setFrom] = useState(iso(-180)); const [to, setTo] = useState(iso(0)); const [jobId, setJobId] = useState('');
  const query = useQuery(() => request<Metrics>(`/recruitment-metrics?from=${from}&to=${to}${jobId ? `&jobId=${jobId}` : ''}`), [from, to, jobId]);
  const m = query.data;
  const maxFunnel = Math.max(1, ...(m?.funnel.map((f) => f.count) ?? [1]));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <Link href={`/${tenant}/dashboard/jobs`} className="inline-flex items-center gap-1 text-sm text-fg-sub hover:text-fg"><ArrowLeft size={15} aria-hidden="true" /> Voltar para vagas</Link>
      <PageHeader title="Relatórios de recrutamento" subtitle="Quanto tempo leva, de onde vêm os candidatos e onde o processo perde gente." actions={m ? <button type="button" className="btn btn-outline" onClick={() => csv(m)}><Download size={15} aria-hidden="true" /> Exportar CSV</button> : undefined} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-xs font-semibold">De<input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="space-y-1 text-xs font-semibold">Até<input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="space-y-1 text-xs font-semibold">Vaga<select className={inputClass} value={jobId} onChange={(e) => setJobId(e.target.value)}><option value="">Todas</option>{(m?.jobs ?? []).map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select></label>
      </div>
      {query.error && <ErrorState message={query.error} onRetry={query.refetch} />}
      {query.loading && !m ? <LoadingState label="Calculando relatórios…" /> : m && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Candidaturas" value={String(m.totals.applications)} hint={`${m.totals.open} em andamento`} />
            <Kpi label="Contratados" value={String(m.totals.hired)} />
            <Kpi label="Tempo para contratar" value={days(m.timeToHireDays.average)} hint={`mediana ${days(m.timeToHireDays.median)} · ${m.timeToHireDays.samples} contratação(ões)`} />
            <Kpi label="Tempo para preencher a vaga" value={days(m.timeToFillDays.average)} hint={`${m.timeToFillDays.samples} vaga(s) preenchida(s)`} />
            <Kpi label="Aceite de propostas" value={m.offerAcceptanceRate === null ? '—' : `${m.offerAcceptanceRate.toLocaleString('pt-BR')}%`} />
          </div>
          <SectionCard title="Cota de vagas para pessoas com deficiência (PCD)" description="Lei 8.213/1991, art. 93: empresas com 100 ou mais empregados reservam de 2% a 5% dos cargos para pessoas com deficiência ou reabilitadas. O número de contratados vem das declarações voluntárias do processo seletivo; confira com o cadastro oficial antes de reportar.">
            {m.pcd.quota.applies ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Kpi label="Empregados ativos" value={String(m.pcd.quota.employees)} />
                <Kpi label="Cota exigida" value={`${m.pcd.quota.percent}% (${m.pcd.quota.required})`} />
                <Kpi label="Contratados PCD (processo seletivo)" value={String(m.pcd.quota.filled)} />
                <Kpi label={m.pcd.quota.met ? 'Cota atingida' : 'Faltam'} value={m.pcd.quota.met ? 'Sim' : String(m.pcd.quota.missing)} hint={m.pcd.quota.met ? undefined : 'contratações para cumprir a cota'} />
                <Kpi label="Vagas PCD abertas" value={String(m.pcd.openPcdJobs)} />
              </div>
            ) : <p className="text-sm text-fg-sub">A cota não se aplica: a empresa tem {m.pcd.quota.employees} empregado(s) ativo(s), menos de 100. Vagas PCD abertas: {m.pcd.openPcdJobs}.</p>}
          </SectionCard>
          <SectionCard title="Funil de conversão" description="Quantos candidatos chegaram a cada etapa e quanto passou da etapa anterior.">
            <ul className="space-y-2">{m.funnel.map((f) => (
              <li key={f.kind} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm"><span>{f.label}</span><div className="h-3 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-purple-500" style={{ width: `${(f.count / maxFunnel) * 100}%` }} /></div><span className="text-right tabular-nums">{f.count}{f.conversionFromPrevious !== null ? ` · ${f.conversionFromPrevious}%` : ''}</span></li>
            ))}</ul>
          </SectionCard>
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="Origem dos candidatos" description="Qual canal traz mais candidatos e mais contratações.">
              <table className="w-full text-sm"><thead className="text-left text-xs text-fg-sub"><tr><th className="py-1">Origem</th><th>Candidaturas</th><th>Contratados</th><th>Taxa</th></tr></thead><tbody>{m.bySource.map((s) => <tr key={s.source} className="border-t border-border"><td className="py-1.5">{LABEL[s.source] ?? s.source}</td><td>{s.applications}</td><td>{s.hires}</td><td>{s.hireRate ?? '—'}{s.hireRate !== null ? '%' : ''}</td></tr>)}</tbody></table>
            </SectionCard>
            <SectionCard title="Motivos de reprovação e desistência" description="Desistência por etapa mostra onde o candidato abandona o processo.">
              <ul className="space-y-1 text-sm">{Object.entries(m.rejectionReasons).sort((a, b) => b[1] - a[1]).map(([code, count]) => <li key={code} className="flex justify-between border-t border-border py-1.5"><span>{REASON[code] ?? code}</span><span className="tabular-nums">{count}</span></li>)}{Object.keys(m.rejectionReasons).length === 0 && <li className="text-fg-sub">Nenhuma reprovação no período.</li>}</ul>
              {Object.keys(m.withdrawalsByStage).length > 0 && <p className="mt-3 text-xs text-fg-sub">Desistências por etapa: {Object.entries(m.withdrawalsByStage).map(([stage, count]) => `${stage} (${count})`).join(' · ')}</p>}
            </SectionCard>
          </div>
          <SectionCard title="Produtividade por recrutador" description="Movimentações de candidatos (etapa, reprovação, contratação) registradas por cada pessoa.">
            {m.recruiters.length === 0 ? <p className="text-sm text-fg-sub">Sem movimentações no período.</p> : <table className="w-full text-sm"><thead className="text-left text-xs text-fg-sub"><tr><th className="py-1">Pessoa</th><th>Vagas atribuídas</th><th>Movimentações</th><th>Contratações</th></tr></thead><tbody>{m.recruiters.map((r) => <tr key={r.userId} className="border-t border-border"><td className="py-1.5">{r.name}</td><td>{r.jobsAssigned}</td><td>{r.moves}</td><td>{r.hires}</td></tr>)}</tbody></table>}
          </SectionCard>
          <SectionCard title="Diversidade e inclusão (anônimo)" description={`Dados voluntários, separados da avaliação. Grupos com menos de ${m.diversity.minGroup} pessoas não aparecem, para ninguém ser identificado. ${m.diversity.responses} resposta(s) no período.`}>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              {([['Gênero', m.diversity.gender], ['Cor ou raça', m.diversity.race]] as const).map(([title, group]) => <div key={title}><p className="font-semibold">{title}</p>{Object.keys(group).length === 0 ? <p className="text-fg-sub">Sem grupos suficientes.</p> : <ul>{Object.entries(group).map(([k, v]) => <li key={k}>{LABEL[k] ?? k}: {v}</li>)}</ul>}</div>)}
              <div><p className="font-semibold">Pessoas com deficiência</p><p>{m.diversity.pcd === null ? 'Sem grupo suficiente.' : m.diversity.pcd}</p></div>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}