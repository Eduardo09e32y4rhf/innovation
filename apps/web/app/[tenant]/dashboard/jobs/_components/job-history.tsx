'use client';

import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { jobsApi } from '../jobs-api';

const FIELD_LABEL: Record<string, string> = {
  title: 'título', description: 'descrição', location: 'local', employmentType: 'tipo de contrato', salaryRange: 'faixa salarial', salaryMin: 'salário mínimo', salaryMax: 'salário máximo',
  salaryHidden: 'exibição do salário', benefits: 'benefícios', requirements: 'requisitos', department: 'área', workMode: 'modalidade', seniority: 'senioridade', openings: 'quantidade de vagas',
  deadline: 'prazo', pipelineId: 'funil', isInternal: 'vaga interna', confidential: 'confidencial', interviewGuide: 'roteiro de entrevista', screeningMinScore: 'nota mínima da triagem',
  screeningAction: 'ação da triagem', pcd: 'vaga PCD', costAmount: 'custo da vaga',
};
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

function detail(metadata: Record<string, unknown>) {
  const parts: string[] = [];
  if (Array.isArray(metadata.fields) && metadata.fields.length) parts.push(`Campos: ${(metadata.fields as string[]).map((field) => FIELD_LABEL[field] ?? field).join(', ')}`);
  if (typeof metadata.candidates === 'number') parts.push(`${metadata.candidates} candidato(s)`);
  if (metadata.format) parts.push(`formato ${String(metadata.format).toUpperCase()}`);
  if (metadata.title && !parts.length) parts.push(String(metadata.title));
  return parts.join(' · ');
}

/** Histórico de auditoria da vaga: quem fez o quê e quando (criar, editar, publicar, encerrar, duplicar, mover etapa, exportar). */
export function JobHistory({ jobId }: { jobId: string }) {
  const history = useQuery(() => jobsApi.history(jobId), [jobId]);
  if (history.loading && !history.data) return <LoadingState label="Carregando histórico…" />;
  if (history.error) return <ErrorState message={history.error} onRetry={history.refetch} />;
  const rows = history.data ?? [];
  if (!rows.length) return <EmptyState message="Ainda não há ações registradas para esta vaga." />;
  return (
    <section aria-label="Histórico da vaga" className="rounded-2xl border border-border bg-bg p-4">
      <h2 className="text-sm font-semibold text-fg">Histórico da vaga</h2>
      <ol className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-border px-3 py-2 text-sm">
            <span className="min-w-0"><strong className="text-fg">{row.label}</strong>{detail(row.metadata) && <span className="ml-2 text-fg-sub">{detail(row.metadata)}</span>}</span>
            <span className="text-xs text-fg-sub">{row.userName ?? 'Sistema'} · {dateTime(row.createdAt)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
