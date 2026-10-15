'use client';

import { Building2, Mail, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Modal } from '@/app/components/ui';
import { meetingLabel, normalizeMeetingInput } from '../../management/agenda/meeting-link';
import { jobsApi } from '../jobs-api';
import type { InterviewMode, InterviewPayload } from '../types';
import { Field, inputClass } from './bits';

const DURATIONS = [30, 45, 60, 90, 120];

/** Valor para <input type="datetime-local"> no fuso de quem esta agendando. */
function localInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Proximo dia util as 10h: ponto de partida comum para entrevistas. */
function suggestedStart(now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return localInput(date);
}

type Form = {
  mode: InterviewMode; scheduledAt: string; durationMinutes: number; location: string; meetingUrl: string;
  interviewerRole: 'RH' | 'GESTOR'; interviewer: string; candidateMessage: string; notifyCandidate: boolean;
};

const blank = (): Form => ({ mode: 'ONLINE', scheduledAt: suggestedStart(), durationMinutes: 60, location: '', meetingUrl: '', interviewerRole: 'RH', interviewer: '', candidateMessage: '', notifyCandidate: true });

/**
 * Agendar entrevista: o RH escolhe presencial (data/hora + endereco) ou online (data/hora + link do Teams/Meet/Zoom),
 * com quem sera (RH ou gestor) e o candidato recebe o convite por e-mail. Sugere o formato, local/link e entrevistador
 * usados por ultimo nesta vaga.
 */
