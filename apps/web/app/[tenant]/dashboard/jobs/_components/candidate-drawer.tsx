'use client';

import { Building2, CalendarPlus, Download, ExternalLink, Mail, MailCheck, Phone, Star, Trash2, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, Drawer } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { safeHref } from '@/app/lib/text';
import { jobsApi } from '../jobs-api';
import type { Pipeline, Tag } from '../types';
import { Field, Pill, TagChip, inputClass } from './bits';
import { CandidateDocuments } from './candidate-documents';
import { InterviewDialog } from './interview-dialog';
import { AssessmentsPanel, FeedbackDialog, FeedbackSummary, OffersPanel, ResponseBadge, SlotOfferDialog, SlotOffersList } from './candidate-process';
import { processApi } from '../process-api';
import { meetingLabel } from '../../management/agenda/meeting-link';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { ROLE_ACCESS, roleIn } from '@/app/lib/role-access';

const TABS = [['summary', 'Resumo'], ['evaluation', 'Avaliação'], ['notes', 'Notas'], ['interviews', 'Entrevistas'], ['assessments', 'Testes'], ['offer', 'Proposta'], ['history', 'Histórico'], ['documents', 'Documentos']] as const;
type TabKey = (typeof TABS)[number][0];
const EVENT_LABEL: Record<string, string> = { APPLIED: 'Candidatura recebida', STAGE_CHANGED: 'Mudou de etapa', REJECTED: 'Reprovado', HIRED: 'Contratado', EVALUATED: 'Avaliado', INTERVIEW: 'Entrevista', INTERVIEW_EMAIL_SENT: 'Convite de entrevista enviado', INTERVIEW_CANCELED: 'Entrevista cancelada', INTERVIEW_CANCEL_EMAIL_SENT: 'Cancelamento avisado ao candidato', INTERVIEW_REMINDER_SENT: 'Lembrete de entrevista enviado', INTERVIEW_CONFIRMED: 'Candidato confirmou a entrevista', INTERVIEW_DECLINED: 'Candidato não pode na entrevista', INTERVIEW_SLOTS_SENT: 'Horários oferecidos', INTERVIEW_FEEDBACK: 'Avaliação de entrevista', OFFER_CREATED: 'Proposta criada', OFFER_APPROVED: 'Proposta aprovada', OFFER_RETURNED: 'Proposta devolvida', OFFER_SENT: 'Proposta enviada', OFFER_ACCEPTED: 'Proposta aceita', OFFER_DECLINED: 'Proposta recusada', OFFER_CANCELED: 'Proposta cancelada', ASSESSMENT_SENT: 'Teste enviado', ASSESSMENT_COMPLETED: 'Teste respondido', REJECTION_EMAIL_SENT: 'Feedback de reprovação enviado' };

const fail = (cause: unknown, fallback: string) => toast.error(cause instanceof ApiError ? cause.message : fallback);

