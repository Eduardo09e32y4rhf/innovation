'use client';

import { AlertTriangle, Search, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { ApiError } from '@/app/lib/api';
import { jobsApi } from '../jobs-api';
import type { InternalLookup } from '../types';

const errorMessage = (cause: unknown) => cause instanceof ApiError ? cause.message : 'Não foi possível concluir a ação.';

/** Busca o funcionário pela matrícula, mostra o cadastro já preenchido e confirma a candidatura interna. */
export function InternalCandidateForm({ jobId, defaultRegistration = '', lockRegistration = false, onDone, onCancel }: {
  jobId: string; defaultRegistration?: string; lockRegistration?: boolean; onDone: () => void; onCancel?: () => void;
}) {
  const [registration, setRegistration] = useState(defaultRegistration);
  const [data, setData] = useState<InternalLookup | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);

  async function search() {
    setBusy(true);
    try { const found = await jobsApi.internalLookup(registration.trim()); setData(found); setPhone(found.phone ?? ''); setEmail(found.email ?? ''); }
    catch (cause) { setData(null); toast.error(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!data) return;
    setBusy(true);
    try {
      const result = await jobsApi.internalApply(jobId, { registration: data.registration, phone: phone.trim() || undefined, email: email.trim() || undefined, coverLetter: letter.trim() || undefined });
      toast.success(result.rhNotified ? 'Candidatura registrada. O RH foi avisado para atualizar o cadastro.' : 'Candidatura interna registrada.');
      onDone();
    } catch (cause) { toast.error(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <div className="space-y-3">
    <div className="flex gap-2">
      <input className="input-v2 min-h-11 flex-1 rounded-xl" placeholder="Matrícula" value={registration} disabled={lockRegistration} onChange={(event) => { setRegistration(event.target.value); setData(null); }} onKeyDown={(event) => { if (event.key === 'Enter' && registration.trim()) void search(); }} aria-label="Matrícula" />
      <Button onClick={search} isLoading={busy && !data} disabled={!registration.trim()}><Search size={15} aria-hidden="true" /> Buscar</Button>
    </div>
    {data && <div className="space-y-3 rounded-xl border border-border bg-bg-sub p-3 text-sm">
      <div><p className="font-semibold text-fg">{data.name}</p><p className="text-xs text-fg-sub">{[data.position, data.department].filter(Boolean).join(' · ') || 'Cargo não informado'} · matrícula {data.registration}</p><p className="mt-1 text-xs text-fg-sub">CPF {data.cpf ?? '—'} · {data.address ?? 'Endereço não informado'}</p></div>
      {data.outdated.length > 0 && <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Cadastro desatualizado ({data.outdated.join(', ')}). Você pode seguir: o RH será avisado em silêncio para corrigir.</span></p>}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-fg-sub">Telefone<input className="input-v2 mt-1 min-h-10 w-full rounded-lg" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="text-xs text-fg-sub">E-mail<input className="input-v2 mt-1 min-h-10 w-full rounded-lg" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      </div>
      <label className="block text-xs text-fg-sub">Mensagem (opcional)<textarea className="input-v2 mt-1 w-full rounded-lg" rows={2} value={letter} onChange={(event) => setLetter(event.target.value)} /></label>
      <div className="flex justify-end gap-2">{onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar</Button>}<Button onClick={confirm} isLoading={busy}><UserPlus size={15} aria-hidden="true" /> Confirmar candidatura</Button></div>
    </div>}
  </div>;
}
