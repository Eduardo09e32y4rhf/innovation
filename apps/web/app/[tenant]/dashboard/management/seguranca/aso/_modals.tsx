'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { useMutation } from '@/app/hooks/use-data';
import { api, type Employee } from '@/app/lib/api';
import { normalizeDisplayName } from '@/app/lib/text';
import { ASO_TYPE_LABEL, formatDate, sstApi } from '../../sst-api';

const SCHEDULE_TYPES = ['ADMISSIONAL', 'PERIODICO', 'RETORNO_AO_TRABALHO', 'MUDANCA_DE_FUNCAO', 'DEMISSIONAL', 'COMPLEMENTAR'];
const EXAMS = ['Audiometria', 'Acuidade visual', 'Espirometria', 'Eletrocardiograma', 'Hemograma', 'Glicemia', 'Raio-X de tórax', 'Avaliação psicossocial'];

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>('input, select, textarea, button:not([disabled]), [href]');
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-bg p-5 shadow-v2-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} className="text-base font-semibold text-fg">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-sm text-fg-mut">{subtitle}</p> : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

const field = 'input-v2 w-full';
const label = 'block text-sm font-medium text-fg';
const todayIso = () => new Date().toISOString().slice(0, 10);

export function AsoScheduleModal({ employees, initialEmployeeId, onClose, onDone }: {
  employees: Employee[]; initialEmployeeId?: string; onClose: () => void; onDone: (message: string) => void;
}) {
  const [employeeId, setEmployeeId] = useState(initialEmployeeId ?? '');
  const [asoType, setAsoType] = useState('PERIODICO');
  const [date, setDate] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation(
    () => api.management.aso.create({
      employeeId,
      asoType,
      status: date ? 'SCHEDULED' : 'PENDING',
      examDate: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
      clinicName: clinicName.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
    }),
    { onSuccess: () => onDone('ASO agendado. Quando o exame for feito, use "Concluir ASO".'), onError: (e: unknown) => setError(typeof e === 'string' && e ? e : e instanceof Error && e.message ? e.message : 'Não foi possível agendar.') },
  );

  const sorted = useMemo(() => employees.slice().sort((a, b) => a.name.localeCompare(b.name)), [employees]);

  return (
    <Modal title="Agendar ASO" subtitle="Registra o exame como pendente ou agendado." onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(null); if (!employeeId) { setError('Selecione o colaborador.'); return; } create.mutate().catch(() => {}); }}>
        <label className={label}>Colaborador *
          <select className={`${field} mt-1`} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Selecione...</option>
            {sorted.map((e) => <option key={e.id} value={e.id}>{normalizeDisplayName(e.name)}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Tipo de exame *
            <select className={`${field} mt-1`} value={asoType} onChange={(e) => setAsoType(e.target.value)}>
              {SCHEDULE_TYPES.map((t) => <option key={t} value={t}>{ASO_TYPE_LABEL[t]}</option>)}
            </select>
          </label>
          <label className={label}>Data marcada
            <input type="date" className={`${field} mt-1`} value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Clínica
            <input className={`${field} mt-1`} value={clinicName} maxLength={160} onChange={(e) => setClinicName(e.target.value)} />
          </label>
          <label className={label}>Médico
            <input className={`${field} mt-1`} value={doctorName} maxLength={160} onChange={(e) => setDoctorName(e.target.value)} />
          </label>
        </div>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={create.loading}>Agendar</Button>
        </div>
      </form>
    </Modal>
  );
}

