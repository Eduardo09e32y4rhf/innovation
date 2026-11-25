'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ActionShell, Notice, actionCard, primaryBtn } from '../../_components/action-shell';
import { errorMessage, processPublic, sentence, type PublicSlots } from '../../_lib/process-public';
import { useI18n } from '@/app/contexts/I18nContext';
import { useLanguage } from '@/app/contexts/LanguageContext';

/** Autoagendamento: o candidato escolhe um dos horarios oferecidos pelo RH. */
export function SlotsClient({ token }: { token: string }) {
  const { t } = useI18n();
  const { language } = useLanguage();
  const [data, setData] = useState<PublicSlots | null>(null);
  const [error, setError] = useState('');
  const [choice, setChoice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => processPublic.slots(token).then(setData).catch((cause) => setError(t(errorMessage(cause, 'Link não encontrado.'))));
  useEffect(() => { void load(); }, [token, t]); // eslint-disable-line react-hooks/exhaustive-deps

  async function book() {
    if (!choice) return;
    setBusy(true); setError('');
    try { setData(await processPublic.book(token, choice)); }
    catch (cause) { setError(t(errorMessage(cause, 'Não foi possível marcar.'))); void load(); setChoice(''); } finally { setBusy(false); }
  }

  return (
    <ActionShell>
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p role="status" className="text-sm text-[#5b5473]">{t('Carregando…')}</p>}
      {data && (
        <>
          <header className="space-y-1">
            <p className="text-sm font-semibold text-[#7240da]">{data.company}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1e1145]">{t('Olá, {candidate}! Escolha seu horário', { candidate: data.candidate })}</h1>
            <p className="text-[#5b5473]">{t('Entrevista')} {t(data.mode === 'ONLINE' ? 'online' : 'presencial')} {t('para')} <strong>{data.job}</strong>, {t('cerca de {minutes} min, com {interviewer}.', { minutes: data.durationMinutes, interviewer: data.interviewer })}</p>
          </header>
          {data.message && <Notice tone="info">{data.message}</Notice>}
          {data.status === 'BOOKED' && data.booked && (
            <Notice tone="success"><strong>{t('Entrevista marcada para {when}.', { when: data.booked.when })}</strong> {t('Enviamos a confirmação por e-mail com')} {t(data.mode === 'ONLINE' ? 'o link da reunião' : 'o endereço')} {t('e o convite para sua agenda.')}{data.booked.responseToken && <> <Link className="font-semibold underline" href={`/carreiras/entrevista/${data.booked.responseToken}`}>{t('Ver detalhes')}</Link></>}</Notice>
          )}
          {data.status === 'PENDING' && (
            data.slots.length ? (
              <section className={`${actionCard} space-y-3`}>
                <fieldset className="space-y-2">
                  <legend className="mb-2 font-bold">{t('Horários disponíveis (horário de Brasília)')}</legend>
                  {data.slots.map((slot) => (
                    <label key={slot.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[12px] border px-4 text-sm font-semibold transition ${choice === slot.value ? 'border-[#7240da] bg-[#f0eafa] text-[#5b29be]' : 'border-[#e4dcef] hover:bg-[#f8f5fd]'}`}>
                      <input type="radio" name="slot" className="h-5 w-5 accent-[#7240da]" value={slot.value} checked={choice === slot.value} onChange={() => setChoice(slot.value)} /> {sentence(slot.label)}
                    </label>
                  ))}
                </fieldset>
                <button type="button" className={`${primaryBtn} w-full sm:w-auto`} disabled={!choice || busy} onClick={book}>{busy ? t('Marcando…') : t('Confirmar este horário')}</button>
                <p className="text-xs text-[#6b6478]">{t('Disponível até')} {new Date(data.expiresAt).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' })}.</p>
              </section>
            ) : <Notice tone="info">{t('Os horários oferecidos já foram ocupados. A empresa vai te enviar novas opções.')}</Notice>
          )}
          {data.status === 'EXPIRED' && <Notice tone="info">{t('O prazo para escolher terminou. Fale com a empresa para receber novos horários.')}</Notice>}
          {data.status === 'CANCELED' && <Notice tone="info">{t('Estes horários foram cancelados pela empresa.')}</Notice>}
        </>
      )}
    </ActionShell>
  );
}
