'use client';

import { CheckCircle2, Download, FileText, XCircle } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PayrollSheet } from '@/app/lib/api';
import { downloadFile } from '@/app/lib/download';
import { FiscalSummaryCard } from './_fiscal-summary';
import { SEVERITY_LABEL } from './_payroll-model';

/** Conferência da folha do mês, resumo fiscal e download (CSV e PDF). */
export function PayrollTools({ companyId, month, sheet, version, onOpenEmployee }: { companyId: string; month: string; sheet: PayrollSheet | undefined; version: number; onOpenEmployee: (employeeId: string) => void }) {
  const confirm = useConfirm();
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null);
  const check = useQuery(useCallback(() => api.accounting.payrollValidation(companyId, month), [companyId, month, version]), [companyId, month, version]);
  const v = check.data;

  async function download(format: 'csv' | 'pdf') {
    if (v && !v.valid && v.errors > 0 && !(await confirm({ title: 'Baixar com inconsistências?', description: `A conferência encontrou ${v.errors} erro(s). Corrija antes de enviar a folha, ou baixe para análise.`, confirmText: 'Baixar mesmo assim', variant: 'primary' }))) return;
    setBusy(format);
    try { await downloadFile(api.accounting.payrollExportPath(companyId, month, format), `folha-${month}.${format}`); toast.success(format === 'csv' ? 'CSV baixado.' : 'PDF baixado.'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível baixar o arquivo.'); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-3">
      <section aria-labelledby="conf-titulo" className="card-v2 space-y-3 p-4">
        <h3 id="conf-titulo" className="font-semibold">Conferência da folha</h3>
        {check.loading && !v ? <p role="status" className="text-sm text-fg-sub">Conferindo a folha…</p> : check.error ? <p role="alert" className="text-sm text-rose-700">{check.error}</p> : v && (
          v.employees === 0 ? <p className="text-sm text-fg-sub">Sem folhas calculadas neste mês.</p> : (
            <>
              <p role="status" className={`flex items-center gap-2 font-semibold ${v.valid ? 'text-emerald-800' : 'text-rose-800'}`}>
                {v.valid ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
                {v.valid ? `Folha válida${v.warnings ? ` (${v.warnings} alerta(s))` : ''}` : `${v.errors} problema(s) para corrigir${v.warnings ? ` e ${v.warnings} alerta(s)` : ''}`}
              </p>
              {v.issues.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                  {v.issues.map((i, n) => (
                    <li key={`${i.payrollId}-${i.code}-${n}`} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="min-w-0 break-words"><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${i.severity === 'ERROR' ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-900'}`}>{SEVERITY_LABEL[i.severity]}</span><strong>{i.name}</strong>: {i.message}</p>
                      <button type="button" onClick={() => onOpenEmployee(i.employeeId)} className="btn btn-outline min-h-11 shrink-0">Abrir {i.name.split(' ')[0]}</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void download('csv')} disabled={busy !== null} className="btn btn-outline min-h-11 flex-1"><Download size={16} aria-hidden="true" /> {busy === 'csv' ? 'Baixando…' : 'Baixar CSV'}</button>
          <button type="button" onClick={() => void download('pdf')} disabled={busy !== null} className="btn btn-primary min-h-11 flex-1"><FileText size={16} aria-hidden="true" /> {busy === 'pdf' ? 'Gerando…' : 'Baixar PDF'}</button>
        </div>
      </section>
      {sheet && sheet.employees.length > 0 && <FiscalSummaryCard summary={sheet.summary} />}
    </div>
  );
}
