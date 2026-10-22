'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api, { ApiError, type FaturasCompanyRow, type InvoiceAdjustment, type PlatformInvoice } from '@/app/lib/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { hasPermission, type Permission } from '@/app/lib/permissions';
import CompanyInvoicesView from './_company-view';
import Integration from './_integration';
import { useGuard } from '@/app/hooks/use-action';
import { Dialog, TYPE_LABEL, brl, ActionDialog } from './ficha/action-dialog';

/** `part` divide a ficha entre as abas Assinatura (ações, avisos e histórico) e Faturas (cobrança avulsa e lista); sem ele mostra tudo. */
export default function CompanyFicha({ company, onChanged, part = 'todas', readOnly = false }: { company: FaturasCompanyRow; onChanged?: () => void; part?: 'todas' | 'acoes' | 'faturas'; readOnly?: boolean }) {
  const showActions = part !== 'faturas';
  const showInvoices = part !== 'acoes';
  const { user } = useAuth();
  // `readOnly` (ex.: Contabilidade no Financeiro) só consulta: nenhuma ação de cobrança aparece.
  const can = (p: Permission) => (!readOnly || p === 'faturas.ver') && hasPermission(user, p);
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [history, setHistory] = useState<InvoiceAdjustment[]>([]);
  const paused = Boolean(company.subscription?.billingPaused);
  const [pausedNow, setPausedNow] = useState(paused);

  const loadHistory = useCallback(async () => {
    try { setHistory(await api.faturas.adjustments(company.id)); } catch { setHistory([]); }
  }, [company.id]);
  useEffect(() => { void loadHistory(); }, [loadHistory, reloadKey]);

  const hasSub = Boolean(company.subscription);
  const blocked = company.status !== 'ACTIVE' || ['PENDING_PAYMENT', 'PAST_DUE', 'CANCELED'].includes(company.billingStatus);
  const refresh = () => { setReloadKey((k) => k + 1); onChanged?.(); };
  const needSub = hasSub ? undefined : 'Esta empresa ainda não tem assinatura. Ative a assinatura primeiro.';

  async function togglePause() {
    try {
      if (pausedNow) await api.faturas.resumeBilling(company.id); else await api.faturas.pauseBilling(company.id);
      setPausedNow(!pausedNow);
      toast.success(pausedNow ? 'Cobrança retomada.' : 'Cobrança pausada.');
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível alterar a cobrança.'); }
  }

  const { guard } = useGuard();
  const syncInvoice = guard('syncInvoice', async (inv: PlatformInvoice) => {
    try { await api.faturas.syncInvoice(inv.id); toast.success('Fatura sincronizada com o provedor.'); refresh(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível sincronizar.'); }
  });

  async function gerarBoleto(inv: PlatformInvoice) {
    try { await api.faturas.gerarBoleto(inv.id); toast.success('Cobrança convertida em boleto. Baixe a Fatura PDF para ver o código de barras.'); refresh(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o boleto.'); }
  }

  async function downloadPdf(inv: PlatformInvoice) {
    try { await api.faturas.faturaPdf(inv.id); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível baixar a fatura.'); }
  }

  async function copyLink(inv: PlatformInvoice) {
    try { await navigator.clipboard.writeText(inv.invoiceUrl ?? ''); toast.success('Link de pagamento copiado. Envie ao cliente.'); }
    catch { toast.error('Não foi possível copiar. Abra a fatura e copie o endereço manualmente.'); }
  }

  async function emitFiscal(inv: PlatformInvoice) {
    try { const r = await api.faturas.emitFiscal(inv.id); toast.success(r.message); refresh(); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível emitir a nota no Asaas.'); }
  }

  async function manualMp(inv: PlatformInvoice) {
    try {
      const updated = await api.faturas.manualMercadoPago(inv.id);
      if (updated.invoiceUrl) await navigator.clipboard.writeText(updated.invoiceUrl).catch(() => undefined);
      toast.success('Link do Mercado Pago gerado e copiado. Envie ao cliente.');
      refresh();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Não foi possível gerar o link do Mercado Pago.'); }
  }

  const rowActions = (inv: PlatformInvoice) => {
    const open = inv.status === 'OPEN' || inv.status === 'OVERDUE';
    const btn = 'btn btn-outline text-xs';
    return (
      <span className="inline-flex flex-wrap justify-end gap-1.5">
        {open && inv.asaasPaymentId && inv.provider !== 'MERCADOPAGO' && inv.billingType !== 'BOLETO' && can('faturas.cobrar') && <button type="button" className={btn} title="Troca esta cobrança para boleto no Asaas: o PDF passa a ter linha digitável e código de barras" onClick={() => void gerarBoleto(inv)}>Gerar boleto</button>}
        <button type="button" className={btn} title="Baixa a fatura em PDF com a sua logo" onClick={() => void downloadPdf(inv)}>Fatura PDF</button>
        {open && inv.invoiceUrl && can('faturas.ver') && <button type="button" className={btn} title="Copia o link de pagamento (Pix, boleto ou cartão) para enviar ao cliente" onClick={() => void copyLink(inv)}>Copiar link</button>}
        {open && can('faturas.desconto') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'discount', invoice: inv })}>Desconto</button>}
        {open && can('faturas.cobrar') && !inv.asaasPaymentId && !['PROCESSING', 'UNKNOWN'].includes(inv.paymentProcessingStatus ?? '') && <button type="button" className={btn} onClick={() => void manualMp(inv)} title="Gerar link para fatura local sem cobrança ativa no Asaas">Link Mercado Pago</button>}
        {open && can('faturas.cobrar') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'cancel', invoice: inv })}>Cancelar</button>}
        {inv.status === 'PAID' && inv.refundStatus !== 'PROCESSING' && Number(inv.refundedAmount ?? 0) < Number(inv.amount) && can('faturas.reembolsar') && <>
          <button type="button" className={btn} onClick={() => setDialog({ kind: 'refundPartial', invoice: inv })}>Reembolso parcial</button>
          <button type="button" className={btn} onClick={() => setDialog({ kind: 'refundFull', invoice: inv })}>Reembolso total</button>
        </>}
        {inv.status !== 'CANCELED' && can('faturas.cobrar') && (inv.asaasPaymentId || inv.mpPaymentId || ['PROCESSING', 'UNKNOWN'].includes(inv.paymentProcessingStatus ?? '')) && <button type="button" className={btn} onClick={() => void syncInvoice(inv)}>Sincronizar</button>}
        {inv.status === 'PAID' && inv.asaasPaymentId && inv.provider !== 'MERCADOPAGO' && can('faturas.nf_anexar') && inv.invoiceStatus !== 'AUTHORIZED' && <button type="button" className={btn} onClick={() => void emitFiscal(inv)} title="Agenda a NFS-e no Asaas ou puxa a que já existe">{inv.asaasInvoiceId ? 'Atualizar nota (Asaas)' : 'Emitir nota (Asaas)'}</button>}
        {inv.status !== 'CANCELED' && can('faturas.nf_anexar') && <button type="button" className={btn} onClick={() => setDialog({ kind: 'fiscal', invoice: inv })}>NF / comprovante</button>}
      </span>
    );
  };

  return (
    <div>
      {part === 'faturas' && can('faturas.cobrar') && (
        <section className="flex flex-wrap gap-2 px-3 pt-4 sm:px-5 lg:px-6" aria-label="Ações das faturas">
          <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'charge' })}>Nova cobrança</button>
        </section>
      )}

      {showActions && <>
      <section className="flex flex-wrap gap-2 px-3 pt-4 sm:px-5 lg:px-6" aria-label="Ações da empresa">
        {part === 'todas' && can('faturas.cobrar') && <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'charge' })}>Nova cobrança</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'seats' })}>Usuários</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'plan' })}>Trocar plano</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'recurring' })}>Desconto recorrente</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'freeDays' })}>Dias grátis</button>}
        {can('faturas.desconto') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'coupon' })}>Cupom</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm text-rose-700" disabled={!hasSub} title={needSub} onClick={() => setDialog({ kind: 'cancelSub' })}>Cancelar assinatura</button>}
        {can('faturas.cobrar') && <button type="button" className="btn btn-outline text-sm" disabled={!hasSub} title={needSub} onClick={() => void togglePause()}>{pausedNow ? 'Retomar cobrança' : 'Pausar cobrança'}</button>}
      </section>

      {blocked && can('faturas.cobrar') && (
        <div role="alert" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-800 sm:mx-5 lg:mx-6">
          <span><strong>Acesso bloqueado por pendência.</strong> Só o administrador consegue entrar, e apenas na área de Faturas. Libere se recebeu por outro meio ou por confiança.</span>
          <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'release' })}>Liberar acesso</button>
        </div>
      )}

      {!hasSub && (
        <div role="status" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-800 sm:mx-5 lg:mx-6">
          <span>Esta empresa não tem assinatura ativa. Usuários, plano, descontos, dias grátis, cupom e pausa só funcionam depois de ativar.</span>
          {can('faturas.cobrar') && <button type="button" className="btn btn-primary text-sm" onClick={() => setDialog({ kind: 'activate' })}>Ativar assinatura</button>}
        </div>
      )}

      {can('faturas.cobrar') && (
        <div className="px-3 pt-4 sm:px-5 lg:px-6">
          <Integration companyId={company.id} canRetry={!readOnly && role === 'DEV'} canSwitch={!readOnly && (role === 'DEV' || role === 'CEO')} />
        </div>
      )}

      </>}

      {showInvoices && <CompanyInvoicesView companyId={company.id} rowActions={rowActions} reloadKey={reloadKey} />}

      {showActions && history.length > 0 && (
        <section className="px-3 pb-6 sm:px-5 lg:px-6">
          <h2 className="mb-2 text-sm font-semibold text-fg">Histórico de ajustes</h2>
          <ul className="card-v2 divide-y divide-line text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span><strong className="text-fg">{TYPE_LABEL[h.type]}</strong> <span className="text-fg-sub">· {h.reason}</span></span>
                <span className="text-xs text-fg-mut">
                  {h.amount ? `${brl(h.amount)} · ` : ''}{h.days ? `${h.days} dias · ` : ''}{new Date(h.createdAt).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog && <ActionDialog dialog={dialog} company={company} onClose={() => setDialog(null)} onDone={refresh} />}
    </div>
  );
}
