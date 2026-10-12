'use client';

import { Download, FileDown, RefreshCw } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/app/lib/api';
import { Button, ConfirmDialog, Modal } from '@/app/components/ui';
import { EmptyState, ErrorState, LoadingState } from '@/app/components/data-states';
import { useQuery } from '@/app/hooks/use-data';
import { can } from '@/app/lib/schedule-access';
import { currentMonthKey, errorMessage, monthLabel, shiftMonth } from '../_lib/format';
import type { Overview } from '../_lib/types';

const STATUS: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado' };
const FIELDS = [
  { value: 'salaryBase', label: 'Salário base (R$)' }, { value: 'overtime50', label: 'Hora extra 50% (horas)' }, { value: 'overtime100', label: 'Hora extra 100% (horas)' },
  { value: 'nightShift', label: 'Adicional noturno (horas)' }, { value: 'absenceMinutes', label: 'Faltas (minutos)' }, { value: 'lateMinutes', label: 'Atrasos (minutos)' }, { value: 'earlyLeaveMinutes', label: 'Saídas antecipadas (minutos)' },
];
const money = (value: unknown) => (value == null ? '—' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const day = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const period = (item: any) => `${day(item.periodStart)} a ${day(item.periodEnd)}`;
type Decision = { action: 'generate' | 'review' | 'approve' | 'close' | 'delete'; item?: any };
const input = 'input-v2 w-full';

export function ClosingView({ overview, month, setMonth }: { overview: Overview; month: string; setMonth: (month: string) => void }) {
  const canWrite = can(overview.role, 'closing.write');
  const canList = canWrite || ['CEO', 'CONTABIL'].includes(overview.role);
  const list = useQuery(api.timeClosing.list, [], { enabled: canList });
  const [decision, setDecision] = useState<Decision | null>(null);
  const [adjust, setAdjust] = useState<any>(null);
  const [reopen, setReopen] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const lock = useRef(false);

  const [year, monthNumber] = month.split('-').map(Number);
  const periodStart = `${month}-01`;
  const periodEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, '0')}`;
  const closings = useMemo(() => (list.data ?? []).filter((item: any) => item.periodStart.slice(0, 10) >= periodStart && item.periodEnd.slice(0, 10) <= periodEnd), [list.data, periodStart, periodEnd]);
  const totals = closings.reduce((sum: any, item: any) => ({
    gross: sum.gross + Number(item.grossPay ?? 0), net: sum.net + Number(item.netPay ?? 0), ot: sum.ot + Number(item.overtime50 ?? 0) + Number(item.overtime100 ?? 0),
    inss: sum.inss + Number(item.inssDiscount ?? 0), irrf: sum.irrf + Number(item.irrfDiscount ?? 0), benefits: sum.benefits + Number(item.benefitsDiscount ?? 0), fgts: sum.fgts + Number(item.fgtsAmount ?? 0),
  }), { gross: 0, net: 0, ot: 0, inss: 0, irrf: 0, benefits: 0, fgts: 0 });
  const [detail, setDetail] = useState<any>(null);

  async function run(operation: () => Promise<unknown>, done: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await operation(); list.refetch(); done(); toast.success('Alteração salva.'); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível concluir a operação.')); }
    finally { lock.current = false; setBusy(false); }
  }
  async function reconcile(item: any) {
    const current = await api.timeClosing.getById(item.id);
    if (current.status !== item.status || current.updatedAt !== item.updatedAt) { list.refetch(); throw new Error('Este fechamento foi alterado por outra pessoa. Atualize e revise antes de confirmar.'); }
    return current;
  }
  async function confirm() {
    if (!decision) return;
    await run(async () => {
      if (decision.action === 'generate') return api.timeClosing.generate({ periodStart, periodEnd, month: monthNumber, year });
      const item = await reconcile(decision.item);
      if (decision.action === 'review') return api.timeClosing.submitReview(item.id);
      if (decision.action === 'approve') return api.timeClosing.approve(item.id);
      if (decision.action === 'close') return api.timeClosing.close(item.id);
      return api.timeClosing.delete(item.id);
    }, () => setDecision(null));
  }
  async function pdf(item: any) {
    setDownloading(item.id);
    try { await api.documents.downloadIndividual(item.id); } catch (cause) { toast.error(errorMessage(cause, 'Não foi possível baixar o PDF.')); } finally { setDownloading(null); }
  }
  async function collective() {
    setDownloading('collective');
    try { await api.timeClosing.downloadCollectivePdf(month, overview.me?.employee && !canList ? [overview.me.employee.id] : []); }
    catch (cause) { toast.error(errorMessage(cause, 'Não foi possível gerar o PDF.')); }
    finally { setDownloading(null); }
  }

  const label = decision?.action === 'generate' ? 'Gerar / recalcular fechamento' : decision?.action === 'review' ? 'Enviar para revisão' : decision?.action === 'approve' ? 'Aprovar fechamento' : decision?.action === 'close' ? 'Fechar competência' : 'Excluir fechamento';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" aria-label="Mês anterior" onClick={() => setMonth(shiftMonth(month, -1))}>‹</Button>
          <h2 className="min-w-[150px] text-center text-base font-semibold capitalize">{monthLabel(month)}</h2>
          <Button variant="outline" size="sm" aria-label="Próximo mês" onClick={() => setMonth(shiftMonth(month, 1))}>›</Button>
          {month !== currentMonthKey() && <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>Hoje</Button>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" isLoading={downloading === 'collective'} onClick={collective}><FileDown size={16} aria-hidden="true" /> Folha de ponto (PDF)</Button>
          {canList && <Button variant="outline" onClick={list.refetch} disabled={list.loading || busy}><RefreshCw size={16} aria-hidden="true" /> Atualizar</Button>}
          {canWrite && <Button disabled={busy} onClick={() => setDecision({ action: 'generate' })}>Gerar / recalcular</Button>}
        </div>
      </div>

      {!canList ? (
        <p className="card-v2 p-5 text-sm text-fg-sub">O fechamento da folha é feito pelo RH. Baixe aqui a folha de ponto do mês ou acompanhe a situação do seu espelho na aba Ponto.</p>
      ) : list.loading && !list.data ? <LoadingState label="Carregando fechamentos…" /> : list.error ? <ErrorState message={list.error} onRetry={list.refetch} /> : (
        <>
          <p className="text-sm text-fg-sub">Fluxo: Rascunho → Em revisão → Aprovado → Fechado. Após fechado, correções exigem reabertura com motivo.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
            {[['Fechamentos', String(closings.length)], ['Horas extras (h)', totals.ot.toFixed(1)], ['Bruto', money(totals.gross)], ['INSS', money(totals.inss)], ['IRRF', money(totals.irrf)], ['Benefícios e outros descontos', money(totals.benefits)], ['Líquido', money(totals.net)]].map(([title, value]) => <div key={title} className="card-v2 p-4"><p className="text-xs text-fg-sub">{title}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>)}
          </div>
          <p className="text-xs text-fg-sub">FGTS patronal do mês (encargo da empresa, não sai do funcionário): <strong>{money(totals.fgts)}</strong>. Clique em <strong>Detalhes</strong> para ver a memória de cálculo de cada pessoa. Os descontos de benefícios são cadastrados em Configurações → Descontos e benefícios.</p>
          {closings.length === 0 ? <EmptyState message="Nenhum fechamento neste mês. Gere o fechamento para revisar os valores." /> : (
            <div className="card-v2 overflow-auto" style={{ maxHeight: 'calc(100dvh - 22rem)', minHeight: 260 }}>
              <table className="w-full min-w-[1240px] border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">Fechamentos por funcionário</caption>
                <thead className="text-xs text-fg-sub"><tr>{['Funcionário', 'Salário base', 'Extras + noturno + DSR', 'Faltas e atrasos', 'Bruto', 'INSS', 'IRRF', 'Benefícios', 'Líquido', 'Status', 'Ações'].map((title, index) => <th key={title} scope="col" className={`sticky top-0 z-10 border-b border-border bg-bg-sub px-3 py-2.5 font-medium ${index === 0 ? 'left-0 z-20 min-w-[200px] border-r' : ''} ${index >= 1 && index <= 8 ? 'text-right' : ''}`}>{title}</th>)}</tr></thead>
                <tbody>
                  {closings.map((item: any) => {
                    const variable = Number(item.overtime50Value ?? 0) + Number(item.overtime100Value ?? 0) + Number(item.nightShiftValue ?? 0) + Number(item.dsrValue ?? 0);
                    const docked = Number(item.absenceDiscount ?? 0) + Number(item.lateDiscount ?? 0) + Number(item.earlyLeaveDiscount ?? 0);
                    const cell = 'border-b border-border px-3 py-3 text-right tabular-nums';
                    return (
                    <tr key={item.id} className="align-top hover:bg-bg-sub/60">
                      <th scope="row" className="sticky left-0 z-10 min-w-[200px] border-b border-r border-border bg-bg-elev px-3 py-3 text-left font-medium">{item.employee?.name ?? 'Funcionário'}<span className="block text-xs font-normal text-fg-sub">{period(item)}</span></th>
                      <td className={cell}>{money(item.salaryBase)}</td>
                      <td className={`${cell} text-emerald-700`}>{variable > 0 ? `+ ${money(variable)}` : '—'}</td>
                      <td className={`${cell} text-rose-700`}>{docked > 0 ? `− ${money(docked)}` : '—'}</td>
                      <td className={`${cell} font-medium`}>{money(item.grossPay)}</td>
                      <td className={`${cell} text-rose-700`}>− {money(item.inssDiscount)}</td>
                      <td className={`${cell} text-rose-700`}>{Number(item.irrfDiscount ?? 0) > 0 ? `− ${money(item.irrfDiscount)}` : 'isento'}</td>
                      <td className={`${cell} text-rose-700`}>{Number(item.benefitsDiscount ?? 0) > 0 ? `− ${money(item.benefitsDiscount)}` : '—'}</td>
                      <td className={`${cell} font-semibold`}>{money(item.netPay)}</td>
                      <td className="border-b border-border px-3 py-3"><span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs">{STATUS[item.status] ?? item.status}</span></td>
                      <td className="border-b border-border px-3 py-3"><div className="flex flex-wrap gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setDetail(item)}>Detalhes</Button>
                        <Button size="sm" variant="outline" isLoading={downloading === item.id} onClick={() => pdf(item)}><Download size={14} aria-hidden="true" /> PDF</Button>
                        {canWrite && ['DRAFT', 'IN_REVIEW'].includes(item.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => setAdjust(item)}>Ajuste</Button>}
                        {canWrite && item.status === 'DRAFT' && <Button size="sm" disabled={busy} onClick={() => setDecision({ action: 'review', item })}>Enviar p/ revisão</Button>}
                        {canWrite && item.status === 'IN_REVIEW' && <Button size="sm" disabled={busy} onClick={() => setDecision({ action: 'approve', item })}>Aprovar</Button>}
                        {canWrite && item.status === 'APPROVED' && <Button size="sm" disabled={busy} onClick={() => setDecision({ action: 'close', item })}>Fechar</Button>}
                        {canWrite && item.status === 'CLOSED' && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setReason(''); setReopen(item); }}>Reabrir</Button>}
                        {canWrite && item.status !== 'CLOSED' && <Button size="sm" variant="danger" disabled={busy} onClick={() => setDecision({ action: 'delete', item })}>Excluir</Button>}
                      </div></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {detail && <MemoryModal item={detail} onClose={() => setDetail(null)} />}

      <ConfirmDialog isOpen={Boolean(decision)} onClose={() => setDecision(null)} onConfirm={confirm} title={label} isLoading={busy} variant={decision?.action === 'delete' ? 'danger' : 'primary'} confirmText={label}
        description={decision?.item ? `${decision.item.employee?.name ?? 'Funcionário'} · ${period(decision.item)} · líquido ${money(decision.item.netPay)}. ${decision.action === 'close' ? 'Depois de fechar, correções exigem reabertura com motivo.' : 'Confirme após revisar os valores.'}` : `${day(periodStart)} a ${day(periodEnd)}. O servidor gera ou recalcula os rascunhos dos funcionários elegíveis; fechamentos protegidos continuam bloqueados.`} />

      {adjust && <AdjustmentModal item={adjust} busy={busy} onClose={() => setAdjust(null)} onSave={(field, value, why) => run(async () => { await reconcile(adjust); return api.timeClosing.adjust(adjust.id, field, value, why); }, () => setAdjust(null))} />}

      <Modal isOpen={Boolean(reopen)} onClose={() => !busy && setReopen(null)} title="Reabrir fechamento">
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (reopen && reason.trim()) void run(async () => { await reconcile(reopen); return api.timeClosing.reopen(reopen.id, reason.trim()); }, () => setReopen(null)); }}>
          <p className="text-sm">{reopen?.employee?.name} · {reopen ? period(reopen) : ''}. A reabertura devolve o fechamento ao rascunho e registra o motivo.</p>
          <label className="block space-y-1.5 text-sm font-medium">Motivo *<textarea className={`${input} min-h-20`} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReopen(null)} disabled={busy}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!reason.trim()}>Reabrir</Button></div>
        </form>
      </Modal>
    </div>
  );
}

/** Memória de cálculo: do salário ao líquido, linha por linha (como um holerite). */
function MemoryModal({ item, onClose }: { item: any; onClose: () => void }) {
  const n = (value: unknown) => Number(value ?? 0);
  const hours = (value: unknown) => `${n(value).toFixed(2).replace('.', ',')} h`;
  const deductions: Array<{ name: string; detail: string; amount: number }> = Array.isArray(item.deductionsJson) ? item.deductionsJson : [];
  const rows: Array<[string, string, number, 'plus' | 'minus' | 'total' | 'info']> = [
    ['Salário base', item.payableWorkdays != null ? `${item.payableWorkdays} dias úteis · hora ${money(item.hourlyRate)} (÷${item.monthlyDivisor})` : '', n(item.salaryBase), 'plus'],
    ['Hora extra 50%', hours(item.overtime50), n(item.overtime50Value), 'plus'],
    ['Hora extra 100%', hours(item.overtime100), n(item.overtime100Value), 'plus'],
    ['Adicional noturno', hours(item.nightShift), n(item.nightShiftValue), 'plus'],
    ['Reflexo em DSR', `${n(item.paidRestDays)} dias de descanso`, n(item.dsrValue), 'plus'],
    ['Faltas e suspensão', `${n(item.absenceMinutes)} min`, n(item.absenceDiscount), 'minus'],
    ['Atrasos', `${n(item.lateMinutes)} min`, n(item.lateDiscount), 'minus'],
    ['Saídas antecipadas', `${n(item.earlyLeaveMinutes)} min`, n(item.earlyLeaveDiscount), 'minus'],
    ['BRUTO', '', n(item.grossPay), 'total'],
    ['INSS', `base ${money(item.inssBase)}`, n(item.inssDiscount), 'minus'],
    ['IRRF', n(item.irrfDiscount) > 0 ? `base ${money(item.irrfBase)}` : 'isento neste valor', n(item.irrfDiscount), 'minus'],
    ...deductions.map((d): [string, string, number, 'minus'] => [d.name, d.detail, n(d.amount), 'minus']),
    ['LÍQUIDO A RECEBER', '', n(item.netPay), 'total'],
    ['FGTS do mês (encargo da empresa, não desconta do funcionário)', '8% do bruto', n(item.fgtsAmount), 'info'],
  ];
  return (
    <Modal isOpen onClose={onClose} title="Memória de cálculo" description={`${item.employee?.name ?? ''} · ${period(item)}`} maxWidth="max-w-2xl">
      <table className="w-full text-sm">
        <thead className="text-xs text-fg-sub"><tr><th className="py-1.5 text-left font-medium">Item</th><th className="py-1.5 text-left font-medium">Referência</th><th className="py-1.5 text-right font-medium">Valor</th></tr></thead>
        <tbody>
          {rows.filter(([label, , value, kind]) => kind === 'total' || kind === 'info' || label === 'Salário base' || value > 0).map(([label, ref, value, kind]) => (
            <tr key={label} className={`border-t border-border ${kind === 'total' ? 'bg-bg-sub font-semibold' : ''}`}>
              <td className="py-2 pr-2">{label}</td><td className="py-2 pr-2 text-xs text-fg-sub">{ref}</td>
              <td className={`py-2 text-right tabular-nums ${kind === 'plus' ? 'text-emerald-700' : kind === 'minus' ? 'text-rose-700' : ''}`}>{kind === 'minus' ? '− ' : kind === 'plus' ? '+ ' : ''}{money(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-fg-sub">Valores calculados com as regras vigentes (INSS e IRRF de {item.calculationVersion ?? 'tabela vigente'}). Conferência final é da contabilidade.</p>
    </Modal>
  );
}

function AdjustmentModal({ item, busy, onClose, onSave }: { item: any; busy: boolean; onClose: () => void; onSave: (field: string, value: number, reason: string) => Promise<void> }) {
  const [field, setField] = useState('salaryBase');
  const [value, setValue] = useState(String(item.salaryBase ?? 0));
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const valid = value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Boolean(reason.trim());
  return (
    <Modal isOpen onClose={() => !busy && onClose()} title={reviewing ? 'Confirmar ajuste' : 'Ajuste manual'} description={`${item.employee?.name} · ${period(item)}`}>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (!valid || busy) return; if (!reviewing) setReviewing(true); else void onSave(field, Number(value), reason.trim()); }}>
        {reviewing ? (
          <div className="rounded-lg bg-bg-sub p-4 text-sm"><p className="font-medium">{FIELDS.find((option) => option.value === field)?.label}</p><p>{String(item[field] ?? 0)} → {value}</p><p className="mt-1 text-fg-sub">Motivo: {reason}</p><p className="mt-2 text-xs text-fg-sub">Impostos e líquido são recalculados pelo servidor.</p></div>
        ) : (
          <>
            <label className="block space-y-1.5 text-sm font-medium">Campo<select className={input} value={field} onChange={(event) => { setField(event.target.value); setValue(String(item[event.target.value] ?? 0)); }}>{FIELDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm font-medium">Novo valor *<input type="number" step="any" min="0" className={input} value={value} onChange={(event) => setValue(event.target.value)} /></label>
            <label className="block space-y-1.5 text-sm font-medium">Justificativa *<textarea className={`${input} min-h-20`} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          </>
        )}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={reviewing ? () => setReviewing(false) : onClose} disabled={busy}>{reviewing ? 'Voltar' : 'Cancelar'}</Button><Button type="submit" isLoading={busy} disabled={!valid}>{reviewing ? 'Confirmar ajuste' : 'Revisar ajuste'}</Button></div>
      </form>
    </Modal>
  );
}
