'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Cookie } from 'lucide-react';
import { onConsentOpen, readConsent, saveConsent, type ConsentChoice } from '../lib/cookie-consent';

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ConsentChoice | null>(null);
  const firstButton = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const saved = readConsent();
    setCurrent(saved);
    setOpen(saved === null);
    return onConsentOpen(() => { setCurrent(readConsent()); setOpen(true); });
  }, []);

  useEffect(() => {
    if (open && current !== null) firstButton.current?.focus();
  }, [open, current]);

  if (!open) return null;

  const choose = (choice: ConsentChoice) => {
    saveConsent(choice);
    setCurrent(choice);
    setOpen(false);
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-text" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#0b1324]/95 p-4 text-white shadow-2xl backdrop-blur sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 sm:flex" aria-hidden="true"><Cookie size={18} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="cookie-title" className="text-base font-semibold">Cookies e privacidade</h2>
          <p id="cookie-text" className="mt-1 text-sm leading-relaxed text-white/75">
            Usamos o que é essencial para o site funcionar com segurança, como lembrar a sua escolha e manter o login. Com o seu aceite, também contamos a sua visita de forma anônima, só com data, hora e lugar aproximado: não guardamos o seu IP e não identificamos você. Você pode mudar de ideia quando quiser em &quot;Preferências de cookies&quot;, no rodapé.{' '}
            <Link href="/privacidade#cookies" className="font-medium text-white underline underline-offset-2 hover:text-white/90">Saiba mais</Link>
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button ref={firstButton} type="button" onClick={() => choose('declined')} className="min-h-11 rounded-xl border border-white/40 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Recusar
            </button>
            <button type="button" onClick={() => choose('accepted')} className="min-h-11 rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Aceitar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
