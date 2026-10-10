'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';

const monthLabel = (value: string) => {
  const label = new Date(value).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function HoleritesPage() {
  const payslips = useQuery(() => api.timeClosing.myPayslips(), []);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function download(id: string) {
    setDownloading(id);
    try { await api.timeClosing.downloadMyPayslip(id); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível baixar o contracheque.'); }
    finally { setDownloading(null); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-black text-slate-900">Meus contracheques</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">Seus recibos de pagamento aparecem aqui quando o RH aprova o fechamento do mês.</p>
      </header>

      {payslips.error ? <ErrorState message={payslips.error} onRetry={payslips.refetch} />
        : payslips.loading && !payslips.data ? <LoadingState label="Carregando contracheques…" />
        : !payslips.data?.length ? <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState message="Nenhum contracheque disponível no momento." /></div>
        : (
          <ul className="space-y-3">
            {payslips.data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="font-bold text-slate-900">{monthLabel(item.periodStart)}</p>
                  <p className="text-sm text-slate-500">Líquido estimado: <strong className="text-slate-800">{money(item.netPay)}</strong></p>
                </div>
                <button type="button" onClick={() => download(item.id)} disabled={downloading === item.id}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--color-brand)] px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
                  <Download size={16} aria-hidden="true" /> {downloading === item.id ? 'Baixando…' : 'Baixar PDF'}
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
