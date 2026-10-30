'use client';

import Link from 'next/link';
import { SectionCard } from './bits';
import { SOURCE_LABEL } from './job-costs';

export type CostMetrics = {
  total: number; fixedTotal: number; sourceTotal: number; hires: number; costPerHire: number | null;
  byJob: Array<{ jobId: string; title: string; cost: number; applications: number; hires: number; costPerHire: number | null }>;
  bySource: Array<{ source: string; cost: number; applications: number; hires: number; costPerApplication: number | null; costPerHire: number | null }>;
};
export type SlaMetrics = {
  stages: Array<{ name: string; kind: string; slaDays: number | null; samples: number; averageDays: number | null; medianDays: number | null; overSla: number; stalled: number; currentCount: number }>;
  stalled: Array<{ applicationId: string; jobId: string; jobTitle: string; stage: string; days: number; slaDays: number }>;
};
export type NoShowMetrics = { available: boolean; rate: number | null; interviews: number; noShows: number };

export const money = (value: number | null) => (value === null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

function Bar({ label, value, max, text, tone = 'bg-purple-500' }: { label: string; value: number; max: number; text: string; tone?: string }) {
  return (
    <li className="grid grid-cols-[minmax(80px,140px)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate" title={label}>{label}</span>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200" role="img" aria-label={`${label}: ${text}`}><div className={`h-full ${tone}`} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} /></div>
      <span className="text-right tabular-nums">{text}</span>
    </li>
  );
}

/** Custo por origem, por vaga e por contratação. Só aparece com custo informado (RH, administrador e DEV veem os valores). */
export function CostSection({ costs, base }: { costs: CostMetrics; base: string }) {
  const maxSource = Math.max(0, ...costs.bySource.map((row) => row.cost));
  return (
    <SectionCard title="Custo de recrutamento" description="Custo fixo da vaga somado ao gasto por canal. O custo por contratação divide o total pelos candidatos contratados no período.">
      {costs.total === 0 ? <p className="text-sm text-fg-sub">Nenhum custo informado. Abra uma vaga e use o botão Custos para registrar anúncios, agência e outros gastos.</p> : (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4 text-sm">
            <div className="card-v2 p-3"><dt className="text-xs text-fg-sub">Custo total</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(costs.total)}</dd></div>
            <div className="card-v2 p-3"><dt className="text-xs text-fg-sub">Custo por contratação</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(costs.costPerHire)}</dd></div>
            <div className="card-v2 p-3"><dt className="text-xs text-fg-sub">Custo fixo das vagas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(costs.fixedTotal)}</dd></div>
            <div className="card-v2 p-3"><dt className="text-xs text-fg-sub">Gasto em canais</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{money(costs.sourceTotal)}</dd></div>
          </dl>
          {costs.bySource.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Custo por origem</h3>
              <ul className="space-y-2">{costs.bySource.map((row) => <Bar key={row.source} label={SOURCE_LABEL[row.source] ?? row.source} value={row.cost} max={maxSource} text={`${money(row.cost)}${row.costPerHire !== null ? ` · ${money(row.costPerHire)}/contratação` : ''}`} />)}</ul>
            </div>
          )}
          {costs.byJob.length > 0 && (
            <div className="overflow-x-auto">
              <h3 className="mb-2 text-sm font-semibold">Custo por vaga</h3>
              <table className="w-full min-w-[480px] text-sm"><thead className="text-left text-xs text-fg-sub"><tr><th className="py-1">Vaga</th><th>Custo</th><th>Candidaturas</th><th>Contratados</th><th>Por contratação</th></tr></thead>
                <tbody>{costs.byJob.map((row) => <tr key={row.jobId} className="border-t border-border"><td className="py-1.5"><Link className="hover:underline" href={`${base}/${row.jobId}`}>{row.title}</Link></td><td className="tabular-nums">{money(row.cost)}</td><td>{row.applications}</td><td>{row.hires}</td><td className="tabular-nums">{money(row.costPerHire)}</td></tr>)}</tbody></table>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/** Tempo por etapa contra o prazo (SLA) e quem está parado agora. */
export function SlaSection({ sla, noShow, base }: { sla: SlaMetrics; noShow: NoShowMetrics; base: string }) {
  const rows = sla.stages.filter((stage) => stage.samples > 0);
  const max = Math.max(1, ...rows.flatMap((stage) => [stage.averageDays ?? 0, stage.slaDays ?? 0]));
  return (
    <SectionCard title="Prazo por etapa (SLA) e candidatos parados" description="Tempo médio que os candidatos ficam em cada etapa. Defina o prazo de cada etapa em Configurar funil.">
      {rows.length === 0 ? <p className="text-sm text-fg-sub">Ainda não há movimentações suficientes no período.</p> : (
        <ul className="space-y-2">{rows.map((stage) => {
          const late = stage.slaDays !== null && (stage.averageDays ?? 0) > stage.slaDays;
          return <Bar key={stage.name} label={stage.name} value={stage.averageDays ?? 0} max={max} tone={late ? 'bg-rose-500' : 'bg-emerald-500'}
            text={`${(stage.averageDays ?? 0).toLocaleString('pt-BR')} d${stage.slaDays !== null ? ` / prazo ${stage.slaDays} d` : ''}${stage.stalled ? ` · ${stage.stalled} parado(s)` : ''}`} />;
        })}</ul>
      )}
      {sla.stalled.length > 0 && (
        <div className="overflow-x-auto">
          <h3 className="mb-2 mt-4 text-sm font-semibold">Parados além do prazo agora</h3>
          <table className="w-full min-w-[420px] text-sm"><thead className="text-left text-xs text-fg-sub"><tr><th className="py-1">Vaga</th><th>Etapa</th><th>Dias parado</th><th>Prazo</th></tr></thead>
            <tbody>{sla.stalled.map((row) => <tr key={row.applicationId} className="border-t border-border"><td className="py-1.5"><Link className="hover:underline" href={`${base}/${row.jobId}`}>{row.jobTitle}</Link></td><td>{row.stage}</td><td className="tabular-nums">{row.days}</td><td>{row.slaDays} d</td></tr>)}</tbody></table>
        </div>
      )}
      <p className="mt-3 text-sm text-fg-sub">Taxa de no-show nas entrevistas: {noShow.available ? <strong className="text-fg">{noShow.rate?.toLocaleString('pt-BR')}% ({noShow.noShows} de {noShow.interviews})</strong> : 'indisponível até o registro de comparecimento nas entrevistas.'}</p>
    </SectionCard>
  );
}
