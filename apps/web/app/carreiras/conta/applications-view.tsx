'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { candidateApi, isUnauthorized, setCandidateToken, type CandidateApplication } from '../_lib/candidate-api';
import { useCandidateSession } from './_components/account-shell';

const STEPS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED'] as const;
const STEP_LABEL: Record<string, string> = { APPLIED: 'Recebida', SCREENING: 'Em análise', INTERVIEW: 'Entrevista', OFFER: 'Proposta', HIRED: 'Contratação' };
const POLL_MS = 30_000;

function Stepper({ status }: { status: string }) {
  const rejected = status === 'REJECTED';
  const current = STEPS.indexOf(status as (typeof STEPS)[number]);
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Etapas da candidatura">
      {STEPS.map((step, index) => {
        const done = !rejected && current >= index;
        const active = !rejected && current === index;
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-[#6d28d9] text-white' : 'bg-[#ece8f5] text-[#5b5473]'} ${active ? 'ring-4 ring-[#d9ccf7]' : ''}`}>{done ? '✓' : index + 1}</span>
            <span className={`text-xs ${active ? 'font-bold' : 'text-[#5b5473]'}`}>{STEP_LABEL[step]}</span>
            {index < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-[#d5cceb]" />}
          </li>
        );
      })}
    </ol>
  );
}

function Funnel({ rows, status }: { rows: NonNullable<CandidateApplication['funnel']>; status: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count ?? 0));
  return (
    <div className="space-y-2" role="group" aria-label="Quantas pessoas estão em cada etapa desta vaga">
      <p className="text-xs font-semibold text-[#5b5473]">Pessoas em cada etapa agora</p>
      {rows.map((row) => (
        <div key={row.status} className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-3 text-xs">
          <span className={row.status === status ? 'font-bold' : ''}>{row.stage}{row.status === status ? ' · você' : ''}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-[#ece8f5]"><span className={`block h-full rounded-full ${row.status === status ? 'bg-[#6d28d9]' : 'bg-[#b9a5ea]'}`} style={{ width: `${row.count === null ? 8 : Math.max(6, Math.round((row.count / max) * 100))}%` }} /></span>
          <span className="min-w-[72px] text-right font-semibold">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ApplicationsView() {
  const { profile, signOut } = useCandidateSession();
  const [items, setItems] = useState<CandidateApplication[] | null>(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await candidateApi.applications();
      setItems(result.applications); setUpdatedAt(new Date()); setError('');
    } catch (cause) {
      if (isUnauthorized(cause)) { setCandidateToken(null); await signOut(); return; }
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar suas candidaturas.');
    }
  }, [signOut]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold tracking-tight">Minhas candidaturas</h1>
          <p className="text-sm text-[#5b5473]">Acompanhe o andamento em todas as empresas{updatedAt ? ` · atualizado às ${updatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}.</p></div>
        <Link href="/carreiras" className="inline-flex min-h-11 items-center rounded-[10px] bg-[#6d28d9] px-5 text-sm font-semibold text-white hover:bg-[#5b21b6]">Ver vagas abertas</Link>
      </div>

      {!profile.completeness.complete && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#e4d9f4] bg-[#f0eafa] p-4 text-sm">
          <span>Seu perfil está {profile.completeness.percent}% completo. Complete para se candidatar com poucos cliques{profile.completeness.missing.length ? ` (falta: ${profile.completeness.missing.join(', ')})` : ''}.</span>
          <Link href="/carreiras/conta/perfil" className="min-h-11 content-center font-semibold text-[#6d28d9] underline">Completar perfil</Link>
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="font-semibold underline" onClick={() => void load()}>Tentar de novo</button></p>}
      {!items && !error && <p role="status">Carregando candidaturas…</p>}
      {items && items.length === 0 && (
        <div className="rounded-[16px] border border-dashed border-[#d5cceb] bg-white p-10 text-center">
          <p className="font-semibold">Você ainda não se candidatou a nenhuma vaga.</p>
          <p className="mt-1 text-sm text-[#5b5473]">Quando você se candidatar, o andamento aparece aqui.</p>
        </div>
      )}

      <div className="space-y-4">
        {items?.map((item) => (
          <article key={item.id} className="space-y-4 rounded-[16px] border border-[#e4dff0] bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="break-words text-lg font-bold">{item.job}</h2><p className="text-sm text-[#5b5473]">{item.company} · candidatura em {new Date(item.appliedAt).toLocaleDateString('pt-BR')}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === 'REJECTED' ? 'bg-rose-50 text-rose-800' : item.status === 'HIRED' ? 'bg-emerald-50 text-emerald-800' : 'bg-[#eee8fd] text-[#4c1d95]'}`}>{item.statusLabel}{item.stage && item.stage !== item.statusLabel ? ` · ${item.stage}` : ''}</span>
            </div>
            <Stepper status={item.status} />
            {item.closed && <p className="text-xs text-[#5b5473]">Esta vaga foi encerrada.</p>}
            {item.funnel && <Funnel rows={item.funnel} status={item.status} />}
            {item.timeline.length > 0 && (
              <details className="text-sm"><summary className="min-h-11 cursor-pointer content-center font-semibold text-[#6d28d9]">Histórico</summary>
                <ul className="mt-2 space-y-1">{item.timeline.map((event, index) => <li key={index} className="text-[#5b5473]"><time dateTime={event.at}>{new Date(event.at).toLocaleDateString('pt-BR')}</time> — {event.label}</li>)}</ul>
              </details>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
