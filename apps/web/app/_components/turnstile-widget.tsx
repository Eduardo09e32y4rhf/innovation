'use client';

import { useEffect, useRef, useState } from 'react';
import { registerTurnstileReset, setTurnstileToken, TURNSTILE_SITE_KEY } from '@/app/lib/turnstile';

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi; __turnstileLoading?: Promise<void> } }

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (window.__turnstileLoading) return window.__turnstileLoading;
  window.__turnstileLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC; script.async = true; script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { window.__turnstileLoading = undefined; script.remove(); reject(new Error('turnstile')); };
    document.head.appendChild(script);
  });
  return window.__turnstileLoading;
}

/**
 * Widget anti-robo. O token fica guardado em lib/turnstile e e enviado automaticamente (header x-turnstile-token)
 * nas rotas protegidas; apos cada envio o desafio e renovado. Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY nao renderiza nada.
 */
export function TurnstileWidget({ className = '' }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'done' | 'failed'>('loading');

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !host.current) return;
    let widgetId: string | undefined;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !host.current || !window.turnstile) return;
      widgetId = window.turnstile.render(host.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'auto',
        size: 'flexible',
        language: 'pt-br',
        callback: (value: string) => { setTurnstileToken(value); setState('done'); },
        'expired-callback': () => { setTurnstileToken(''); setState('ready'); },
        'error-callback': () => { setTurnstileToken(''); setState('failed'); },
        'timeout-callback': () => { setTurnstileToken(''); setState('ready'); },
      });
      registerTurnstileReset(() => { setState('ready'); if (widgetId) window.turnstile?.reset(widgetId); });
      setState('ready');
    }).catch(() => { if (!cancelled) setState('failed'); });
    return () => {
      cancelled = true;
      setTurnstileToken('');
      registerTurnstileReset(null);
      if (widgetId) try { window.turnstile?.remove(widgetId); } catch { /* ja removido */ }
    };
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;
  return (
    <div role="group" aria-label="Verificação anti-robô" className={`w-full max-w-full overflow-hidden ${className}`}>
      <div ref={host} className="min-h-[65px] w-full" />
      <p role="status" aria-live="polite" className={state === 'failed' ? 'mt-1 text-xs text-rose-700' : 'sr-only'}>
        {state === 'failed' ? 'Não foi possível carregar a verificação anti-robô. Desative bloqueadores de conteúdo e recarregue a página.' : state === 'done' ? 'Verificação anti-robô concluída.' : 'Carregando verificação anti-robô.'}
      </p>
    </div>
  );
}
