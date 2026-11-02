'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { useOverlay } from '@/app/components/ui/use-overlay';
import { useQuery } from '@/app/hooks/use-data';
import { jobsApi, type CandidateComparison } from '../jobs-api';
import { SOURCE_LABEL } from './job-costs';

const RECOMMENDATION: Record<string, { label: string; tone: string }> = {
  STRONG_YES: { label: 'Contrataria com certeza', tone: 'bg-emerald-100 text-emerald-800' },
  YES: { label: 'Contrataria', tone: 'bg-emerald-50 text-emerald-700' },
  NO: { label: 'Não contrataria', tone: 'bg-amber-100 text-amber-800' },
  STRONG_NO: { label: 'Não contrataria de jeito nenhum', tone: 'bg-rose-100 text-rose-800' },
};
const DOC_STATUS: Record<string, string> = { RECEIVED: 'Recebido', APPROVED: 'Aprovado', RETURNED: 'Devolvido', REJECTED: 'Recusado' };
const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const num = (value: number | null) => (value === null ? '—' : value.toLocaleString('pt-BR'));

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <tr className="border-t border-border align-top">
      <th scope="row" className="sticky left-0 z-[1] w-36 min-w-36 bg-bg px-3 py-2 text-left text-xs font-semibold text-fg-sub sm:w-44">{label}{hint && <span className="block font-normal">{hint}</span>}</th>
      {children}
    </tr>
  );
}

/** Comparação lado a lado de 2 a 4 candidatos: notas por critério, pareceres, respostas da triagem e documentos. */
export function CandidateCompare({ jobId, ids, onClose }: { jobId: string; ids: string[]; onClose: () => void }) {
  const ref = useOverlay<HTMLDivElement>(true, onClose);
  const query = useQuery(() => jobsApi.compare(jobId, ids), [jobId, ids.join(',')]);
  const data: CandidateComparison | undefined = query.data;

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-label="Comparar candidatos" tabIndex={-1} className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-0 sm:p-4">
      <div className="flex w-full max-w-6xl flex-col overflow-hidden bg-bg shadow-xl sm:rounded-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0"><h2 className="truncate text-base font-semibold text-fg">Comparar candidatos</h2><p className="truncate text-xs text-fg-sub">{data?.job.title ?? 'Carregando…'} · o melhor de cada critério fica destacado</p></div>
          <button type="button" className="btn-icon" aria-label="Fechar comparação" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">
          {query.loading && !data ? <div className="p-6"><LoadingState label="Montando a comparação…" /></div> : query.error ? <div className="p-6"><ErrorState message={query.error} onRetry={query.refetch} /></div> : data && (
            <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
              <caption className="sr-only">Comparação de {data.candidates.length} candidatos</caption>
              <thead>
                <tr><th scope="col" className="sticky left-0 z-[2] w-36 bg-bg sm:w-44"><span className="sr-only">Critério</span></th>
                  {data.candidates.map((candidate) => <th key={candidate.applicationId} scope="col" className="bg-bg-sub px-3 py-3 text-left align-top"><span className="block break-words text-sm font-semibold text-fg">{candidate.name}</span><span className="block text-xs font-normal text-fg-sub">{candidate.stage ?? candidate.status} · inscrito em {date(candidate.appliedAt)}</span>{candidate.knockedOut && <span className="mt-1 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-800">Eliminado na triagem</span>}</th>)}
                </tr>
              </thead>
              <tbody>
                <Row label="Origem">{data.candidates.map((c) => <td key={c.applicationId} className="px-3 py-2">{SOURCE_LABEL[c.source ?? ''] ?? c.source ?? '—'}</td>)}</Row>
                <Row label="Nota da triagem" hint="0 a 100">{data.candidates.map((c) => <td key={c.applicationId} className="px-3 py-2 tabular-nums">{num(c.screeningScore)}</td>)}</Row>
                <Row label="Média ponderada" hint="avaliação do RH">{data.candidates.map((c) => <td key={c.applicationId} className="px-3 py-2 tabular-nums">{c.evaluationsHidden ? <span className="text-xs text-fg-sub">Avalie todos os critérios deste candidato para ver as notas dos colegas.</span> : num(c.evaluationScore)}</td>)}</Row>
                {data.criteria.map((criterion) => (
                  <Row key={criterion.id} label={criterion.name} hint={`peso ${criterion.weight}`}>
                    {data.candidates.map((c) => {
                      const item = c.criteria[criterion.id];
                      const best = (data.best[criterion.id] ?? []).includes(c.applicationId) && data.candidates.length > 1;
                      return <td key={c.applicationId} className={`px-3 py-2 tabular-nums ${best ? 'bg-emerald-50 font-semibold text-emerald-800' : ''}`}>{num(item?.average ?? null)}{item && item.count > 1 && <span className="ml-1 text-xs font-normal text-fg-sub">({item.count} avaliadores)</span>}{best && <span className="sr-only"> (melhor nota)</span>}</td>;
                    })}
                  </Row>
                ))}
                <Row label="Pareceres da entrevista">
                  {data.candidates.map((c) => (
                    <td key={c.applicationId} className="space-y-2 px-3 py-2">
                      {c.feedback.length === 0 && <span className="text-xs text-fg-sub">{c.feedbackHidden ? `${c.feedbackHidden} parecer(es) visíveis só depois que você avaliar a entrevista.` : 'Sem pareceres.'}</span>}
                      {c.feedback.map((f, index) => (
                        <div key={index} className="rounded-lg border border-border p-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RECOMMENDATION[f.recommendation]?.tone ?? 'bg-zinc-100'}`}>{RECOMMENDATION[f.recommendation]?.label ?? f.recommendation}</span>
                          <p className="mt-1 text-xs text-fg-sub">{f.mine ? 'Você' : f.authorName ?? 'Entrevistador'}{f.average !== null ? ` · média ${num(f.average)}` : ''}</p>
                          {f.notes && <p className="mt-1 whitespace-pre-wrap break-words text-xs">{f.notes}</p>}
                        </div>
                      ))}
                    </td>
                  ))}
                </Row>
                {data.questions.map((question) => (
                  <Row key={question.id} label={question.label} hint="triagem">
                    {data.candidates.map((c) => <td key={c.applicationId} className="whitespace-pre-wrap break-words px-3 py-2">{c.answers[question.id] || <span className="text-fg-sub">—</span>}</td>)}
                  </Row>
                ))}
                <Row label="Documentos">
                  {data.candidates.map((c) => <td key={c.applicationId} className="px-3 py-2">{c.documents.length === 0 ? <span className="text-xs text-fg-sub">Nenhum documento.</span> : <ul className="space-y-0.5 text-xs">{c.documents.map((d, index) => <li key={index}>{d.label}: <strong>{DOC_STATUS[d.status] ?? d.status}</strong></li>)}</ul>}</td>)}
                </Row>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
