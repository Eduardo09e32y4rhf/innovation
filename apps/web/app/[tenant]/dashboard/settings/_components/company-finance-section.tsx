'use client';

import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { CreditCard, ExternalLink, FileText, Download } from 'lucide-react';

export function CompanyFinanceSection({ tenant }: { tenant: string }) {
  const { data: plans } = useQuery(
    () => api.request<any[]>('/auth/public-plans'),
    [],
  );

  const { data: billing } = useQuery(
    () => api.request<any>('/finance/company/status'),
    [],
  );

  const { data: invoices } = useQuery(
    () => api.request<any[]>('/finance/company/invoices'),
    [],
  );

  async function payInvoice() {
    try {
      const checkout = await api.request<{
        active: boolean;
        paymentUrl: string | null;
      }>('/finance/company/checkout', {
        method: 'POST',
      });

      if (!checkout.paymentUrl) {
        throw new Error('Nenhuma cobrança em aberto foi encontrada.');
      }

      window.open(checkout.paymentUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar pagamento');
    }
  }

  return (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard size={19} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">
              Gestão Financeira
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Gerencie sua assinatura, pagamentos e notas fiscais.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Status da Assinatura
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {billing?.status === 'ACTIVE' ? 'Ativa' : billing?.status || 'Carregando...'}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={payInvoice}
                className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-700"
              >
                Pagar Mensalidade
              </button>
              <button
                type="button"
                disabled
                title="Troca de plano em implementação"
                className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-bold text-slate-400 cursor-not-allowed"
              >
                Alterar Plano
              </button>
            </div>
          </div>
        </div>

        {invoices && invoices.length > 0 && (
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Histórico de Faturas
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        R$ {(invoice.amount / 100).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          invoice.status === 'OVERDUE' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-3 text-xs font-bold">
                        {invoice.invoiceUrl && (
                          <a
                            href={invoice.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-violet-600 hover:text-violet-800"
                          >
                            <ExternalLink size={14} /> Fatura
                          </a>
                        )}
                        {invoice.fiscalPdfUrl && (
                          <a
                            href={invoice.fiscalPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-600 hover:text-slate-800"
                          >
                            <FileText size={14} /> NF (PDF)
                          </a>
                        )}
                        {invoice.fiscalXmlUrl && (
                          <a
                            href={invoice.fiscalXmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-slate-600 hover:text-slate-800"
                          >
                            <Download size={14} /> NF (XML)
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
