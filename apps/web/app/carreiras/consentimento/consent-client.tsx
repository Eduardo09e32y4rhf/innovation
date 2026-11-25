'use client';

import Link from 'next/link';
import { useState } from 'react';
import { consentAction } from '../_lib/public-jobs';
import { useI18n } from '@/app/contexts/I18nContext';

const PURPOSE: Record<string, string> = { APPLICATION: 'tratamento dos dados da candidatura', TALENT_POOL: 'banco de talentos', SENSITIVE_DATA: 'dados de diversidade' };

/** Link do recibo de consentimento: confirmar o banco de talentos (duplo aceite) ou revogar. Exige clique explicito. */
export function ConsentClient({ token, action }: { token: string; action: 'confirm' | 'revoke' }) {
  const { t } = useI18n();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const revoke = action === 'revoke';

  async function run() {
    setState('busy');
    try {
      const result = await consentAction(action, token);
      const what = t(PURPOSE[result.purpose] ?? 'consentimento');
      setMessage(revoke ? `${t('Consentimento revogado')}: ${what}. ${result.purpose === 'APPLICATION' ? t('Seus dados serão eliminados na próxima rotina de retenção.') : ''}` : `${t('Confirmado')}: ${what}. ${t('Seu perfil já pode aparecer no banco de talentos.')}`);
      setState('done');
    } catch (cause) {
      setMessage(t(cause instanceof Error ? cause.message : 'Link inválido ou expirado.'));
      setState('error');
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t(revoke ? 'Revogar consentimento' : 'Confirmar consentimento')}</h1>
      {!token ? (
        <p role="alert" className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800">{t('Link incompleto. Abra o link do e-mail novamente.')}</p>
      ) : state === 'done' ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>
      ) : (
        <div className="card-v2 space-y-4 p-5">
          {state === 'error' && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{message}</p>}
          <p className="text-sm">{t(revoke ? 'Você quer revogar este consentimento? Você pode conceder de novo quando quiser.' : 'Confirme que foi você quem autorizou o banco de talentos.')}</p>
          <button type="button" className="btn btn-primary min-h-11 w-full" disabled={state === 'busy'} onClick={run}>{state === 'busy' ? t('Aguarde…') : revoke ? t('Revogar') : t('Confirmar')}</button>
        </div>
      )}
      <Link className="text-sm underline" href="/carreiras/privacidade">{t('Meus dados')}</Link>
    </main>
  );
}
