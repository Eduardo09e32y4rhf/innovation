'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import api from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { useAuth } from '@/app/contexts/AuthContext';

const POLL_MS = 2500;
const GIVE_UP_MS = 90_000;
const SLOW_HINT_MS = 15_000;

/**
 * Volta do pagamento no Asaas: confirma a cobrança e entra no painel (onde vêm o termo de uso,
 * as boas-vindas e o passo a passo). Se o Asaas demorar, devolve à tela de pagamento sem perder a sessão.
 */
export default function PagamentoRetornoPage() {
  const router = useRouter();
  const { user, company, loading, isAuthenticated, refreshUser } = useAuth();

  const [confirmed, setConfirmed] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);

  const started = useRef(false);
  const slug = company?.slug || company?.id || user?.companyId;

  useEffect(() => {
    if (loading || started.current) return;

    if (!isAuthenticated && !readAuthSession().token) {
      router.replace('/login?payment=success');
      return;
    }

    if (!isAuthenticated) return;

    // Se autenticou mas não há slug da empresa disponível, evita spinner infinito
    if (!slug) {
      router.replace('/login?payment=success');
      return;
    }

    started.current = true;
    const startedAt = Date.now();
    const encodedSlug = encodeURIComponent(String(slug));

    let stopped = false;
    let attempt = 0;
    let timerId: number | undefined;

    const tick = async () => {
      if (stopped) return;

      try {
        // O GET de status só lê: a baixa vem do webhook ou da conciliação.
        // Pede a conciliação na 1ª vez e a cada 4 consultas.
        if (attempt++ % 4 === 0) {
          await api.companyBilling.syncPayment().catch(() => undefined);
        }

        const status = await api.companyBilling.status();

        if (status.active) {
          stopped = true;
          setConfirmed(true);
          // Garante o redirecionamento mesmo se refreshUser oscilar
          await refreshUser().catch(() => undefined);
          router.replace(`/${encodedSlug}/dashboard`);
          return;
        }
      } catch {
        // Tenta novamente até o limite de tempo
      }

      const elapsed = Date.now() - startedAt;

      if (elapsed > SLOW_HINT_MS && !stopped) {
        setTakingLonger(true);
      }

      if (elapsed > GIVE_UP_MS) {
        stopped = true;
        router.replace(`/${encodedSlug}/fatura-pendente?paid=1`);
        return;
      }

      if (!stopped) {
        timerId = window.setTimeout(tick, POLL_MS);
      }
    };

    void tick();

    return () => {
      stopped = true;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, slug]);

  return (
    <main
      role="status"
      aria-live="polite"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbfafc] p-5 text-[#241b38]"
    >
      <div aria-hidden="true" className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#e6d9fa] blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />

      <div className="relative w-full max-w-md rounded-[22px] border border-[#e9e5f0] bg-white p-9 text-center shadow-[0_24px_70px_#51227716]">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#f0e8fd] text-[#7240da]">
          {confirmed ? <CheckCircle2 size={34} /> : <Loader2 size={30} className="animate-spin" />}
        </div>

        <h1 className="text-xl font-bold tracking-tight">
          {confirmed ? 'Pagamento confirmado!' : 'Confirmando seu pagamento…'}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[#736d80]">
          {confirmed
            ? 'Abrindo o seu painel.'
            : 'Isso leva só alguns segundos. Não feche esta página: assim que o Asaas confirmar, abrimos o seu painel.'}
        </p>

        {!confirmed && takingLonger && slug && (
          <div className="mt-5 border-t border-[#e9e5f0] pt-4 text-xs text-[#736d80] space-y-2">
            <p>A compensação bancária está demorando um pouco mais que o normal.</p>
            <Link
              href={`/${encodeURIComponent(String(slug))}/fatura-pendente?paid=1`}
              className="inline-block font-semibold text-[#7240da] underline hover:text-[#5b2ec2]"
            >
              Acompanhar na tela de fatura
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
