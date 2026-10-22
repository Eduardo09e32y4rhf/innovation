import type { FiscalSummary } from '@/app/lib/api';
import { brl } from './_model';

/** Folha fiscal do mês: líquido a pagar, descontos por tipo, encargos e custo da empresa. */
export function FiscalSummaryCard({ summary }: { summary: FiscalSummary }) {
  const rows: Array<[string, number, boolean?]> = [
    ['Bruto total', summary.gross], ['Salário líquido a pagar', summary.netToPay, true], ['Total de descontos', summary.totalDiscounts],
    ['FGTS (encargo)', summary.charges.fgts], [`INSS patronal estimado (${Math.round(summary.charges.employerInssRate * 100)}% do bruto)`, summary.charges.employerInss], ['Custo total da empresa', summary.companyCost, true],
  ];
  return (
    <section aria-labelledby="fiscal-titulo" className="card-v2 space-y-3 p-4">
      <h3 id="fiscal-titulo" className="font-semibold">Folha fiscal do mês</h3>
      <dl className="divide-y divide-slate-100 text-sm">
        {rows.map(([k, v, bold]) => <div key={k} className="flex justify-between gap-3 py-2"><dt className="min-w-0 break-words text-fg-sub">{k}</dt><dd className={`shrink-0 ${bold ? 'font-semibold' : 'font-medium'}`}>{brl(v)}</dd></div>)}
      </dl>
      {summary.discountsByType.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-sub">Descontos por tipo</h4>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
            {summary.discountsByType.map((d) => <li key={d.type} className="flex justify-between gap-3 px-3 py-2"><span className="min-w-0 break-words">{d.label}</span><span className="shrink-0 font-medium">{brl(d.amount)}</span></li>)}
          </ul>
        </div>
      )}
      <p className="text-xs text-fg-sub">O INSS patronal é uma estimativa (RAT e terceiros dependem do enquadramento da empresa). A emissão de nota fiscal por funcionário ainda não existe.</p>
    </section>
  );
}
