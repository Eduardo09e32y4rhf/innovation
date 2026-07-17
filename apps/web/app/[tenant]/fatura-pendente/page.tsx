'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api, { ApiError, type CompanyBillingResult } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';

export default function FaturaPendentePage() {
  const router = useRouter();
  const { user, company, logout, loading, isAuthenticated } = useAuth();
  const [billing, setBilling] = useState<CompanyBillingResult>();
  const [checking, setChecking] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadStatus() {
    try {
      const result = await api.companyBilling.status();
      setBilling(result);
      if (result.active) {
        toast.success('Pagamento confirmado. Acesso liberado!');
        window.location.assign(`/${company?.id || user?.companyId}/dashboard`);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) router.replace('/login');
    } finally {
      setChecking(false);
    }
  }

  async function generateCheckout() {
    setCreating(true);
    try {
      const result = await api.companyBilling.checkout();
      setBilling((current) => ({ ...current, ...result }));
      if (result.paymentUrl) window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
      else if (result.active) window.location.assign(`/${company?.id || user?.companyId}/dashboard`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Nao foi possivel gerar a cobranca.');
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (!loading && (!isAuthenticated || !user)) router.replace('/login');
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    void loadStatus();
    const interval = window.setInterval(loadStatus, 5000);
    return () => window.clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  if (loading || !user) return null;
  const invoice = billing?.invoice;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.12),transparent_48%)]" />
      <div className="relative w-full max-w-xl overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/85 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-400/20">
          {checking ? <Loader2 size={42} className="animate-spin" /> : <AlertTriangle size={44} />}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-400">Innovation RH</p>
        <h1 className="mt-2 text-2xl font-black text-white">Regularize para liberar o acesso</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          A empresa esta aguardando a confirmacao da assinatura. Assim que o Asaas confirmar o pagamento, o acesso sera liberado automaticamente.
        </p>

        {user.profile?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'ADMIN' ? (
          <div className="mt-7 space-y-4">
            {invoice && (
              <div className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-bold text-slate-400">Fatura pendente</p><p className="mt-1 text-sm font-black text-white">{invoice.description || 'Assinatura Innovation'}</p></div>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black text-amber-300">{invoice.status === 'OVERDUE' ? 'VENCIDA' : 'ABERTA'}</span>
                </div>
                <div className="mt-4 flex items-end justify-between"><span className="text-2xl font-black text-white">{Number(invoice.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span className="text-xs text-slate-500">Vence em {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span></div>
              </div>
            )}

            {invoice?.invoiceUrl ? (
              <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-400 font-black text-slate-950 transition hover:bg-teal-300"><CreditCard size={18} /> Pagar agora no Asaas</a>
            ) : (
              <button onClick={generateCheckout} disabled={creating} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-400 font-black text-slate-950 transition hover:bg-teal-300 disabled:opacity-60">{creating ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />} Gerar link de pagamento</button>
            )}

            <button onClick={loadStatus} disabled={checking} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-slate-200 hover:bg-white/10"><RefreshCw size={16} /> Ja paguei, verificar agora</button>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={14} className="text-teal-500" /> Pagamento processado no ambiente seguro do Asaas</div>
          </div>
        ) : (
          <p className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Solicite ao administrador da empresa a regularizacao da assinatura.</p>
        )}

        <button onClick={logout} className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-white"><LogOut size={15} /> Sair da conta</button>
      </div>
    </main>
  );
}