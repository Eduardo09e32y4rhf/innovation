'use client';

import { useEffect, useState } from 'react';
import { ActionShell, Notice, actionCard, outlineBtn, primaryBtn } from '../../_components/action-shell';
import { errorMessage, processPublic, type PublicOffer } from '../../_lib/process-public';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const WORK_MODE: Record<string, string> = { PRESENCIAL: 'Presencial', HIBRIDO: 'Híbrido', REMOTO: 'Remoto' };

/** Proposta de emprego: o candidato le e aceita ou recusa. */
export function OfferClient({ token }: { token: string }) {
  const [data, setData] = useState<PublicOffer | null>(null);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(false);
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { processPublic.offer(token).then(setData).catch((cause) => setError(errorMessage(cause, 'Proposta não encontrada.'))); }, [token]);

  async function respond(accept: boolean) {
    setBusy(true); setError('');
    try { setData(await processPublic.respondOffer(token, accept, accept ? undefined : reason.trim() || undefined)); setDeclining(false); }
    catch (cause) { setError(errorMessage(cause, 'Não foi possível registrar sua resposta.')); } finally { setBusy(false); }
  }

  return (
    <ActionShell>
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p role="status" className="text-sm text-[#5b5473]">Carregando…</p>}
      {data && (
        <>
          <header className="space-y-1">
            <p className="text-sm font-semibold text-[#7240da]">{data.company}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">Parabéns, {data.candidate}! Esta é a sua proposta</h1>
          </header>
          <section className={actionCard}>
            <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-[#6b6478]">Cargo</dt><dd className="font-bold">{data.positionTitle}</dd>
              <dt className="text-[#6b6478]">Contrato</dt><dd className="font-semibold">{data.contractType}</dd>
              {data.salary !== null && (<><dt className="text-[#6b6478]">Salário mensal</dt><dd className="text-lg font-extrabold text-[#1e1145]">{brl(data.salary)}</dd></>)}
              {data.startDate && (<><dt className="text-[#6b6478]">Início</dt><dd className="font-semibold">{new Date(data.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</dd></>)}
              {data.workSchedule && (<><dt className="text-[#6b6478]">Jornada</dt><dd className="font-semibold">{data.workSchedule}</dd></>)}
              {data.workMode && (<><dt className="text-[#6b6478]">Modelo</dt><dd className="font-semibold">{WORK_MODE[data.workMode] ?? data.workMode}</dd></>)}
            </dl>
            {data.benefits.length > 0 && <div className="mt-4"><p className="text-sm text-[#6b6478]">Benefícios</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm font-semibold">{data.benefits.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            {data.message && <p className="mt-4 whitespace-pre-wrap border-l-[3px] border-[#7240da] pl-3 text-sm">{data.message}</p>}
          </section>
          {data.status === 'ACCEPTED' && <Notice tone="success"><strong>Você aceitou a proposta!</strong> A empresa já foi avisada e vai entrar em contato com os próximos passos da admissão.</Notice>}
          {data.status === 'DECLINED' && <Notice tone="info">Você recusou esta proposta. A empresa foi avisada. Obrigado por participar do processo.</Notice>}
          {data.status === 'EXPIRED' && <Notice tone="info">O prazo desta proposta terminou. Fale com a empresa se ainda tiver interesse.</Notice>}
          {data.status === 'CANCELED' && <Notice tone="info">Esta proposta foi cancelada pela empresa.</Notice>}
          {data.status === 'SENT' && !declining && (
            <section className={`${actionCard} space-y-3`}>
              {data.expiresAt && <p className="text-sm text-[#5b5473]">Responda até {new Date(data.expiresAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}.</p>}
              <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#7240da]" checked={agree} onChange={(event) => setAgree(event.target.checked)} /> Li a proposta e quero seguir com a contratação.</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryBtn} disabled={!agree || busy} onClick={() => respond(true)}>Aceitar proposta</button>
                <button type="button" className={outlineBtn} disabled={busy} onClick={() => setDeclining(true)}>Recusar</button>
              </div>
              <p className="text-xs text-[#6b6478]">O aceite registra seu interesse. Documentos e contrato vêm na admissão.</p>
            </section>
          )}
          {data.status === 'SENT' && declining && (
            <section className={`${actionCard} space-y-3`}>
              <h2 className="font-bold">Pode contar por que vai recusar?</h2>
              <textarea className="min-h-[96px] w-full rounded-[12px] border border-[#d9cdee] p-3 text-base outline-none focus:border-[#7240da]" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Opcional. Ex.: aceitei outra proposta, salário abaixo do esperado." />
              <div className="flex flex-wrap gap-2"><button type="button" className={primaryBtn} disabled={busy} onClick={() => respond(false)}>Confirmar recusa</button><button type="button" className={outlineBtn} disabled={busy} onClick={() => setDeclining(false)}>Voltar</button></div>
            </section>
          )}
        </>
      )}
    </ActionShell>
  );
}
