'use client';

import { Building2, CalendarClock, CheckCircle2, Clock, Plus, Send, Trash2, Video, Wand2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, Modal } from '@/app/components/ui';
import { useQuery } from '@/app/hooks/use-data';
import { ApiError } from '@/app/lib/api';
import { meetingLabel, normalizeMeetingInput } from '../../management/agenda/meeting-link';
import { freeMeetingLink, processApi, RECOMMENDATION_LABEL, type AssessmentResult, type InterviewFeedbackItem, type Offer, type Recommendation } from '../process-api';
import { Field, Pill, inputClass } from './bits';

const fail = (cause: unknown, fallback: string) => toast.error(cause instanceof ApiError ? cause.message : fallback);
const dt = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');
const brl = (value: number | null | undefined) => (value === null || value === undefined ? '' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

function localInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
/** Proximos dias uteis as 10h, para comecar a lista de horarios. */
function nextBusinessSlots(count: number) {
  const out: string[] = [];
  const day = new Date();
  while (out.length < count) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    const slot = new Date(day); slot.setHours(10, 0, 0, 0);
    out.push(localInput(slot));
  }
  return out;
}

/** Botao "Gerar link gratis": sala do Jitsi Meet, sem conta e sem custo. */
export function FreeLinkButton({ onLink }: { onLink: (url: string) => void }) {
  return (
    <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-brand-700 hover:bg-bg-sub" onClick={() => { onLink(freeMeetingLink()); toast.success('Link de reunião criado (Jitsi Meet, gratuito). Funciona no navegador e no celular, sem cadastro.'); }}>
      <Wand2 size={14} aria-hidden="true" /> Gerar link grátis
    </button>
  );
}