export function CandidateDrawer({
  applicationId, pipeline, tags, onClose, onChanged, onRequestMove,
}: {
  applicationId: string | null; pipeline: Pipeline | undefined; tags: Tag[];
  onClose: () => void; onChanged: () => void; onRequestMove: (applicationId: string, stageId: string) => void;
}) {
  const askConfirm = useConfirm();
  const { user } = useAuth();
  const detail = useQuery(() => jobsApi.application(applicationId ?? ''), [applicationId], { enabled: Boolean(applicationId) });
  const [tab, setTab] = useState<TabKey>('summary');
  const [ratings, setRatings] = useState<Record<string, { score: number; comment: string }>>({});
  const [note, setNote] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [offeringSlots, setOfferingSlots] = useState(false);
  const [slotsKey, setSlotsKey] = useState(0);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const data = detail.data;
  const role = String(user?.profile ?? '').toUpperCase();
  const canSeeDocuments = roleIn(ROLE_ACCESS.recruitmentConduct, role);
  // Gestor avalia entrevistas e ve testes/propostas; quem conduz (RH) agenda, envia testes e monta proposta.
  const canConduct = roleIn(ROLE_ACCESS.recruitmentConduct, role);
  const feedback = useQuery(() => processApi.feedback(applicationId ?? ''), [applicationId], { enabled: Boolean(applicationId) && tab === 'interviews' });

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
            {data.score !== null && <Pill tone={data.score >= 70 ? "success" : data.score >= 40 ? "warning" : "danger"}>Triagem {data.score}%</Pill>}
            {data.evaluationScore !== null && <Pill tone="brand">Nota {data.evaluationScore}/5</Pill>}{(data as { evaluationsHidden?: boolean }).evaluationsHidden && <span className="text-xs text-fg-sub">Avaliação cega: as notas dos colegas aparecem depois que você avaliar todos os critérios.</span>}
            {data.knockedOut && <Pill tone="danger">Fora do critério</Pill>}
          </div>

          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.filter(([key]) => key !== 'documents' || canSeeDocuments).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${tab === key ? 'border-purple-600 text-purple-700' : 'border-transparent text-fg-sub hover:text-fg'}`}>{label}{key === 'documents' && <span className="ml-1 rounded-full bg-purple-100 px-1.5 text-[10px] font-bold text-purple-700">link</span>}</button>
            ))}
          </div>

          {tab === 'summary' && (
            <div className="space-y-5">
              <ul className="space-y-1.5 text-sm">
                {data.candidate?.email && <li className="flex items-center gap-2"><Mail size={15} aria-hidden="true" /><a className="underline" href={`mailto:${data.candidate.email}`}>{data.candidate.email}</a></li>}
                {data.candidate?.phone && <li className="flex items-center gap-2"><Phone size={15} aria-hidden="true" /><a className="underline" href={`https://wa.me/${data.candidate.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{data.candidate.phone}</a></li>}
                {safeHref(data.linkedinUrl) && <li className="flex items-center gap-2"><ExternalLink size={15} aria-hidden="true" /><a className="underline" href={safeHref(data.linkedinUrl)} target="_blank" rel="noreferrer noopener">LinkedIn</a></li>}
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
                        <dd className="mt-0.5 flex flex-wrap items-center justify-between gap-2 font-medium"><span className="whitespace-pre-line">{answer.value.replace(/\|/g, ', ')}</span>{answer.points > 0 && <Pill tone="info">{answer.points}% da pergunta</Pill>}</dd>
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
                        <input aria-label="Comentário opcional sobre este critério" className={inputClass} placeholder="Comentário (opcional)" value={current?.comment ?? ''} maxLength={500} onChange={(event) => setRatings({ ...ratings, [criterion.id]: { score: current?.score ?? 3, comment: event.target.value } })} />
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
              {canConduct && data.status !== 'HIRED' && data.status !== 'REJECTED' && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setScheduling(true)} className="inline-flex items-center gap-2"><CalendarPlus size={16} aria-hidden="true" /> Agendar entrevista</Button>
                  <Button variant="outline" onClick={() => setOfferingSlots(true)}>Oferecer horários</Button>
                </div>
              )}
              <SlotOffersList applicationId={data.id} refreshKey={slotsKey} onChanged={() => detail.refetch()} />
              {(data.job.interviewGuide?.length ?? 0) > 0 && (
                <details className="rounded-xl border border-border bg-bg-sub/50 p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-fg">Roteiro da entrevista ({data.job.interviewGuide!.length})</summary>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-sub">{data.job.interviewGuide!.map((question, index) => <li key={index}>{question}</li>)}</ol>
                </details>
              )}
              <ul className="space-y-2">
                {data.interviews.map((item) => {
                  const future = new Date(item.scheduledAt).getTime() > Date.now();
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-2 rounded-xl border border-border p-3 text-sm">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-fg">{new Date(item.scheduledAt).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}{item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-fg-sub">
                          {item.mode === 'ONLINE' ? <Pill tone="info"><Video size={12} aria-hidden="true" /> Online</Pill> : item.mode === 'PRESENCIAL' ? <Pill tone="brand"><Building2 size={12} aria-hidden="true" /> Presencial</Pill> : <Pill>{item.kind}</Pill>}
                          {item.interviewerRole && <span>com {item.interviewerRole === 'GESTOR' ? 'o gestor' : 'o RH'}{item.interviewer ? ` (${item.interviewer})` : ''}</span>}
                          {!item.interviewerRole && item.interviewer && <span>{item.interviewer}</span>}
                        </p>
                        {item.meetingUrl && <a href={item.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"><Video size={13} aria-hidden="true" /> Entrar · {meetingLabel(item.meetingUrl)}</a>}
                        {item.location && <p className="break-words text-fg-sub">{item.location}</p>}
                        {item.notifiedAt ? <p className="flex items-center gap-1 text-xs text-emerald-700"><MailCheck size={13} aria-hidden="true" /> Convite enviado em {new Date(item.notifiedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p> : item.mode ? <p className="text-xs text-amber-700">Candidato não foi avisado por e-mail.</p> : null}
                        <ResponseBadge interview={item} />
                        <FeedbackSummary items={(feedback.data?.items ?? []).filter((row) => row.interviewId === item.id)} />
                        <button type="button" className="inline-flex min-h-9 items-center text-xs font-semibold text-brand-700 hover:underline" onClick={() => setFeedbackFor(item.id)}>{(feedback.data?.items ?? []).some((row) => row.interviewId === item.id && row.userId === user?.id) ? 'Editar minha avaliação' : 'Avaliar entrevista'}</button>
                      </div>
                      <button type="button" className="btn-icon text-rose-600" aria-label="Cancelar entrevista" title={item.notifiedAt && future ? 'Cancelar e avisar o candidato' : 'Cancelar entrevista'}
                        onClick={async () => { if (await askConfirm({ title: 'Cancelar entrevista', description: item.notifiedAt && future ? 'O candidato recebe um e-mail avisando do cancelamento.' : 'Esta entrevista será cancelada.', confirmText: 'Cancelar entrevista' })) run(() => jobsApi.removeInterview(data.id, item.id), 'Entrevista cancelada.'); }}><Trash2 size={15} /></button>
                    </li>
                  );
                })}
                {data.interviews.length === 0 && <li className="text-sm text-fg-sub">Nenhuma entrevista agendada. Ao mover o candidato para a etapa de entrevista, o agendamento abre sozinho.</li>}
              </ul>
              {(feedback.data?.hidden ?? 0) > 0 && <p className="text-xs text-fg-sub">{feedback.data!.hidden} avaliação(ões) de colegas aparecem depois que você enviar a sua.</p>}
              <SlotOfferDialog isOpen={offeringSlots} applicationId={data.id} candidateName={data.candidate?.name ?? 'Candidato'} onClose={() => setOfferingSlots(false)} onDone={() => { setOfferingSlots(false); setSlotsKey((key) => key + 1); detail.refetch(); onChanged(); }} />
              <FeedbackDialog isOpen={Boolean(feedbackFor)} applicationId={data.id} interviewId={feedbackFor} criteria={data.criteria.map((criterion) => ({ id: criterion.id, name: criterion.name }))} guide={data.job.interviewGuide ?? []}
                mine={(feedback.data?.items ?? []).find((row) => row.interviewId === feedbackFor && row.userId === user?.id) ?? null}
                onClose={() => setFeedbackFor(null)} onSaved={() => { setFeedbackFor(null); feedback.refetch(); detail.refetch(); }} />
              <InterviewDialog isOpen={scheduling} applicationId={data.id} candidateName={data.candidate?.name ?? 'Candidato'} onClose={() => setScheduling(false)}
                onSubmit={async (payload) => {
                  try {
                    const result = await jobsApi.addInterview(data.id, payload);
                    if (!result.emailRequested) toast.success('Entrevista agendada.');
                    else if (result.emailed) toast.success('Entrevista agendada e convite enviado por e-mail.');
                    else toast.warning('Entrevista agendada, mas o e-mail não saiu. Avise o candidato por telefone.');
                    setScheduling(false); detail.refetch(); onChanged();
                  } catch (cause) { fail(cause, 'Não foi possível agendar a entrevista.'); }
                }} />
            </div>
          )}

          {tab === 'assessments' && <AssessmentsPanel applicationId={data.id} canSend={canConduct} closed={data.status === 'HIRED' || data.status === 'REJECTED'} onChanged={() => detail.refetch()} />}

          {tab === 'offer' && <OffersPanel applicationId={data.id} jobTitle={data.job.title} canCreate={canConduct} closed={data.status === 'HIRED' || data.status === 'REJECTED'} onChanged={() => { detail.refetch(); onChanged(); }} />}

          {tab === 'documents' && canSeeDocuments && <CandidateDocuments applicationId={data.id} onChanged={onChanged} />}

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
