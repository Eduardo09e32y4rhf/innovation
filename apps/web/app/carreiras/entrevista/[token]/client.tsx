'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ActionShell, Notice, actionCard, outlineBtn, primaryBtn } from '../../_components/action-shell';
import { errorMessage, processPublic, sentence, type PublicInterview } from '../../_lib/process-public';

/** Link do convite: ver os detalhes, confirmar presenca ou avisar que nao pode (com motivo). */
export function InterviewClient({ token }: { token: string }) {
  const params = useSearchParams();
  const [data, setData] = useState<PublicInterview | null>(null);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(params.get('r') === 'nao');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { processPublic.interview(token).then(setData).catch((cause) => setError(errorMessage(cause, 'Convite não encontrado.'))); }, [token]);

  async function respond(response: 'CONFIRMED' | 'DECLINED') {
    setBusy(true); setError('');
    try { setData(await processPublic.respondInterview(token, response, response === 'DECLINED' ? reason.trim() || undefined : undefined)); setDeclining(false); }
    catch (cause) { setError(errorMessage(cause, 'Não foi possível registrar sua resposta.')); } finally { setBusy(false); }
  }

  const online = data?.mode === 'ONLINE';
  return (
    <ActionShell>
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p role="status" className="text-sm text-[#5b5473]">Carregando…</p>}
      {data && (
        <>
          <header className="space-y-1">
            <p className="text-sm font-semibold text-[#7240da]">{data.company}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">Olá, {data.candidate}! Sua entrevista</h1>
            <p className="text-[#5b5473]">Vaga: <strong>{data.job}</strong></p>
          </header>
          <section className={actionCard}>
            <dl className="grid gap-3 text-sm sm:grid-cols-[110px_1fr]">
              <dt className="text-[#6b6478]">Quando</dt><dd className="font-bold">{sentence(data.when)}</dd>
              <dt className="text-[#6b6478]">Duração</dt><dd className="font-semibold">cerca de {data.durationMinutes} min</dd>
              <dt className="text-[#6b6478]">Formato</dt><dd className="font-semibold">{online ? `Online${data.meetingProvider ? ` · ${data.meetingProvider}` : ''}` : 'Presencial'}</dd>
              {!online && data.location && (<><dt className="text-[#6b6478]">Endereço</dt><dd className="break-words font-semibold">{data.location}</dd></>)}
              <dt className="text-[#6b6478]">Com</dt><dd className="font-semibold">{data.interviewer}</dd>
            </dl>
            {data.message && <p className="mt-4 border-l-[3px] border-[#7240da] pl-3 text-sm">{data.message}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {online && data.meetingUrl && <a href={data.meetingUrl} target="_blank" rel="noopener noreferrer" className={primaryBtn}>Entrar na reunião</a>}
              {!online && data.location && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.location)}`} target="_blank" rel="noopener noreferrer" className={outlineBtn}>Como chegar</a>}
            </div>
          </section>

          {data.response === 'CONFIRMED' && <Notice tone="success"><strong>Presença confirmada.</strong> A empresa já sabe. Você recebe um lembrete por e-mail na véspera.</Notice>}
          {data.response === 'DECLINED' && <Notice tone="info"><strong>Avisamos a empresa que você não pode neste horário.</strong> Eles devem entrar em contato para remarcar.</Notice>}

          {data.canRespond && !declining && (
            <section className={`${actionCard} space-y-3`}>
              <h2 className="font-bold">{data.response ? 'Mudou de ideia?' : 'Você vai conseguir ir?'}</h2>
              <div className="flex flex-wrap gap-2">
                {data.response !== 'CONFIRMED' && <button type="button" className={primaryBtn} disabled={busy} onClick={() => respond('CONFIRMED')}>Confirmo presença</button>}
                <button type="button" className={outlineBtn} disabled={busy} onClick={() => setDeclining(true)}>Não vou conseguir</button>
              </div>
            </section>
          )}
          {data.canRespond && declining && (
            <section className={`${actionCard} space-y-3`}>
              <h2 className="font-bold">Que pena! Quer contar o motivo?</h2>
              <p className="text-sm text-[#5b5473]">Opcional. Ajuda a empresa a remarcar (ex.: melhores dias e horários para você).</p>
              <textarea className="min-h-[96px] w-full rounded-[12px] border border-[#d9cdee] p-3 text-base outline-none focus:border-[#7240da]" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: tenho prova nesse dia, posso na quinta à tarde." />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryBtn} disabled={busy} onClick={() => respond('DECLINED')}>Avisar a empresa</button>
                <button type="button" className={outlineBtn} disabled={busy} onClick={() => setDeclining(false)}>Voltar</button>
              </div>
            </section>
          )}
          {!data.canRespond && !data.response && <Notice tone="info">Este convite não aceita mais respostas (o horário passou ou o processo foi encerrado).</Notice>}
        </>
      )}
    </ActionShell>
  );
}
