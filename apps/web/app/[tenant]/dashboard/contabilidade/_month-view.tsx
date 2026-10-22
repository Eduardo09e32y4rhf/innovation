'use client';

import { AlertTriangle, ArrowLeft, Calculator, Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useMutation, useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { accountantActions, brl, fmtDate, fmtMinutes, mergeRows, periodTotals, type MonthRow } from './_model';
import { EmployeeDrawer } from './_employee-drawer';
import { StatusBadge } from './_status-badge';

const TH = 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-fg-sub';

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-3"><dt className="text-xs text-fg-sub">{label}</dt><dd className="mt-1 text-base font-semibold">{value}</dd></div>;
}

function Card({ r, onOpen }: { r: MonthRow; onOpen: () => void }) {
  return (
    <li className="card-v2 space-y-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="break-words font-semibold">{r.name}</p>
        {r.hasManualAdjustment && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Ajustado</span>}
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-fg-sub">Horas</dt><dd>{fmtMinutes(r.workedMinutes)}</dd>
        <dt className="text-fg-sub">Extras 50/100</dt><dd>{fmtMinutes(r.overtime50Minutes)} / {fmtMinutes(r.overtime100Minutes)}</dd>
        <dt className="text-fg-sub">Noturno</dt><dd>{fmtMinutes(r.nightShiftMinutes)}</dd>
        <dt className="text-fg-sub">Faltas</dt><dd>{r.absenceDays} dia(s)</dd>
        <dt className="text-fg-sub">Atrasos</dt><dd>{fmtMinutes(r.lateMinutes)}</dd>
        <dt className="text-fg-sub">Bruto</dt><dd>{brl(r.gross)}</dd>
        <dt className="text-fg-sub">Descontos</dt><dd>{brl(r.discounts)}</dd>
        <dt className="font-semibold">Líquido</dt><dd className="font-semibold">{brl(r.net)}</dd>
      </dl>
      <button type="button" onClick={onOpen} aria-label={`Abrir ficha de ${r.name}`} className="btn btn-outline min-h-11 w-full">Abrir ficha</button>
    </li>
  );
}

