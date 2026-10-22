'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api, type PlatformRevenueReport } from '../../lib/api';
import { ButtonSecondary, ErrorState, GlassCard, InnerCard, LoadingState } from '../platform-ui';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);
const errorText = (error: unknown) => (error instanceof Error && error.message ? error.message : 'Não foi possível carregar o relatório.');

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'negative' | 'strong' }) {
  return (
    <InnerCard className="min-w-0">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 truncate text-xl font-semibold ${tone === 'negative' ? 'text-red-600' : tone === 'strong' ? 'text-emerald-700' : 'text-zinc-900'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </InnerCard>
  );
}

/** Relatório contábil mensal da receita da plataforma: totais, impostos estimados, MRR, churn e quebra por plano. */
export function PlatformRevenueReport({ initialMonth }: { initialMonth?: string }) {
  const [month, setMonth] = useState(initialMonth || currentMonth());
  const [report, setReport] = useState<PlatformRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (target: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(target)) return;
    setLoading(true);
    setError(null);
    try {
      setReport(await api.platform.finance.monthlyRevenueReport(target));
    } catch (err) {
      setReport(null);
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(month); }, [load, month]);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try { await api.platform.finance.downloadMonthlyRevenueCsv(month); } catch (err) { setError(errorText(err)); } finally { setDownloading(false); }
  };

  const t = report?.totals;
  return (
    <GlassCard className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Receita da plataforma</h2>
          <p className="text-sm text-zinc-500">Fechamento mensal (fuso de Brasília), conferido com o razão contábil.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col text-xs font-medium text-zinc-600">
            Mês
            <input
              type="month"
              value={month}
              onChange={(event) => event.target.value && setMonth(event.target.value)}
              className="mt-1 h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
            />
          </label>
          <ButtonSecondary type="button" onClick={download} disabled={downloading || loading || !report}>
            {downloading ? 'Baixando...' : 'Baixar CSV'}
          </ButtonSecondary>
        </div>
      </div>

      {loading ? <LoadingState label="Calculando o mês..." /> : null}
      {!loading && error ? <ErrorState message={error} retry={() => void load(month)} /> : null}

      {!loading && report && t ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Receita bruta recebida" value={brl(t.grossReceipts)} />
            <Metric label="Devoluções" value={brl(t.refunds)} tone={t.refunds > 0 ? 'negative' : undefined} />
            <Metric label="Taxas do gateway" value={brl(t.gatewayFees)} hint={report.gateway.complete ? undefined : `${report.gateway.receiptsWithoutNetValue} recebimento(s) sem o líquido do gateway`} />
            <Metric label={`Impostos estimados (${report.tax.ratePercent.toLocaleString('pt-BR')}%)`} value={brl(t.estimatedTaxes)} hint="Estimativa" />
            <Metric label="Receita líquida" value={brl(t.netRevenue)} tone="strong" />
            <Metric label="MRR" value={brl(t.mrr)} hint={`${t.activeCustomers} cliente(s) ativo(s)`} />
            <Metric label="Clientes novos" value={String(t.newCustomers)} />
            <Metric label="Clientes cancelados" value={String(t.canceledCustomers)} />
            <Metric label="Churn do mês" value={t.churnRatePercent === null ? '—' : `${t.churnRatePercent.toLocaleString('pt-BR')}%`} hint={`Base inicial: ${t.customersAtStart}`} />
          </div>

          <p role="note" className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{report.tax.warning}</p>
          {!report.ledger.reconciles ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Atenção: o relatório não fecha com o razão contábil. Confira os lançamentos do mês.</p>
          ) : null}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">Por plano</h3>
            {report.byPlan.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum movimento neste mês.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                        {['Plano', 'Bruta', 'Devoluções', 'Taxas', 'Impostos est.', 'Líquida', 'MRR', 'Ativos', 'Novos', 'Cancel.'].map((head, index) => (
                          <th key={head} className={`py-2 pr-3 font-medium ${index > 0 ? 'text-right' : ''}`}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.byPlan.map((row) => (
                        <tr key={row.planId} className="border-b border-zinc-100">
                          <td className="py-2 pr-3 font-medium text-zinc-900">{row.planName}</td>
                          <td className="py-2 pr-3 text-right">{brl(row.grossReceipts)}</td>
                          <td className="py-2 pr-3 text-right">{brl(row.refunds)}</td>
                          <td className="py-2 pr-3 text-right">{brl(row.gatewayFees)}</td>
                          <td className="py-2 pr-3 text-right">{brl(row.estimatedTaxes)}</td>
                          <td className="py-2 pr-3 text-right font-semibold">{brl(row.netRevenue)}</td>
                          <td className="py-2 pr-3 text-right">{brl(row.mrr)}</td>
                          <td className="py-2 pr-3 text-right">{row.activeCustomers}</td>
                          <td className="py-2 pr-3 text-right">{row.newCustomers}</td>
                          <td className="py-2 text-right">{row.canceledCustomers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-3 md:hidden">
                  {report.byPlan.map((row) => (
                    <li key={row.planId}>
                      <InnerCard>
                        <p className="font-semibold text-zinc-900">{row.planName}</p>
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                          {([
                            ['Bruta', brl(row.grossReceipts)], ['Devoluções', brl(row.refunds)], ['Taxas', brl(row.gatewayFees)], ['Impostos est.', brl(row.estimatedTaxes)],
                            ['Líquida', brl(row.netRevenue)], ['MRR', brl(row.mrr)], ['Ativos', String(row.activeCustomers)], ['Novos / cancel.', `${row.newCustomers} / ${row.canceledCustomers}`],
                          ] as const).map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <dt className="text-xs text-zinc-500">{label}</dt>
                              <dd className="truncate font-medium text-zinc-900">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </InnerCard>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </>
      ) : null}
    </GlassCard>
  );
}
