'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import api from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { useAuth } from '@/app/contexts/AuthContext';

const POLL_MS = 2500;
const GIVE_UP_MS = 90_000;

/**
 * Volta do pagamento no Asaas: confirma a cobrança e entra no painel (onde vêm o termo de uso,
 * as boas-vindas e o passo a passo). Se o Asaas demorar, devolve à tela de pagamento sem perder a sessão.
 */
export default function PagamentoRetornoPage() {
  const router = useRouter();
  const { user, company, loading, isAuthenticated, refreshUser } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const started = useRef(false);
  const slug = company?.slug || company?.id || user?.companyId;

  useEffect(() => {
    if (loading || started.current) return;
    if (!isAuthenticated && !readAuthSession().token) { router.replace('/login?payment=success'); return; }
    if (!isAuthenticated || !slug) return;
    started.current = true;
    const startedAt = Date.now();
    let stopped = false;
    let attempt = 0;
    const tick = async () => {
      if (stopped) return;
      try {
        // O GET de status so le: a baixa vem do webhook ou da conciliacao. Pede a conciliacao na 1a vez e a cada 4 consultas.
        if (attempt++ % 4 === 0) await api.companyBilling.syncPayment().catch(() => undefined);
        const status = await api.companyBilling.status();
        if (status.active) {
          setConfirmed(true);
          await refreshUser();
          router.replace(`/${encodeURIComponent(String(slug))}/dashboard`);
          return;
        }
      } catch { /* tenta de novo até o limite */ }
      if (Date.now() - startedAt > GIVE_UP_MS) { router.replace(`/${encodeURIComponent(String(slug))}/fatura-pendente?paid=1`); return; }
      window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => { stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, slug]);

  return <main role="status" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbfafc] p-5 text-[#241b38]">
    <div aria-hidden="true" className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#e6d9fa] blur-3xl" />
    <div aria-hidden="true" className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />
    <div className="relative w-full max-w-md rounded-[22px] border border-[#e9e5f0] bg-white p-9 text-center shadow-[0_24px_70px_#51227716]">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#f0e8fd] text-[#7240da]">{confirmed ? <CheckCircle2 size={34} /> : <Loader2 size={30} className="animate-spin" />}</div>
      <h1 className="text-xl font-bold tracking-tight">{confirmed ? 'Pagamento confirmado!' : 'Confirmando seu pagamento…'}</h1>
      <p className="mt-2 text-sm leading-relaxed text-[#736d80]">{confirmed ? 'Abrindo o seu painel.' : 'Isso leva só alguns segundos. Não feche esta página: assim que o Asaas confirmar, abrimos o seu painel.'}</p>
    </div>
  </main>;
}