export function InterviewDialog({
  isOpen, applicationId, candidateName, title = 'Agendar entrevista', onClose, onSubmit, onSkip,
}: {
  isOpen: boolean; applicationId: string | null; candidateName: string; title?: string;
  onClose: () => void; onSubmit: (payload: InterviewPayload) => Promise<void>; onSkip?: () => Promise<void>;
}) {
  const [form, setForm] = useState<Form>(blank);
  const [busy, setBusy] = useState<'save' | 'skip' | null>(null);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    if (!isOpen) return;
    setForm(blank());
    if (!applicationId) return;
    let alive = true;
    jobsApi.interviewDefaults(applicationId).then((defaults) => {
      if (!alive) return;
      setForm((previous) => ({
        ...previous,
        mode: defaults.mode ?? previous.mode,
        location: defaults.location ?? '',
        meetingUrl: defaults.meetingUrl ?? '',
        durationMinutes: defaults.durationMinutes || 60,
        interviewerRole: defaults.interviewerRole ?? 'RH',
        interviewer: defaults.interviewer ?? '',
      }));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [isOpen, applicationId]);

  const meeting = normalizeMeetingInput(form.meetingUrl);
  const start = form.scheduledAt ? new Date(form.scheduledAt) : null;
  const past = Boolean(start && start.getTime() < Date.now() - 60_000);
  const problem = (() => {
    if (!start || Number.isNaN(start.getTime())) return 'Informe a data e a hora.';
    if (past && form.notifyCandidate) return 'Essa data já passou. Escolha um horário futuro.';
    if (form.mode === 'PRESENCIAL' && !form.location.trim()) return 'Informe o endereço da entrevista.';
    if (form.mode === 'ONLINE' && !meeting.ok) return meeting.error;
    if (form.mode === 'ONLINE' && !meeting.value) return 'Cole o link da reunião (Teams, Meet, Zoom...).';
    return null;
  })();

  async function submit() {
    if (problem || busy || !start) return;
    setBusy('save');
    try {
      await onSubmit({
        scheduledAt: start.toISOString(),
        mode: form.mode,
        durationMinutes: form.durationMinutes,
        location: form.mode === 'PRESENCIAL' ? form.location.trim() : undefined,
        meetingUrl: form.mode === 'ONLINE' && meeting.ok ? meeting.value ?? undefined : undefined,
        interviewerRole: form.interviewerRole,
        interviewer: form.interviewer.trim() || undefined,
        candidateMessage: form.candidateMessage.trim() || undefined,
        notifyCandidate: form.notifyCandidate,
      });
    } finally { setBusy(null); }
  }

  async function skip() {
    if (!onSkip || busy) return;
    setBusy('skip');
    try { await onSkip(); } finally { setBusy(null); }
  }

  const whenText = start && !Number.isNaN(start.getTime()) ? start.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const segment = (on: boolean) => `flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${on ? 'bg-brand-600 text-white shadow-sm' : 'text-fg-sub hover:bg-bg-sub'}`;

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={title} description={`${candidateName} recebe o convite por e-mail com data, horário e ${form.mode === 'ONLINE' ? 'o link da reunião' : 'o endereço'}.`} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Formato da entrevista" className="flex gap-1 rounded-xl border border-border bg-bg-sub/60 p-1">
          <button type="button" role="radio" aria-checked={form.mode === 'ONLINE'} className={segment(form.mode === 'ONLINE')} onClick={() => set('mode', 'ONLINE')}><Video size={16} aria-hidden="true" /> Online</button>
          <button type="button" role="radio" aria-checked={form.mode === 'PRESENCIAL'} className={segment(form.mode === 'PRESENCIAL')} onClick={() => set('mode', 'PRESENCIAL')}><Building2 size={16} aria-hidden="true" /> Presencial</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <Field label="Data e hora" required><input type="datetime-local" className={inputClass} value={form.scheduledAt} min={localInput(new Date())} onChange={(event) => set('scheduledAt', event.target.value)} /></Field>
          <Field label="Duração">
            <select className={inputClass} value={form.durationMinutes} onChange={(event) => set('durationMinutes', Number(event.target.value))}>
              {DURATIONS.map((minutes) => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}` : ''}`}</option>)}
            </select>
          </Field>
        </div>

        {form.mode === 'ONLINE' ? (
          <Field label="Link da reunião" required hint={meeting.ok ? (meeting.value ? `${meetingLabel(meeting.value)} · o candidato recebe um botão "Entrar na reunião".` : 'Teams, Google Meet, Zoom ou outro link https.') : meeting.error}>
            <input type="url" inputMode="url" className={inputClass} value={form.meetingUrl} placeholder="https://teams.microsoft.com/... ou https://meet.google.com/..." aria-invalid={!meeting.ok} onChange={(event) => set('meetingUrl', event.target.value)} />
          </Field>
        ) : (
          <Field label="Endereço" required hint="Rua, número, bairro, cidade e, se tiver, andar ou sala. O e-mail leva um link do mapa.">
            <textarea className={`${inputClass} min-h-[72px]`} maxLength={300} value={form.location} placeholder="Av. Paulista, 1000, 5º andar, sala 52, Bela Vista, São Paulo" onChange={(event) => set('location', event.target.value)} />
          </Field>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Entrevista com">
            <select className={inputClass} value={form.interviewerRole} onChange={(event) => set('interviewerRole', event.target.value as Form['interviewerRole'])}>
              <option value="RH">RH</option>
              <option value="GESTOR">Gestor da área</option>
            </select>
          </Field>
          <Field label="Nome de quem entrevista" hint="Opcional. Aparece no e-mail."><input className={inputClass} maxLength={120} value={form.interviewer} onChange={(event) => set('interviewer', event.target.value)} /></Field>
        </div>

        <Field label="Recado ao candidato" hint="Opcional. Ex.: levar portfólio, perguntar por fulano na recepção.">
          <textarea className={`${inputClass} min-h-[64px]`} maxLength={1000} value={form.candidateMessage} onChange={(event) => set('candidateMessage', event.target.value)} />
        </Field>

        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-brand)]" checked={form.notifyCandidate} onChange={(event) => set('notifyCandidate', event.target.checked)} />
          <span><span className="flex items-center gap-1.5 font-semibold text-fg"><Mail size={15} aria-hidden="true" /> Enviar convite por e-mail ao candidato</span>
            <span className="block text-xs text-fg-sub">{whenText ? `Vai com: ${whenText}, ${form.mode === 'ONLINE' ? `online${meeting.ok && meeting.value ? ` (${meetingLabel(meeting.value)})` : ''}` : 'presencial'}, cerca de ${form.durationMinutes} min.` : 'Data, horário e local ou link.'} A entrevista também entra na sua Agenda.</span></span>
        </label>

        {problem && <p className="text-sm text-rose-700" role="alert">{problem}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {onSkip && <Button variant="ghost" onClick={skip} isLoading={busy === 'skip'} disabled={Boolean(busy)}>Mover sem agendar agora</Button>}
          <Button variant="outline" onClick={onClose} disabled={Boolean(busy)}>Cancelar</Button>
          <Button onClick={submit} isLoading={busy === 'save'} disabled={Boolean(problem) || Boolean(busy)}>{form.notifyCandidate ? 'Agendar e enviar convite' : 'Agendar'}</Button>
        </div>
      </div>
    </Modal>
  );
}