// ---------- autoagendamento ----------
export function SlotOfferDialog({ isOpen, applicationId, candidateName, onClose, onDone }: { isOpen: boolean; applicationId: string; candidateName: string; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'ONLINE' | 'PRESENCIAL'>('ONLINE');
  const [slots, setSlots] = useState<string[]>(() => nextBusinessSlots(3));
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [role, setRole] = useState<'RH' | 'GESTOR'>('RH');
  const [interviewer, setInterviewer] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState(3);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) { setSlots(nextBusinessSlots(3)); setMessage(''); } }, [isOpen]);

  const meeting = normalizeMeetingInput(link);
  const valid = slots.filter(Boolean).map((value) => new Date(value)).filter((date) => !Number.isNaN(date.getTime()));
  const problem = !valid.length ? 'Adicione ao menos um horário.'
    : valid.some((date) => date.getTime() < Date.now() + 3_600_000) ? 'Os horários precisam ser daqui a pelo menos 1 hora.'
    : mode === 'PRESENCIAL' && !location.trim() ? 'Informe o endereço.'
    : mode === 'ONLINE' && (!meeting.ok || !meeting.value) ? (meeting.error ?? 'Cole o link da reunião ou gere um grátis.') : null;

  async function submit() {
    if (problem || busy) return;
    setBusy(true);
    try {
      const result = await processApi.createSlotOffer(applicationId, {
        slots: valid.map((date) => date.toISOString()), mode, durationMinutes: duration, location: mode === 'PRESENCIAL' ? location.trim() : undefined,
        meetingUrl: mode === 'ONLINE' ? meeting.value ?? undefined : undefined, interviewerRole: role, interviewer: interviewer.trim() || undefined,
        candidateMessage: message.trim() || undefined, validDays: days,
      });
      if (result.emailed) toast.success(`${candidateName} recebeu os horários por e-mail. Quando escolher, a entrevista entra na sua Agenda.`); else toast.warning('Horários salvos, mas o e-mail não saiu. Confira o e-mail do candidato.');
      onDone();
    } catch (cause) { fail(cause, 'Não foi possível enviar os horários.'); } finally { setBusy(false); }
  }

  const segment = (on: boolean) => `flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${on ? 'bg-brand-600 text-white shadow-sm' : 'text-fg-sub hover:bg-bg-sub'}`;
  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title="Oferecer horários" description={`${candidateName} recebe a lista por e-mail e escolhe o melhor horário. Horários que baterem com outro compromisso seu na Agenda somem da lista.`} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Formato" className="flex gap-1 rounded-xl border border-border bg-bg-sub/60 p-1">
          <button type="button" role="radio" aria-checked={mode === 'ONLINE'} className={segment(mode === 'ONLINE')} onClick={() => setMode('ONLINE')}><Video size={16} aria-hidden="true" /> Online</button>
          <button type="button" role="radio" aria-checked={mode === 'PRESENCIAL'} className={segment(mode === 'PRESENCIAL')} onClick={() => setMode('PRESENCIAL')}><Building2 size={16} aria-hidden="true" /> Presencial</button>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-fg">Horários (até 8)</legend>
          {slots.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <input type="datetime-local" aria-label={`Horário ${index + 1}`} className={inputClass} value={value} min={localInput(new Date())} onChange={(event) => setSlots(slots.map((item, i) => (i === index ? event.target.value : item)))} />
              <button type="button" className="btn-icon text-rose-600" aria-label={`Remover horário ${index + 1}`} disabled={slots.length === 1} onClick={() => setSlots(slots.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
            </div>
          ))}
          {slots.length < 8 && <button type="button" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand-700" onClick={() => setSlots([...slots, ''])}><Plus size={15} aria-hidden="true" /> Adicionar horário</button>}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Duração"><select className={inputClass} value={duration} onChange={(event) => setDuration(Number(event.target.value))}>{[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
          <Field label="Prazo para escolher"><select className={inputClass} value={days} onChange={(event) => setDays(Number(event.target.value))}>{[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} dia{d > 1 ? 's' : ''}</option>)}</select></Field>
        </div>
        {mode === 'ONLINE' ? (
          <Field label="Link da reunião" required hint={meeting.ok ? (meeting.value ? meetingLabel(meeting.value) : 'Teams, Meet, Zoom ou gere um link grátis.') : meeting.error ?? undefined}>
            <div className="flex flex-wrap items-center gap-2"><input type="url" className={`${inputClass} min-w-0 flex-1`} value={link} placeholder="https://..." onChange={(event) => setLink(event.target.value)} /><FreeLinkButton onLink={setLink} /></div>
          </Field>
        ) : (
          <Field label="Endereço" required><textarea className={`${inputClass} min-h-[64px]`} maxLength={300} value={location} onChange={(event) => setLocation(event.target.value)} /></Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Entrevista com"><select className={inputClass} value={role} onChange={(event) => setRole(event.target.value as 'RH' | 'GESTOR')}><option value="RH">RH</option><option value="GESTOR">Gestor da área</option></select></Field>
          <Field label="Nome de quem entrevista"><input className={inputClass} maxLength={120} value={interviewer} onChange={(event) => setInterviewer(event.target.value)} /></Field>
        </div>
        <Field label="Recado ao candidato" hint="Opcional."><textarea className={`${inputClass} min-h-[56px]`} maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
        {problem && <p className="text-sm text-rose-700" role="alert">{problem}</p>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button onClick={submit} isLoading={busy} disabled={Boolean(problem)}><Send size={15} aria-hidden="true" /> Enviar horários</Button></div>
      </div>
    </Modal>
  );
}

export function SlotOffersList({ applicationId, refreshKey, onChanged }: { applicationId: string; refreshKey: number; onChanged: () => void }) {
  const offers = useQuery(() => processApi.slotOffers(applicationId), [applicationId, refreshKey]);
  const pending = (offers.data ?? []).filter((offer) => offer.status === 'PENDING' && new Date(offer.expiresAt).getTime() > Date.now());
  if (!pending.length) return null;
  return (
    <ul className="space-y-2">
      {pending.map((offer) => (
        <li key={offer.id} className="flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          <div><p className="flex items-center gap-1.5 font-semibold text-amber-900"><Clock size={14} aria-hidden="true" /> Aguardando o candidato escolher ({offer.slots.length} horário{offer.slots.length > 1 ? 's' : ''})</p><p className="text-xs text-amber-800">Até {dt(offer.expiresAt)} · {offer.mode === 'ONLINE' ? 'online' : 'presencial'}</p></div>
          <Button size="sm" variant="ghost" onClick={async () => { try { await processApi.cancelSlotOffer(applicationId, offer.id); toast.success('Horários cancelados.'); offers.refetch(); onChanged(); } catch (cause) { fail(cause, 'Não foi possível cancelar.'); } }}>Cancelar</Button>
        </li>
      ))}
    </ul>
  );
}

/** Situacao da presenca: confirmou, nao pode (com motivo) ou ainda nao respondeu. */
export function ResponseBadge({ interview }: { interview: { candidateResponse?: string | null; declineReason?: string | null; respondedAt?: string | null; notifiedAt?: string | null; reminderSentAt?: string | null } }) {
  if (interview.candidateResponse === 'CONFIRMED') return <p className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} aria-hidden="true" /> Candidato confirmou presença{interview.respondedAt ? ` em ${dt(interview.respondedAt)}` : ''}</p>;
  if (interview.candidateResponse === 'DECLINED') return <p className="flex items-start gap-1 text-xs font-semibold text-rose-700"><XCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> Candidato não pode{interview.declineReason ? `: ${interview.declineReason}` : ''}. Ofereça outros horários.</p>;
  if (interview.notifiedAt) return <p className="text-xs text-fg-sub">Aguardando confirmação do candidato.{interview.reminderSentAt ? ' Lembrete enviado.' : ' O lembrete sai 24h antes.'}</p>;
  return null;
}

// ---------- avaliacao por entrevistador ----------
export function FeedbackDialog({ isOpen, applicationId, interviewId, criteria, guide, mine, onClose, onSaved }: {
  isOpen: boolean; applicationId: string; interviewId: string | null; criteria: { id: string; name: string }[]; guide: string[]; mine?: InterviewFeedbackItem | null; onClose: () => void; onSaved: () => void;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | ''>('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setScores(Object.fromEntries((mine?.ratings ?? []).map((item) => [item.criterionId, item.score])));
    setRecommendation(mine?.recommendation ?? '');
    setNotes(mine?.notes ?? '');
  }, [isOpen, mine]);

  async function submit() {
    if (!interviewId || !recommendation || busy) return;
    setBusy(true);
    try {
      await processApi.saveFeedback(applicationId, interviewId, { ratings: Object.entries(scores).map(([criterionId, score]) => ({ criterionId, score })), recommendation, notes: notes.trim() || undefined });
      toast.success('Avaliação salva.'); onSaved();
    } catch (cause) { fail(cause, 'Não foi possível salvar a avaliação.'); } finally { setBusy(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title="Avaliar entrevista" description="Sua avaliação fica registrada com seu nome. Você só vê a dos colegas depois de enviar a sua." maxWidth="max-w-xl">
      <div className="space-y-4">
        {guide.length > 0 && (
          <details className="rounded-xl border border-border bg-bg-sub/50 p-3 text-sm" open={!mine}>
            <summary className="cursor-pointer font-semibold text-fg">Roteiro da entrevista ({guide.length} perguntas)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-fg-sub">{guide.map((question, index) => <li key={index}>{question}</li>)}</ol>
          </details>
        )}
        {criteria.length > 0 ? criteria.map((criterion) => (
          <div key={criterion.id}>
            <p className="mb-1 text-sm font-medium text-fg">{criterion.name}</p>
            <div className="flex gap-1" role="radiogroup" aria-label={criterion.name}>
              {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={scores[criterion.id] === n} className={`h-10 w-10 rounded-lg border text-sm font-semibold ${scores[criterion.id] === n ? 'border-brand-600 bg-brand-600 text-white' : 'border-border text-fg-sub hover:bg-bg-sub'}`} onClick={() => setScores({ ...scores, [criterion.id]: n })}>{n}</button>)}
            </div>
          </div>
        )) : <p className="text-sm text-fg-sub">Esta vaga não tem critérios de avaliação. Cadastre em Editar vaga para dar notas por critério.</p>}
        <div>
          <p className="mb-1 text-sm font-medium text-fg">Sua recomendação <span className="text-rose-600">*</span></p>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Recomendação">
            {(Object.keys(RECOMMENDATION_LABEL) as Recommendation[]).map((key) => (
              <button key={key} type="button" role="radio" aria-checked={recommendation === key} onClick={() => setRecommendation(key)}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${recommendation === key ? (key.endsWith('YES') ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-rose-600 bg-rose-50 text-rose-800') : 'border-border text-fg-sub hover:bg-bg-sub'}`}>{RECOMMENDATION_LABEL[key]}</button>
            ))}
          </div>
        </div>
        <Field label="Comentários" hint="Pontos fortes, pontos de atenção, o que perguntar na próxima etapa."><textarea className={`${inputClass} min-h-[96px]`} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button onClick={submit} isLoading={busy} disabled={!recommendation}>Salvar avaliação</Button></div>
      </div>
    </Modal>
  );
}

export function FeedbackSummary({ items }: { items: InterviewFeedbackItem[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg bg-bg-sub/60 px-3 py-2 text-xs">
          <p className="font-semibold text-fg">{item.authorName ?? 'Entrevistador'}: <span className={item.recommendation.endsWith('YES') ? 'text-emerald-700' : 'text-rose-700'}>{RECOMMENDATION_LABEL[item.recommendation]}</span>{item.average ? ` · média ${item.average}/5` : ''}</p>
          {item.notes && <p className="mt-0.5 whitespace-pre-wrap text-fg-sub">{item.notes}</p>}
        </li>
      ))}
    </ul>
  );
}

// ---------- proposta ----------
const OFFER_STATUS: Record<string, { label: string; tone: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }> = {
  PENDING_APPROVAL: { label: 'Aguardando aprovação', tone: 'warning' }, APPROVED: { label: 'Aprovada, pronta para enviar', tone: 'info' }, SENT: { label: 'Enviada ao candidato', tone: 'brand' },
  ACCEPTED: { label: 'Aceita pelo candidato', tone: 'success' }, DECLINED: { label: 'Recusada pelo candidato', tone: 'danger' }, CANCELED: { label: 'Cancelada', tone: 'default' }, EXPIRED: { label: 'Vencida', tone: 'default' },
};
const CONTRACTS: [string, string][] = [['CLT', 'CLT'], ['PJ', 'PJ'], ['ESTAGIO', 'Estágio'], ['TEMPORARIO', 'Temporário'], ['APRENDIZ', 'Jovem aprendiz'], ['AUTONOMO', 'Autônomo']];

export function OffersPanel({ applicationId, jobTitle, canCreate, closed, onChanged }: { applicationId: string; jobTitle: string; canCreate: boolean; closed: boolean; onChanged: () => void }) {
  const offers = useQuery(() => processApi.offers(applicationId), [applicationId]);
  const [form, setForm] = useState({ positionTitle: jobTitle, contractType: 'CLT', salary: '', startDate: '', workSchedule: '', benefits: '', message: '', validDays: 7 });
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const items = offers.data ?? [];
  const active = items.find((offer) => ['PENDING_APPROVAL', 'APPROVED', 'SENT'].includes(offer.status));

  async function act(id: string, action: () => Promise<unknown>, success: string) {
    setBusy(id);
    try { await action(); toast.success(success); offers.refetch(); onChanged(); } catch (cause) { fail(cause, 'Não foi possível concluir.'); } finally { setBusy(null); }
  }

  async function create() {
    const salary = form.salary.trim() ? Number(form.salary.replace(/\./g, '').replace(',', '.')) : null;
    if (salary !== null && !Number.isFinite(salary)) { toast.error('Salário inválido.'); return; }
    await act('new', async () => {
      const result = await processApi.createOffer(applicationId, { positionTitle: form.positionTitle.trim() || undefined, contractType: form.contractType, salary, startDate: form.startDate || null, workSchedule: form.workSchedule.trim() || null, benefits: form.benefits.split('\n').map((line) => line.trim()).filter(Boolean), message: form.message.trim() || null, validDays: form.validDays });
      setCreating(false);
      if (result.status === 'PENDING_APPROVAL') toast.info('A proposta foi para aprovação. Quem aprova recebe um aviso.');
    }, 'Proposta criada.');
  }

  return (
    <div className="space-y-4">
      {canCreate && !closed && !creating && <Button onClick={() => setCreating(true)} className="inline-flex items-center gap-2"><Plus size={16} aria-hidden="true" /> {active ? 'Nova versão da proposta' : 'Montar proposta'}</Button>}
      {creating && (
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cargo" className="sm:col-span-2"><input className={inputClass} maxLength={160} value={form.positionTitle} onChange={(event) => setForm({ ...form, positionTitle: event.target.value })} /></Field>
            <Field label="Contrato" required><select className={inputClass} value={form.contractType} onChange={(event) => setForm({ ...form, contractType: event.target.value })}>{CONTRACTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
            <Field label="Salário mensal (R$)"><input inputMode="decimal" className={inputClass} placeholder="3.500,00" value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} /></Field>
            <Field label="Início"><input type="date" className={inputClass} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
            <Field label="Validade"><select className={inputClass} value={form.validDays} onChange={(event) => setForm({ ...form, validDays: Number(event.target.value) })}>{[3, 5, 7, 10, 15].map((d) => <option key={d} value={d}>{d} dias</option>)}</select></Field>
            <Field label="Jornada" className="sm:col-span-2"><input className={inputClass} maxLength={200} placeholder="Seg a sex, 9h às 18h" value={form.workSchedule} onChange={(event) => setForm({ ...form, workSchedule: event.target.value })} /></Field>
            <Field label="Benefícios (um por linha)" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[80px]`} value={form.benefits} placeholder={'Vale-refeição R$ 35/dia\nPlano de saúde'} onChange={(event) => setForm({ ...form, benefits: event.target.value })} /></Field>
            <Field label="Mensagem ao candidato" className="sm:col-span-2"><textarea className={`${inputClass} min-h-[64px]`} maxLength={3000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button><Button onClick={create} isLoading={busy === 'new'}>Salvar proposta</Button></div>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((offer: Offer) => {
          const status = offer.status === 'SENT' && offer.expiresAt && new Date(offer.expiresAt).getTime() < Date.now() ? 'EXPIRED' : offer.status;
          const meta = OFFER_STATUS[status] ?? { label: status, tone: 'default' as const };
          return (
            <li key={offer.id} className="space-y-2 rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-fg">{offer.positionTitle}</p><Pill tone={meta.tone}>{meta.label}</Pill></div>
              <p className="text-fg-sub">{CONTRACTS.find(([value]) => value === offer.contractType)?.[1] ?? offer.contractType}{offer.salary ? ` · ${brl(offer.salary)}` : ''}{offer.startDate ? ` · início ${new Date(offer.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}` : ''}</p>
              {offer.benefits.length > 0 && <p className="text-xs text-fg-sub">Benefícios: {offer.benefits.join(' · ')}</p>}
              <p className="text-xs text-fg-mut">Criada por {offer.createdByName ?? '—'} em {dt(offer.createdAt)}{offer.approvedByName ? ` · aprovada por ${offer.approvedByName}` : ''}{offer.sentAt ? ` · enviada ${dt(offer.sentAt)}` : ''}{offer.viewedAt ? ` · candidato abriu ${dt(offer.viewedAt)}` : ''}</p>
              {offer.rejectionNote && <p className="text-xs text-rose-700">Devolvida: {offer.rejectionNote}</p>}
              {offer.declineReason && <p className="text-xs text-rose-700">Motivo da recusa: {offer.declineReason}</p>}
              {status === 'ACCEPTED' && <p className="text-xs font-semibold text-emerald-700">Próximo passo: mova o candidato para Contratado para iniciar a admissão.</p>}
              <div className="flex flex-wrap gap-2">
                {offer.canApprove && <Button size="sm" onClick={() => act(offer.id, () => processApi.approveOffer(offer.id), 'Proposta aprovada.')} isLoading={busy === offer.id}>Aprovar</Button>}
                {offer.canApprove && <Button size="sm" variant="outline" onClick={() => { const note = window.prompt('O que precisa mudar?'); if (note?.trim()) act(offer.id, () => processApi.returnOffer(offer.id, note.trim()), 'Proposta devolvida para ajuste.'); }}>Devolver</Button>}
                {canCreate && status === 'APPROVED' && <Button size="sm" onClick={() => act(offer.id, () => processApi.sendOffer(offer.id), 'Proposta enviada por e-mail.')} isLoading={busy === offer.id}><Send size={14} aria-hidden="true" /> Enviar ao candidato</Button>}
                {canCreate && ['PENDING_APPROVAL', 'APPROVED', 'SENT'].includes(status) && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => { if (window.confirm('Cancelar esta proposta?')) act(offer.id, () => processApi.cancelOffer(offer.id), 'Proposta cancelada.'); }}>Cancelar</Button>}
              </div>
            </li>
          );
        })}
        {!offers.loading && items.length === 0 && !creating && <li className="text-sm text-fg-sub">Nenhuma proposta. Monte a proposta, ela passa pela aprovação (quando for o caso) e o candidato aceita ou recusa pelo link do e-mail.</li>}
      </ul>
    </div>
  );
}

// ---------- testes ----------
const PROFILE_COLOR: Record<string, string> = { EXECUTOR: '#dc2626', COMUNICADOR: '#f59e0b', PLANEJADOR: '#16a34a', ANALISTA: '#2563eb' };

export function AssessmentsPanel({ applicationId, canSend, closed, onChanged }: { applicationId: string; canSend: boolean; closed: boolean; onChanged: () => void }) {
  const list = useQuery(() => processApi.assessments(applicationId), [applicationId]);
  const [busy, setBusy] = useState<string | null>(null);
  async function act(key: string, action: () => Promise<unknown>, success: string) {
    setBusy(key);
    try { await action(); toast.success(success); list.refetch(); onChanged(); } catch (cause) { fail(cause, 'Não foi possível concluir.'); } finally { setBusy(null); }
  }
  const items: AssessmentResult[] = list.data ?? [];
  return (
    <div className="space-y-4">
      {canSend && !closed && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => act('TECHNICAL', () => processApi.sendAssessment(applicationId, 'TECHNICAL'), 'Teste técnico enviado por e-mail.')} isLoading={busy === 'TECHNICAL'}>Enviar teste técnico</Button>
          <Button variant="outline" onClick={() => act('BEHAVIORAL', () => processApi.sendAssessment(applicationId, 'BEHAVIORAL'), 'Questionário comportamental enviado por e-mail.')} isLoading={busy === 'BEHAVIORAL'}>Enviar comportamental</Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 rounded-xl border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-fg">{item.title}</p>
              {item.status === 'COMPLETED' ? (item.kind === 'TECHNICAL' ? <Pill tone={item.passed ? 'success' : 'danger'}>Nota {item.score}{item.passingScore !== null && item.passingScore !== undefined ? ` (mín. ${item.passingScore})` : ''}</Pill> : <Pill tone="brand">{item.result?.dominantLabel}</Pill>)
                : <Pill tone={item.status === 'STARTED' ? 'info' : item.status === 'SENT' ? 'warning' : 'default'}>{{ SENT: 'Enviado, não iniciado', STARTED: 'Em andamento', EXPIRED: 'Venceu sem resposta', CANCELED: 'Cancelado' }[item.status] ?? item.status}</Pill>}
            </div>
            {item.status === 'COMPLETED' && item.kind === 'TECHNICAL' && <p className="text-xs text-fg-sub">{item.result?.correct} de {item.result?.total} acertos · respondido em {dt(item.completedAt)}{item.result?.late ? ' · entregue fora do tempo' : ''}</p>}
            {item.status === 'COMPLETED' && item.kind === 'BEHAVIORAL' && item.result?.percent && (
              <div className="space-y-1.5">
                {Object.entries(item.result.percent).sort((a, b) => b[1] - a[1]).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 font-medium text-fg">{item.profiles?.[key]?.label ?? key}</span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sub"><span className="block h-full rounded-full" style={{ width: `${value}%`, background: PROFILE_COLOR[key] }} /></span>
                    <span className="w-9 text-right tabular-nums text-fg-sub">{value}%</span>
                  </div>
                ))}
                {item.result.dominant && item.profiles?.[item.result.dominant] && <p className="text-xs text-fg-sub"><strong>{item.profiles[item.result.dominant].label}:</strong> {item.profiles[item.result.dominant].summary} Pontos fortes: {item.profiles[item.result.dominant].strengths} Atenção: {item.profiles[item.result.dominant].attention}</p>}
                <p className="text-[11px] text-fg-mut">Indicador de estilo de trabalho, não de competência. Use como apoio à entrevista, nunca como critério único.</p>
              </div>
            )}
            {['SENT', 'STARTED'].includes(item.status) && <div className="flex items-center justify-between gap-2 text-xs text-fg-sub"><span className="flex items-center gap-1"><CalendarClock size={13} aria-hidden="true" /> Válido até {dt(item.expiresAt)}</span>{canSend && <Button size="sm" variant="ghost" onClick={() => act(item.id, () => processApi.cancelAssessment(applicationId, item.id), 'Teste cancelado.')}>Cancelar</Button>}</div>}
          </li>
        ))}
        {!list.loading && items.length === 0 && <li className="text-sm text-fg-sub">Nenhum teste enviado. O teste técnico é montado em Editar vaga &gt; Teste técnico; o comportamental já está pronto.</li>}
      </ul>
    </div>
  );
}
