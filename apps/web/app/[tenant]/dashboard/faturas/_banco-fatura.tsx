'use client';

import { Barcode, Copy, Download, ExternalLink, FileText, Loader2, QrCode, Receipt, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Drawer } from '@/app/components/ui';
import { ApiError, api, type FaturaDetalhes, type PlatformInvoice } from '@/app/lib/api';
import { money, shortDate } from './_format';
import { linhaDoTempo, situacaoDaFatura } from './_fatura-modelo';

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Em aberto', cls: 'bg-amber-100 text-amber-800' },
  OVERDUE: { label: 'Vencida', cls: 'bg-rose-100 text-rose-800' },
  PAID: { label: 'Paga', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELED: { label: 'Cancelada', cls: 'bg-slate-200 text-slate-700' },
};
export const statusOf = (status: string) => STATUS[status] ?? { label: status, cls: 'bg-slate-200 text-slate-700' };

function copy(text: string, what: string) {
  void navigator.clipboard.writeText(text).then(() => toast.success(`${what} copiado.`), () => toast.error('Não foi possível copiar. Selecione e copie manualmente.'));
}

function Action({ href, icon: Icon, children }: { href: string; icon: typeof Download; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line px-4 text-sm font-semibold text-fg hover:bg-black/5"><span className="flex items-center gap-2"><Icon size={16} aria-hidden="true" /> {children}</span><ExternalLink size={14} className="text-fg-mut" aria-hidden="true" /></a>;
}

/** Gaveta com tudo da fatura: pagar (boleto/Pix), recibo, nota fiscal e pedido de reembolso. */
export default function FaturaDrawer({ invoice, canRefund, onClose, onChanged }: { invoice: PlatformInvoice | null; canRefund: boolean; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<FaturaDetalhes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setData(null); setError(null); setRefunding(false); setReason('');
    if (!invoice) return;
    let alive = true;
    api.faturas.empresaFaturaDetalhes(invoice.id)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : 'Não foi possível carregar os detalhes da fatura.'); });
    return () => { alive = false; };
  }, [invoice]);

  async function downloadPdf() {
    if (!invoice) return;
    setDownloading(true);
    try { await api.faturas.empresaFaturaPdf(invoice.id); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : 'Não foi possível baixar a fatura. Tente novamente.'); }
    finally { setDownloading(false); }
  }

  async function requestRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;
    if (reason.trim().length < 10) return void toast.error('Explique o motivo com pelo menos 10 letras.');
    setBusy(true);
    try {
      const r = await api.faturas.empresaPedirReembolso(invoice.id, reason.trim());
      toast.success(`Pedido enviado. Acompanhe pelo chamado ${r.ticketNumber} em Suporte.`);
      setRefunding(false); setReason(''); onChanged();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Não foi possível enviar o pedido de reembolso.'); }
    finally { setBusy(false); }
  }

  const st = invoice ? situacaoDaFatura(invoice) : null;
  const confirmando = st?.chave === 'CONFIRMING';
  const podeReembolsar = canRefund && (st?.chave === 'PAID' || st?.chave === 'PARTIAL_REFUND');
  const pay = data?.payment;
  const nothingToPay = data?.canPay && pay && !pay.barcode && !pay.pixPayload && !pay.paymentPageUrl && !pay.bankSlipUrl;

  return (
    <Drawer isOpen={Boolean(invoice)} onClose={onClose} title={invoice?.description || 'Fatura'} description={invoice ? `Vencimento ${shortDate(invoice.dueDate)}` : undefined} maxWidth="max-w-lg">
      {invoice && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 p-5 text-white">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-widest text-white/70">Valor</span>{st && <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>}</div>
            <p className="mt-1 text-3xl font-black tabular-nums">{money(invoice.amount)}</p>
            {invoice.status === 'PAID' && <p className="mt-1 text-xs text-white/70">Paga em {shortDate(invoice.paidAt ?? invoice.dueDate)}</p>}
          </div>

          <button type="button" disabled={downloading} onClick={() => void downloadPdf()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-fg hover:bg-black/5 disabled:opacity-60">
            {downloading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />} Baixar fatura (PDF)
          </button>

          {!data && !error && <p className="flex items-center gap-2 text-sm text-fg-sub"><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Buscando os dados de pagamento…</p>}
          {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}

          {confirmando && <p role="status" className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-sm font-medium text-sky-900">Recebemos o seu pagamento e estamos aguardando a confirmação do banco. Não é preciso pagar de novo; esta tela atualiza sozinha quando confirmar.</p>}

          {data?.canPay && !confirmando && (
            <section className="space-y-3">
              <h3 className="text-sm font-bold text-fg">Como pagar</h3>
              {pay?.pixPayload && (
                <div className="space-y-2 rounded-2xl border border-line p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-fg"><QrCode size={16} aria-hidden="true" /> Pix</p>
                  {pay.pixQrImage && <img src={pay.pixQrImage} alt="QR Code Pix" width={180} height={180} className="mx-auto rounded-lg border border-line bg-white p-1" />}
                  <p className="break-all rounded-lg bg-black/5 p-2 font-mono text-[11px] text-fg-sub">{pay.pixPayload}</p>
                  <button type="button" className="btn btn-primary w-full text-sm" onClick={() => copy(pay.pixPayload!, 'Código Pix')}><Copy size={14} aria-hidden="true" /> Copiar Pix copia e cola</button>
                  {pay.pixExpiresAt && <p className="text-center text-[11px] text-fg-mut">Válido até {new Date(pay.pixExpiresAt).toLocaleString('pt-BR')}</p>}
                </div>
              )}
              {pay?.barcode && (
                <div className="space-y-2 rounded-2xl border border-line p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-fg"><Barcode size={16} aria-hidden="true" /> Boleto</p>
                  <p className="break-all rounded-lg bg-black/5 p-2 font-mono text-xs text-fg">{pay.barcode}</p>
                  <button type="button" className="btn btn-outline w-full text-sm" onClick={() => copy(pay.barcode!.replace(/\D/g, ''), 'Código de barras')}><Copy size={14} aria-hidden="true" /> Copiar código de barras</button>
                  {pay.bankSlipUrl && <Action href={pay.bankSlipUrl} icon={Download}>Baixar boleto (PDF)</Action>}
                </div>
              )}
              {!pay?.barcode && pay?.bankSlipUrl && <Action href={pay.bankSlipUrl} icon={Download}>Baixar boleto (PDF)</Action>}
              {pay?.paymentPageUrl && <Action href={pay.paymentPageUrl} icon={ExternalLink}>Abrir página de pagamento (cartão, Pix ou boleto)</Action>}
              {nothingToPay || (!pay?.paymentPageUrl && !pay?.barcode && !pay?.pixPayload && !pay?.bankSlipUrl) ? (
                <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">O pagamento desta fatura ainda não foi gerado pelo provedor. {data.asaasReady ? 'Tente novamente em instantes ou fale com o suporte.' : 'Nosso financeiro vai enviar o link de pagamento para você.'}</p>
              ) : null}
            </section>
          )}

          {data && !data.canPay && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-fg">Documentos</h3>
              {data.receiptUrl ? <Action href={data.receiptUrl} icon={Receipt}>Ver / baixar recibo</Action> : <p className="text-sm text-fg-mut">O recibo ainda não está disponível.</p>}
            </section>
          )}

          {data?.fiscal && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-fg">Nota fiscal {data.fiscal.number ? `nº ${data.fiscal.number}` : ''}</h3>
              {data.fiscal.pdfUrl && <Action href={data.fiscal.pdfUrl} icon={FileText}>Baixar nota fiscal (PDF)</Action>}
              {data.fiscal.xmlUrl && <Action href={data.fiscal.xmlUrl} icon={FileText}>Baixar XML</Action>}
            </section>
          )}
          {data && !data.fiscal && invoice.status === 'PAID' && <p className="text-xs text-fg-mut">A nota fiscal aparece aqui assim que for emitida.</p>}

          <section aria-label="Histórico da fatura" className="space-y-2">
            <h3 className="text-sm font-bold text-fg">Histórico</h3>
            <ol className="space-y-3 border-l border-line pl-4">
              {linhaDoTempo(invoice).map((e, i) => (
                <li key={`-`} className="relative">
                  <span aria-hidden="true" className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${e.tom === 'ok' ? 'bg-emerald-500' : e.tom === 'erro' ? 'bg-rose-500' : e.tom === 'alerta' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <p className="text-sm font-semibold text-fg">{e.titulo}{e.detalhe ? <span className="font-normal text-fg-sub"> · {e.detalhe}</span> : null}</p>
                  <p className="text-xs text-fg-mut">{new Date(e.quando).toLocaleString('pt-BR')}</p>
                </li>
              ))}
            </ol>
          </section>

          {podeReembolsar && (
            <section className="space-y-2 border-t border-line pt-4">
              {!refunding ? (
                <button type="button" className="btn btn-outline w-full text-sm" onClick={() => setRefunding(true)}><RotateCcw size={14} aria-hidden="true" /> Solicitar reembolso</button>
              ) : (
                <form onSubmit={requestRefund} className="space-y-2">
                  <p className="text-sm text-fg-sub">O pedido abre um chamado e o financeiro responde por lá. O reembolso não é automático.</p>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Conte o motivo do reembolso" className="w-full rounded-xl border border-line bg-transparent p-3 text-sm text-fg" required />
                  <div className="flex gap-2"><button type="button" className="btn btn-outline flex-1 text-sm" onClick={() => setRefunding(false)} disabled={busy}>Voltar</button><button type="submit" className="btn btn-primary flex-1 text-sm" disabled={busy}>{busy ? 'Enviando…' : 'Enviar pedido'}</button></div>
                </form>
              )}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
