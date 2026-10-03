'use client';

import { Download, ExternalLink, Mail, Phone, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, Drawer } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import type { Pipeline, Tag } from '../types';
import { Field, Pill, TagChip, inputClass } from './bits';

const TABS = [['summary', 'Resumo'], ['evaluation', 'Avaliação'], ['notes', 'Notas'], ['interviews', 'Entrevistas'], ['history', 'Histórico']] as const;
type TabKey = (typeof TABS)[number][0];
const EVENT_LABEL: Record<string, string> = { APPLIED: 'Candidatura recebida', STAGE_CHANGED: 'Mudou de etapa', REJECTED: 'Reprovado', HIRED: 'Contratado', EVALUATED: 'Avaliado', INTERVIEW: 'Entrevista' };

const fail = (cause: unknown, fallback: string) => toast.error(cause instanceof ApiError ? cause.message : fallback);

export function CandidateDrawer({
  applicationId, pipeline, tags, onClose, onChanged, onRequestMove,
}: {
  applicationId: string | null; pipeline: Pipeline | undefined; tags: Tag[];
  onClose: () => void; onChanged: () => void; onRequestMove: (applicationId: string, stageId: string) => void;
}) {
  const { user } = useAuth();
  const detail = useQuery(() => jobsApi.application(applicationId ?? ''), [applicationId], { enabled: Boolean(applicationId) });
  const [tab, setTab] = useState<TabKey>('summary');
  const [ratings, setRatings] = useState<Record<string, { score: number; comment: string }>>({});
  const [note, setNote] = useState('');
  const [interview, setInterview] = useState({ scheduledAt: '', kind: 'Entrevista', location: '', interviewer: '' });
  const [busy, setBusy] = useState(false);
  const data = detail.data;

  useEffect(() => { setTab('summary'); setNote(''); }, [applicationId]);
  useEffect(() => {
    if (!data) return;
    const mine = data.evaluations.filter((item) => item.userId === user?.id);
    setRatings(Object.fromEntries(mine.map((item) => [item.criterionId, { score: item.score, comment: item.comment ?? '' }])));
  }, [data, user?.id]);

  async function run(action: () => Promise<unknown>, success?: string) {
    if (busy) return;
    setBusy(true);
    try { await action(); if (success) toast.success(success); detail.refetch(); onChanged(); }
    catch (cause) { fail(cause, 'Não foi possível concluir a ação.'); }
    finally { setBusy(false); }
  }

  async function download() {
    if (!data) return;
    try { await jobsApi.downloadResume(data.id, data.resumeName ?? 'curriculo'); }
    catch (cause) { fail(cause, 'Não foi possível baixar o currículo.'); }
  }

  const stages = pipeline?.stages ?? [];
  const tagIds = new Set(data?.tags.map((tag) => tag.id));

  return (
    <Drawer isOpen={Boolean(applicationId)} onClose={onClose} title={data?.candidate?.name ?? 'Candidato'} description={data?.job.title} maxWidth="max-w-xl">
      {detail.loading && !data ? <LoadingState label="Carregando candidato…" /> : detail.error ? <ErrorState message={detail.error} onRetry={detail.refetch} /> : !data ? null : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Etapa" className="input-v2 max-w-[220px]" value={data.stageId ?? ''} onChange={(event) => event.target.value && onRequestMove(data.id, event.target.value)} disabled={data.status === 'HIRED'}>
              {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={() => run(() => jobsApi.favorite(data.id, !data.favorite))} aria-pressed={data.favorite}>
              <Star size={16} className={data.favorite ? 'fill-amber-400 text-amber-500' : ''} aria-hidden="true" /> {data.favorite ? 'Favorito' : 'Favoritar'}
            </Button>
            {data.score !== null && <Pill tone="info">{data.score} pts</Pill>}
            {data.evaluationScore !== null && <Pill tone="brand">Nota {data.evaluationScore}/5</Pill>}
            {data.knockedOut && <Pill tone="danger">Fora do critério</Pill>}
          </div>

          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-purple-600 text-purple-700' : 'border-transparent text-fg-sub hover:text-fg'}`}>{label}</button>
            ))}
          </div>

          {tab === 'summary' && (
            <div className="space-y-5">
              <ul className="space-y-1.5 text-sm">
                {data.candidate?.email && <li className="flex items-center gap-2"><Mail size={15} aria-hidden="true" /><a className="underline" href={`mailto:${data.candidate.email}`}>{data.candidate.email}</a></li>}
                {data.candidate?.phone && <li className="flex items-center gap-2"><Phone size={15} aria-hidden="true" /><a className="underline" href={`https://wa.me/${data.candidate.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{data.candidate.phone}</a></li>}
                {data.linkedinUrl && <li className="flex items-center gap-2"><ExternalLink size={15} aria-hidden="true" /><a className="underline" href={data.linkedinUrl} target="_blank" rel="noreferrer noopener">LinkedIn</a></li>}
              </ul>
              {data.resumeAvailable && <Button variant="outline" onClick={download}><Download size={16} aria-hidden="true" /> Baixar currículo</Button>}

              <div className="space-y-2">
                <p className="text-sm font-medium">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 && <p className="text-sm text-fg-sub">Crie tags em &quot;Funil e tags&quot;.</p>}
                  {tags.map((tag) => (
                    <button key={tag.id} type="button" disabled={busy} aria-pressed={tagIds.has(tag.id)} className={`rounded-full ${tagIds.has(tag.id) ? 'ring-2 ring-purple-400' : 'opacity-60'}`}
                      onClick={() => run(() => jobsApi.setTags(data.id, tagIds.has(tag.id) ? [...tagIds].filter((id) => id !== tag.id) : [...tagIds, tag.id]))}>
                      <TagChip name={tag.name} color={tag.color} />
                    </button>
                  ))}
                </div>
              </div>

              {data.rejectionReason && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><strong>Motivo da reprovação:</strong> {data.rejectionReason}</p>}
              {data.knockoutReason && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><strong>Critério:</strong> {data.knockoutReason}</p>}

              {data.answers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Respostas do formulário</p>
                  <dl className="space-y-2">
                    {data.answers.map((answer) => (
                      <div key={answer.questionId} className={`rounded-lg border p-3 text-sm ${answer.knockedOut ? 'border-rose-300 bg-rose-50' : 'border-border'}`}>
                        <dt className="text-fg-sub">{answer.label}</dt>
                        <dd className="mt-0.5 flex flex-wrap items-center justify-between gap-2 font-medium"><span className="whitespace-pre-line">{answer.value.replace(/\|/g, ', ')}</span>{answer.points !== 0 && <Pill tone="info">{answer.points > 0 ? '+' : ''}{answer.points} pts</Pill>}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {data.coverLetter && <div><p className="text-sm font-medium">Apresentação</p><p className="mt-1 whitespace-pre-line rounded-lg bg-bg-sub p-3 text-sm">{data.coverLetter}</p></div>}
            </div>
          )}

          {tab === 'evaluation' && (
            <div className="space-y-4">
              {data.criteria.length === 0 ? <p className="text-sm text-fg-sub">Esta vaga não tem critérios de avaliação. Adicione-os em Editar vaga → Avaliação.</p> : (
                <>
                  <p className="text-sm text-fg-sub">Sua avaliação (1 a 5). A nota geral é a média ponderada de todos os avaliadores.</p>
                  {data.criteria.map((criterion) => {
                    const current = ratings[criterion.id];
                    return (
                      <div key={criterion.id} className="space-y-2 rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between"><p className="text-sm font-medium">{criterion.name}</p><span className="text-xs text-fg-sub">peso {criterion.weight}</span></div>
                        <div className="flex gap-1" role="radiogroup" aria-label={criterion.name}>
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button key={score} type="button" role="radio" aria-checked={current?.score === score} onClick={() => setRatings({ ...ratings, [criterion.id]: { score, comment: current?.comment ?? '' } })}
                              className={`h-9 w-9 rounded-md border text-sm font-medium ${current?.score === score ? 'border-purple-600 bg-purple-600 text-white' : 'border-border hover:bg-bg-sub'}`}>{score}</button>
                          ))}
                        </div>
                        <input className={inputClass} placeholder="Comentário (opcional)" value={current?.comment ?? ''} maxLength={500} onChange={(event) => setRatings({ ...ratings, [criterion.id]: { score: current?.score ?? 3, comment: event.target.value } })} />
                      </div>
                    );
                  })}
                  <Button isLoading={busy} disabled={Object.keys(ratings).length === 0}
                    onClick={() => run(() => jobsApi.saveEvaluations(data.id, Object.entries(ratings).map(([criterionId, value]) => ({ criterionId, score: value.score, comment: value.comment || undefined }))), 'Avaliação salva.')}>Salvar avaliação</Button>
                </>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-3">
              <Field label="Nova nota"><textarea className={`${inputClass} min-h-24`} maxLength={3000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
              <Button isLoading={busy} disabled={!note.trim()} onClick={() => run(async () => { await jobsApi.addNote(data.id, note); setNote(''); }, 'Nota adicionada.')}>Adicionar nota</Button>
              <ul className="space-y-2">
                {data.notes.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="whitespace-pre-line">{item.body}</p>
                    <p className="mt-1 text-xs text-fg-sub">{item.authorName ?? 'Usuário'} · {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
                  </li>
                ))}
                {data.notes.length === 0 && <li className="text-sm text-fg-sub">Nenhuma nota ainda.</li>}
              </ul>
            </div>
          )}

          {tab === 'interviews' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data e hora" required><input type="datetime-local" className={inputClass} value={interview.scheduledAt} onChange={(event) => setInterview({ ...interview, scheduledAt: event.target.value })} /></Field>
                <Field label="Tipo"><input className={inputClass} value={interview.kind} onChange={(event) => setInterview({ ...interview, kind: event.target.value })} /></Field>
                <Field label="Local / link"><input className={inputClass} value={interview.location} onChange={(event) => setInterview({ ...interview, location: event.target.value })} /></Field>
                <Field label="Entrevistador"><input className={inputClass} value={interview.interviewer} onChange={(event) => setInterview({ ...interview, interviewer: event.target.value })} /></Field>
              </div>
              <Button isLoading={busy} disabled={!interview.scheduledAt}
                onClick={() => run(async () => { await jobsApi.addInterview(data.id, { ...interview, scheduledAt: new Date(interview.scheduledAt).toISOString() }); setInterview({ scheduledAt: '', kind: 'Entrevista', location: '', interviewer: '' }); }, 'Entrevista agendada.')}>Agendar entrevista</Button>
              <ul className="space-y-2">
                {data.interviews.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium">{item.kind} · {new Date(item.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                      <p className="text-fg-sub">{[item.location, item.interviewer].filter(Boolean).join(' · ') || 'Sem detalhes'}</p>
                    </div>
                    <button type="button" className="btn-icon text-rose-600" aria-label="Cancelar entrevista" onClick={() => run(() => jobsApi.removeInterview(data.id, item.id))}><Trash2 size={15} /></button>
                  </li>
                ))}
                {data.interviews.length === 0 && <li className="text-sm text-fg-sub">Nenhuma entrevista agendada.</li>}
              </ul>
            </div>
          )}

          {tab === 'history' && (
            <ol className="space-y-3 border-l border-border pl-4">
              {data.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <p className="font-medium">{EVENT_LABEL[event.type] ?? event.type}{event.toStage ? ` → ${event.toStage}` : ''}</p>
                  {event.note && <p className="text-fg-sub">{event.note}</p>}
                  <p className="text-xs text-fg-sub">{new Date(event.createdAt).toLocaleString('pt-BR')}</p>
                </li>
              ))}
              {data.events.length === 0 && <li className="text-sm text-fg-sub">Sem histórico.</li>}
            </ol>
          )}
        </div>
      )}
    </Drawer>
  );
}