function previewDue(examDate: string, months: number) {
  const base = new Date(`${examDate}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return null;
  const day = base.getUTCDate();
  const due = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
  due.setUTCMonth(due.getUTCMonth() + months);
  const last = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate();
  due.setUTCDate(Math.min(day, last));
  return due.toISOString();
}

export function AsoCompleteModal({ recordId, employeeName, onClose, onDone }: {
  recordId: string; employeeName: string; onClose: () => void; onDone: (message: string) => void;
}) {
  const [examDate, setExamDate] = useState(todayIso());
  const [result, setResult] = useState<'APTO' | 'INAPTO'>('APTO');
  const [periodicity, setPeriodicity] = useState(12);
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [restrictions, setRestrictions] = useState('');
  const [observation, setObservation] = useState('');
  const [exams, setExams] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const complete = useMutation(
    () => sstApi.complete(recordId, {
      examDate,
      result,
      periodicityMonths: periodicity,
      clinicName: clinicName.trim() || undefined,
      doctorName: doctorName.trim() || undefined,
      documentNumber: documentNumber.trim() || undefined,
      restrictions: restrictions.trim() || undefined,
      observation: observation.trim() || undefined,
      examsPerformed: exams.length ? exams : undefined,
    }),
    { onSuccess: () => onDone(`ASO de ${normalizeDisplayName(employeeName)} concluído.`), onError: (e: unknown) => setError(typeof e === 'string' && e ? e : e instanceof Error && e.message ? e.message : 'Não foi possível concluir.') },
  );

  const due = previewDue(examDate, periodicity);

  return (
    <Modal title="Concluir ASO" subtitle={normalizeDisplayName(employeeName)} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (result === 'INAPTO' && !observation.trim() && !restrictions.trim()) { setError('Informe o motivo da inaptidão nas observações.'); return; }
          complete.mutate().catch(() => {});
        }}
      >
        <fieldset>
          <legend className={label}>Resultado *</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(['APTO', 'INAPTO'] as const).map((value) => (
              <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-v2-md border px-3 text-sm font-medium ${result === value ? (value === 'APTO' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-red-500 bg-red-50 text-red-800') : 'border-line text-fg-mut'}`}>
                <input type="radio" name="result" value={value} checked={result === value} onChange={() => setResult(value)} className="accent-brand-600" />
                {value === 'APTO' ? 'Apto' : 'Inapto'}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={label}>Data do exame *
            <input type="date" className={`${field} mt-1`} value={examDate} max={todayIso()} onChange={(e) => setExamDate(e.target.value)} required />
          </label>
          <label className={label}>Validade do ASO
            <select className={`${field} mt-1`} value={periodicity} onChange={(e) => setPeriodicity(Number(e.target.value))}>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses (padrão)</option>
              <option value={24}>24 meses</option>
            </select>
          </label>
        </div>
        {due && result === 'APTO' ? <p className="rounded-v2-md bg-bg-sub px-3 py-2 text-sm text-fg-mut">Vence em <strong className="text-fg">{formatDate(due)}</strong>. Será exibido como “a vencer” 30 dias antes.</p> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className={`${label} sm:col-span-1`}>Clínica
            <input className={`${field} mt-1`} value={clinicName} maxLength={160} onChange={(e) => setClinicName(e.target.value)} />
          </label>
          <label className={label}>Médico
            <input className={`${field} mt-1`} value={doctorName} maxLength={160} onChange={(e) => setDoctorName(e.target.value)} />
          </label>
          <label className={label}>Nº do atestado
            <input className={`${field} mt-1`} value={documentNumber} maxLength={60} onChange={(e) => setDocumentNumber(e.target.value)} />
          </label>
        </div>
        <fieldset>
          <legend className={label}>Exames complementares realizados</legend>
          <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
            {EXAMS.map((exam) => (
              <label key={exam} className="flex items-center gap-2 text-sm text-fg">
                <input type="checkbox" className="accent-brand-600" checked={exams.includes(exam)} onChange={(e) => setExams(e.target.checked ? [...exams, exam] : exams.filter((x) => x !== exam))} />
                {exam}
              </label>
            ))}
          </div>
        </fieldset>
        {result === 'APTO' ? (
          <label className={label}>Restrições (apto com restrições)
            <textarea className={`${field} mt-1`} rows={2} maxLength={2000} value={restrictions} onChange={(e) => setRestrictions(e.target.value)} placeholder="Deixe em branco se não houver" />
          </label>
        ) : null}
        <label className={label}>Observações{result === 'INAPTO' ? ' *' : ''}
          <textarea className={`${field} mt-1`} rows={2} maxLength={2000} value={observation} onChange={(e) => setObservation(e.target.value)} />
        </label>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" isLoading={complete.loading}>Concluir ASO</Button>
        </div>
      </form>
    </Modal>
  );
}
