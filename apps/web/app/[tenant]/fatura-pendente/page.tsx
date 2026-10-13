'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api, { ApiError, type CompanyBillingResult } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { useAuth } from '@/app/contexts/AuthContext';

const shell = 'relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fbfafc] p-5 text-[#241b38]';
const glow = <><div aria-hidden="true" className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#e6d9fa] blur-3xl" /><div aria-hidden="true" className="absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" /></>;

function FaturaPendentePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoCheckoutStarted = useRef(false);
  const { user, company, logout, loading, isAuthenticated, refreshUser } = useAuth();
  const [billing, setBilling] = useState<CompanyBillingResult>();
  const [firstLoad, setFirstLoad] = useState(true);
  const [checking, setChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dashboardUrl = `/${company?.slug || company?.id || user?.companyId}/dashboard`;
  const isAdmin = user?.profile?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'DEV';

  function paymentLinkFrom(result?: CompanyBillingResult) {
    return result?.paymentUrl || result?.invoice?.invoiceUrl || null;
  }

  async function loadStatus(manual = false) {
    setChecking(true);
    if (manual) setErrorMessage(null);
    try {
      const result = await api.companyBilling.status();
      setBilling(result);
      if (result.active) {
        toast.success('Pagamento confirmado. Acesso liberado!');
        await refreshUser();
        window.location.assign(dashboardUrl);
      } else if (manual) {
        toast.info('O Asaas ainda não confirmou o pagamento. Assim que confirmar, o acesso abre sozinho.');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Não foi possível verificar o pagamento.';
      if (manual) { setErrorMessage(message); toast.error(message); }
      if (error instanceof ApiError && error.status === 401) router.replace('/login');
    } finally {
      setChecking(false);
      setFirstLoad(false);
    }
  }

  async function generateCheckout() {
    setCreating(true);
    setErrorMessage(null);
    try {
      const result = await api.companyBilling.checkout();
      setBilling((current) => ({ ...current, ...result }));
      const link = paymentLinkFrom(result);
      if (link) {
        // Abre o pagamento já; copiar o link é só um extra e nunca deve atrasar a ida ao Asaas.
        void navigator.clipboard?.writeText(link).catch(() => undefined);
        toast.success('Link de pagamento gerado.');
        window.location.assign(link);
      } else if (result.active) {
        await refreshUser();
        window.location.assign(dashboardUrl);
      } else {
        setErrorMessage('O checkout foi solicitado, mas o Asaas não retornou link de pagamento. Tente novamente em instantes ou fale com o suporte.');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Não foi possível gerar a cobrança.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    const hasStoredToken = Boolean(readAuthSession().token);
    if (!loading && !hasStoredToken && (!isAuthenticated || !user)) router.replace('/login');
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !user || !isAdmin) return;
    void loadStatus(false);
    // Confirma sozinho: o Asaas avisa por webhook; esta consulta cobre o atraso e libera o acesso na hora.
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void loadStatus(false); }, 8000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id, isAdmin]);

  useEffect(() => {
    if (searchParams.get('autoCheckout') !== '1' || !billing || billing.active || paymentLinkFrom(billing) || autoCheckoutStarted.current) return;
    if (!isAdmin) return;
    autoCheckoutStarted.current = true;
    void generateCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing, searchParams, isAdmin]);

  const invoice = billing?.invoice || billing?.currentInvoice;
  const invoiceLink = paymentLinkFrom(billing);
  const invoiceAmount = Number(invoice?.amount ?? 0);
  const safeAmount = Number.isFinite(invoiceAmount) ? invoiceAmount : 0;

  if (loading) return <main role="status" className={shell}>{glow}<div className="relative flex items-center gap-3 text-sm text-[#736d80]"><Loader2 className="animate-spin text-[#7240da]" size={18} /> Carregando sua conta…</div></main>;
  if (!user) return <main className={shell}>{glow}<div className="relative max-w-md space-y-4 rounded-2xl border border-[#e9e5f0] bg-white p-8 text-center shadow-[0_14px_36px_#51227712]"><AlertTriangle className="mx-auto text-amber-500" size={36} /><h1 className="text-xl font-bold">Não conseguimos abrir sua conta agora</h1><p className="text-sm text-[#736d80]">Sua empresa foi criada. Entre com seu e-mail e senha para continuar o pagamento.</p><a href="/login" className="inline-flex min-h-11 items-center rounded-xl bg-[#7240da] px-6 text-sm font-semibold text-white hover:bg-[#5b29be]">Entrar</a></div></main>;

  return (
    <main className={shell}>
      {glow}
      <div className="relative w-full max-w-lg rounded-[22px] border border-[#e9e5f0] bg-white p-7 shadow-[0_24px_70px_#51227716] sm:p-9">
        <div className="mx-auto mb-5 grid h-16 w-16 -rotate-[8deg] place-items-center rounded-2xl bg-[#7240da] text-3xl font-bold text-white" aria-hidden="true">i</div>
        <p className="text-center text-[11px] font-bold uppercase tracking-[2.4px] text-[#7240da]">Innovation RH</p>
        <h1 className="mt-2 text-center text-2xl font-bold tracking-tight">{isAdmin ? 'Falta só o pagamento para liberar o acesso' : 'Acesso temporariamente bloqueado'}</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-[#736d80]">
          {isAdmin ? 'Pague pelo Asaas (Pix, boleto ou cartão). Quando o pagamento for confirmado, o acesso abre sozinho, sem você precisar fazer mais nada.' : 'O acesso da sua empresa está suspenso por uma pendência de pagamento. Avise o administrador da empresa: assim que ele pagar, tudo volta a funcionar.'}
        </p>

        {isAdmin ? (
          <div className="mt-7 space-y-4">
            {firstLoad && !billing && <div className="h-24 animate-pulse rounded-2xl bg-[#f5f3f8]" aria-hidden="true" />}

            {invoice && (
              <div className="rounded-2xl border border-[#e9e5f0] bg-[#fbfafc] p-4 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold text-[#736d80]">Fatura pendente</p><p className="mt-1 text-sm font-bold">{invoice.description || 'Assinatura Innovation'}</p></div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">{invoice.status === 'OVERDUE' ? 'VENCIDA' : 'ABERTA'}</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <span className="text-2xl font-extrabold">{safeAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  {invoice.dueDate && <span className="text-xs text-[#736d80]">Vence em {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}
                </div>
              </div>
            )}

            {errorMessage && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{errorMessage}</p>}

            {invoiceLink ? (
              <button type="button" onClick={() => window.location.assign(invoiceLink)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7240da] font-semibold text-white shadow-[0_12px_30px_-8px_rgba(114,64,218,.6)] transition hover:bg-[#5b29be]"><CreditCard size={18} /> Pagar agora no Asaas ↗</button>
            ) : (
              <button type="button" onClick={() => generateCheckout()} disabled={creating} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7240da] font-semibold text-white shadow-[0_12px_30px_-8px_rgba(114,64,218,.6)] transition hover:bg-[#5b29be] disabled:opacity-60">
                {creating ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />} {creating ? 'Gerando o link…' : 'Gerar link de pagamento'}
              </button>
            )}

            <button type="button" onClick={() => loadStatus(true)} disabled={checking} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e1d9ee] bg-white text-sm font-semibold text-[#7240da] transition hover:border-[#c7b0ed] disabled:opacity-60">
              {checking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Já paguei, verificar agora
            </button>
            <p className="flex items-center justify-center gap-2 text-xs text-[#736d80]"><CheckCircle2 size={14} className="text-[#7240da]" aria-hidden="true" /> Verificamos sozinhos a cada poucos segundos e abrimos o acesso assim que o Asaas confirmar.</p>
            <p className="flex items-center justify-center gap-2 text-xs text-[#736d80]"><ShieldCheck size={14} className="text-[#7240da]" aria-hidden="true" /> Pagamento processado no ambiente seguro do Asaas.</p>
          </div>
        ) : (
          <p className="mt-7 rounded-xl border border-[#e9e5f0] bg-[#fbfafc] p-4 text-center text-sm text-[#736d80]">Nada para fazer por aqui: apenas o administrador consegue regularizar o pagamento.</p>
        )}

        <div className="mt-6 text-center"><button type="button" onClick={logout} className="inline-flex items-center gap-2 text-xs font-semibold text-[#736d80] hover:text-[#7240da]"><LogOut size={15} /> Sair da conta</button></div>
      </div>
    </main>
  );
}

export default function FaturaPendentePageWrapper() {
  return (
    <Suspense fallback={<main className={shell}>{glow}<Loader2 className="relative animate-spin text-[#7240da]" /></main>}>
      <FaturaPendentePage />
    </Suspense>
  );
}
