'use client';

import { useEffect, useState } from 'react';
import { ActionShell, Notice, actionCard, outlineBtn, primaryBtn } from '../../_components/action-shell';
import { errorMessage, processPublic, type PublicOffer } from '../../_lib/process-public';
import { useI18n } from '@/app/contexts/I18nContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

const WORK_MODE: Record<string, string> = { PRESENCIAL: 'Presencial', HIBRIDO: 'Híbrido', REMOTO: 'Remoto' };

/** Proposta de emprego: o candidato le e aceita ou recusa. */
export function OfferClient({ token }: { token: string }) {
  const { t } = useI18n();
  const { language } = useLanguage();
  const [data, setData] = useState<PublicOffer | null>(null);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(false);
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { processPublic.offer(token).then(setData).catch((cause) => setError(t(errorMessage(cause, 'Proposta não encontrada.')))); }, [token, t]);

  async function respond(accept: boolean) {
    setBusy(true); setError('');
    try { setData(await processPublic.respondOffer(token, accept, accept ? undefined : reason.trim() || undefined)); setDeclining(false); }
    catch (cause) { setError(t(errorMessage(cause, 'Não foi possível registrar sua resposta.'))); } finally { setBusy(false); }
  }

  return (
    <ActionShell>
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p role="status" className="text-sm text-[#5b5473]">{t('Carregando…')}</p>}
      {data && (
        <>
          <header className="space-y-1">
            <p className="text-sm font-semibold text-[#7240da]">{data.company}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">{t('Parabéns, {candidate}! Esta é a sua proposta', { candidate: data.candidate })}</h1>
          </header>
          <section className={actionCard}>
            <dl className="grid gap-3 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-[#6b6478]">{t('Cargo')}</dt><dd className="font-bold">{data.positionTitle}</dd>
              <dt className="text-[#6b6478]">{t('Contrato')}</dt><dd className="font-semibold">{t(data.contractType)}</dd>
              {data.salary !== null && (<><dt className="text-[#6b6478]">{t('Salário mensal')}</dt><dd className="text-lg font-extrabold text-[#1e1145]">{data.salary.toLocaleString(language, { style: 'currency', currency: 'BRL' })}</dd></>)}
              {data.startDate && (<><dt className="text-[#6b6478]">{t('Início')}</dt><dd className="font-semibold">{new Date(data.startDate).toLocaleDateString(language, { timeZone: 'UTC' })}</dd></>)}
              {data.workSchedule && (<><dt className="text-[#6b6478]">{t('Jornada')}</dt><dd className="font-semibold">{data.workSchedule}</dd></>)}
              {data.workMode && (<><dt className="text-[#6b6478]">{t('Modelo')}</dt><dd className="font-semibold">{t(WORK_MODE[data.workMode] ?? data.workMode)}</dd></>)}
            </dl>
            {data.benefits.length > 0 && <div className="mt-4"><p className="text-sm text-[#6b6478]">{t('Benefícios')}</p><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm font-semibold">{data.benefits.map((item) => <li key={item}>{t(item)}</li>)}</ul></div>}
            {data.message && <p className="mt-4 whitespace-pre-wrap border-l-[3px] border-[#7240da] pl-3 text-sm">{data.message}</p>}
          </section>
          {data.status === 'ACCEPTED' && <Notice tone="success"><strong>{t('Você aceitou a proposta!')}</strong> {t('A empresa já foi avisada e vai entrar em contato com os próximos passos da admissão.')}</Notice>}
          {data.status === 'DECLINED' && <Notice tone="info">{t('Você recusou esta proposta. A empresa foi avisada. Obrigado por participar do processo.')}</Notice>}
          {data.status === 'EXPIRED' && <Notice tone="info">{t('O prazo desta proposta terminou. Fale com a empresa se ainda tiver interesse.')}</Notice>}
          {data.status === 'CANCELED' && <Notice tone="info">{t('Esta proposta foi cancelada pela empresa.')}</Notice>}
          {data.status === 'SENT' && !declining && (
            <section className={`${actionCard} space-y-3`}>
              {data.expiresAt && <p className="text-sm text-[#5b5473]">{t('Responda até')} {new Date(data.expiresAt).toLocaleString(language, { dateStyle: 'long', timeStyle: 'short' })}.</p>}
              <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#7240da]" checked={agree} onChange={(event) => setAgree(event.target.checked)} /> {t('Li a proposta e quero seguir com a contratação.')}</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryBtn} disabled={!agree || busy} onClick={() => respond(true)}>{t('Aceitar proposta')}</button>
                <button type="button" className={outlineBtn} disabled={busy} onClick={() => setDeclining(true)}>{t('Recusar')}</button>
              </div>
              <p className="text-xs text-[#6b6478]">{t('O aceite registra seu interesse. Documentos e contrato vêm na admissão.')}</p>
            </section>
          )}
          {data.status === 'SENT' && declining && (
            <section className={`${actionCard} space-y-3`}>
              <h2 className="font-bold">{t('Pode contar por que vai recusar?')}</h2>
              <textarea aria-label={t('Motivo da recusa (opcional)')} className="min-h-[96px] w-full rounded-[12px] border border-[#d9cdee] p-3 text-base outline-none focus:border-[#7240da]" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t('Opcional. Ex.: aceitei outra proposta, salário abaixo do esperado.')} />
              <div className="flex flex-wrap gap-2"><button type="button" className={primaryBtn} disabled={busy} onClick={() => respond(false)}>{t('Confirmar recusa')}</button><button type="button" className={outlineBtn} disabled={busy} onClick={() => setDeclining(false)}>{t('Voltar')}</button></div>
            </section>
          )}
        </>
      )}
    </ActionShell>
  );
}
