'use client';

import { useEffect, useState } from 'react';
import { Button, Modal } from '@/app/components/ui';
import { Field, inputClass } from './bits';
import { REJECTION_SUGGESTIONS, type HirePayload } from '../types';

export function RejectDialog({
  isOpen, count, onClose, onConfirm,
}: { isOpen: boolean; count: number; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

  async function submit() {
    if (!reason.trim() || busy) return;
    setBusy(true);
    try { await onConfirm(reason.trim()); } finally { setBusy(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title="Reprovar candidato" description={count > 1 ? `${count} candidatos serão reprovados.` : 'Registre o motivo para manter o histórico do processo.'}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {REJECTION_SUGGESTIONS.map((item) => (
            <button key={item} type="button" className={`btn btn-sm ${reason === item ? 'btn-primary' : 'btn-outline'}`} onClick={() => setReason(item)}>{item}</button>
          ))}
        </div>
        <Field label="Motivo" required><input className={inputClass} value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="danger" isLoading={busy} disabled={!reason.trim()} onClick={submit}>Reprovar</Button>
        </div>
      </div>
    </Modal>
  );
}

export function HireDialog({
  isOpen, name, onClose, onConfirm,
}: { isOpen: boolean; name: string; onClose: () => void; onConfirm: (payload: HirePayload) => Promise<void> }) {
  const [form, setForm] = useState({ department: '', contractType: 'CLT', admissionDate: '', salary: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) setForm({ department: '', contractType: 'CLT', admissionDate: '', salary: '' }); }, [isOpen]);
  const valid = form.department.trim() && form.contractType && form.admissionDate;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onConfirm({ department: form.department.trim(), contractType: form.contractType, admissionDate: form.admissionDate, salary: form.salary ? Number(form.salary) : undefined });
    } finally { setBusy(false); }
  }

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title="Contratar candidato" description={`${name} será cadastrado como funcionário em admissão. O ASO admissional será gerado automaticamente.`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Departamento" required><input className={inputClass} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></Field>
        <Field label="Tipo de contrato" required>
          <select className={inputClass} value={form.contractType} onChange={(event) => setForm({ ...form, contractType: event.target.value })}>
            {['CLT', 'PJ', 'ESTAGIO', 'TEMPORARIO', 'JOVEM_APRENDIZ'].map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Data de admissão" required><input type="date" className={inputClass} value={form.admissionDate} onChange={(event) => setForm({ ...form, admissionDate: event.target.value })} /></Field>
        <Field label="Salário (R$)"><input type="number" min={0} className={inputClass} value={form.salary} onChange={(event) => setForm({ ...form, salary: event.target.value })} /></Field>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button isLoading={busy} disabled={!valid} onClick={submit}>Confirmar contratação</Button>
      </div>
    </Modal>
  );
}

export function PromptDialog({
  isOpen, title, label, confirmText, onClose, onConfirm,
}: { isOpen: boolean; title: string; label: string; confirmText: string; onClose: () => void; onConfirm: (value: string) => Promise<void> }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (isOpen) setValue(''); }, [isOpen]);
  async function submit() {
    if (!value.trim() || busy) return;
    setBusy(true);
    try { await onConfirm(value.trim()); } finally { setBusy(false); }
  }
  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={title}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-3">
        <Field label={label} required><input autoFocus className={inputClass} value={value} maxLength={60} onChange={(event) => setValue(event.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" isLoading={busy} disabled={!value.trim()}>{confirmText}</Button>
        </div>
      </form>
    </Modal>
  );
}