export function MonthView({ companyId, companyName, month, role, onBack }: { companyId: string; companyName: string; month: string; role: string; onBack: () => void }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState<MonthRow | null>(null);
  const periodQ = useQuery(useCallback(() => api.accounting.period(companyId, month), [companyId, month]), [companyId, month]);
  const sheetsQ = useQuery(useCallback(() => api.accounting.companyTimeSheets(companyId, month), [companyId, month]), [companyId, month]);

  const calc = useMutation((discard: boolean) => api.accounting.calculatePeriod(companyId, month, discard), {
    onSuccess: () => { toast.success('Cálculo concluído.'); periodQ.refetch(); sheetsQ.refetch(); }, onError: (m) => toast.error(m),
  });
  const publish = useMutation(() => api.accounting.publishPeriod(companyId, month), {
    onSuccess: () => { toast.success('Competência publicada para a empresa.'); periodQ.refetch(); }, onError: (m) => toast.error(m),
  });

  const p = periodQ.data;
  const rows = p ? mergeRows(p.employees, sheetsQ.data?.employees ?? []) : [];
  const actions = accountantActions(p?.status, role, rows.length);
  const totals = p ? periodTotals(p) : null;
  const [yy, mm] = month.split('-');

  async function onCalculate() {
    if (!(await confirm({ title: 'Calcular todos os funcionários?', description: `Os valores de ${mm}/${yy} serão calculados com as regras atuais. Ajustes manuais são mantidos, salvo se você optar por descartá-los.`, confirmText: 'Calcular todos', variant: 'primary' }))) return;
    const adjusted = p?.employees.filter((e) => e.hasManualAdjustment).length ?? 0;
    const discard = adjusted > 0 && actions.discardOption
      ? await confirm({ title: 'Descartar ajustes manuais?', description: `${adjusted} funcionário(s) têm ajuste manual. Descartar apaga esses ajustes e recalcula do zero. Cancelar mantém os ajustes.`, confirmText: 'Descartar ajustes', cancelText: 'Manter ajustes', variant: 'danger' })
      : false;
    await calc.mutate(discard).catch(() => undefined);
  }
  async function onPublish() {
    if (!(await confirm({ title: 'Publicar para a empresa?', description: 'O RH da empresa receberá a competência para conferir. Você não poderá editar até ela ser devolvida.', confirmText: 'Publicar', variant: 'primary' }))) return;
    await publish.mutate().catch(() => undefined);
  }

  return (
    <section aria-labelledby="mes-titulo" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="btn btn-outline min-h-11"><ArrowLeft size={16} aria-hidden="true" /> Empresas</button>
        <h2 id="mes-titulo" className="min-w-0 break-words text-lg font-semibold">{companyName} · {mm}/{yy}</h2>
        {p && <StatusBadge status={p.status} />}
      </div>
      {periodQ.loading && !p ? <LoadingState label="Carregando o mês…" /> : periodQ.error ? <ErrorState message={periodQ.error} onRetry={periodQ.refetch} /> : p && totals && (
        <>
          {p.status === 'RETURNED' && (
            <div role="alert" className="flex gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950">
              <AlertTriangle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
              <div className="min-w-0"><p className="font-semibold">Devolvida pelo RH{p.returnedAt ? ` em ${fmtDate(p.returnedAt)}` : ''}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{p.returnComment || 'Sem comentário.'}</p></div>
            </div>
          )}
          {p.status === 'PUBLISHED' && <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">Publicada em {fmtDate(p.publishedAt)}. Aguardando conferência do RH; edição bloqueada.</p>}
          <dl className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
            <Metric label="Funcionários" value={String(totals.employees)} /><Metric label="Bruto" value={brl(totals.gross)} /><Metric label="INSS" value={brl(totals.inss)} />
            <Metric label="FGTS" value={brl(totals.fgts)} /><Metric label="IRRF" value={brl(totals.irrf)} /><Metric label="Descontos" value={brl(totals.discounts)} /><Metric label="Líquido" value={brl(totals.net)} />
          </dl>
          <div className="flex flex-wrap gap-2">
            {actions.calculate && <button type="button" onClick={onCalculate} disabled={calc.loading} className="btn btn-primary min-h-11"><Calculator size={16} aria-hidden="true" /> {calc.loading ? 'Calculando…' : 'Calcular todos'}</button>}
            {actions.publish && <button type="button" onClick={onPublish} disabled={publish.loading || calc.loading} className="btn btn-primary min-h-11"><Send size={16} aria-hidden="true" /> {publish.loading ? 'Publicando…' : 'Publicar para a empresa'}</button>}
          </div>
          {sheetsQ.error && <p role="status" className="text-sm text-amber-800">Não foi possível carregar as horas do ponto; exibindo apenas valores.</p>}
          {rows.length === 0 ? <EmptyState message="Nenhum cálculo neste mês. Use “Calcular todos”." /> : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">Funcionários da competência</caption>
                  <thead className="bg-slate-50"><tr>
                    <th scope="col" className={TH}>Funcionário</th><th scope="col" className={TH}>Horas</th><th scope="col" className={TH}>Extras 50%</th><th scope="col" className={TH}>Extras 100%</th>
                    <th scope="col" className={TH}>Noturno</th><th scope="col" className={TH}>Faltas</th><th scope="col" className={TH}>Atrasos</th><th scope="col" className={TH}>Bruto</th><th scope="col" className={TH}>Descontos</th><th scope="col" className={TH}>Líquido</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.employeeId} className="hover:bg-slate-50">
                        <th scope="row" className="px-3 py-2 text-left font-medium">
                          <button type="button" onClick={() => setOpen(r)} className="text-left underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">{r.name}</button>
                          {r.hasManualAdjustment && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Ajustado</span>}
                        </th>
                        <td className="px-3 py-2">{fmtMinutes(r.workedMinutes)}</td><td className="px-3 py-2">{fmtMinutes(r.overtime50Minutes)}</td><td className="px-3 py-2">{fmtMinutes(r.overtime100Minutes)}</td>
                        <td className="px-3 py-2">{fmtMinutes(r.nightShiftMinutes)}</td><td className="px-3 py-2">{r.absenceDays} d</td><td className="px-3 py-2">{fmtMinutes(r.lateMinutes)}</td>
                        <td className="px-3 py-2">{brl(r.gross)}</td><td className="px-3 py-2">{brl(r.discounts)}</td><td className="px-3 py-2 font-semibold">{brl(r.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="space-y-3 md:hidden">{rows.map((r) => <Card key={r.employeeId} r={r} onOpen={() => setOpen(r)} />)}</ul>
            </>
          )}
        </>
      )}
      {open && <EmployeeDrawer companyId={companyId} month={month} row={open} canAdjust={actions.adjust} onClose={() => setOpen(null)} onAdjusted={() => { periodQ.refetch(); sheetsQ.refetch(); }} />}
    </section>
  );
}
