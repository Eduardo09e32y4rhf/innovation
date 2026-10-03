'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { saoPauloMonthKey } from '@/app/lib/date';
import { LoadingState, ErrorState, EmptyState } from '@/app/components/data-states';
import { Button } from '@/app/components/ui/button';
import { PageHeader } from '@/app/components/ui/page-header';
import { Modal, ConfirmDialog } from '../_components/operational-dialog';
import styles from '../_components/operational-ui.module.css';

const STATUS: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado' };
const FIELDS = [
  { value: 'salaryBase', label: 'Salário base (R$)' },
  { value: 'overtime50', label: 'Hora extra 50% (horas)' },
  { value: 'overtime100', label: 'Hora extra 100% (horas)' },
  { value: 'nightShift', label: 'Adicional noturno (horas)' },
  { value: 'absenceMinutes', label: 'Faltas (minutos)' },
  { value: 'lateMinutes', label: 'Atrasos (minutos)' },
  { value: 'earlyLeaveMinutes', label: 'Saídas antecipadas (minutos)' },
];
const money = (value: unknown) => value == null ? 'Indisponível' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => value.slice(0, 10).split('-').reverse().join('/');
const period = (item: any) => `${date(item.periodStart)} a ${date(item.periodEnd)}`;
type Decision = { action: 'generate' | 'review' | 'approve' | 'close' | 'delete'; item?: any };

export default function FechamentoPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month')! : saoPauloMonthKey();
  const [year, monthNumber] = month.split('-').map(Number);
  const canManage = hasPermission(user, 'time_tracking.view_all') && ['DEV', 'ADMIN', 'RH'].includes(String(user?.profile ?? user?.role ?? '').toUpperCase());
  const [periodStart, setPeriodStart] = useState(`${month}-01`);
  const [periodEnd, setPeriodEnd] = useState(`${month}-${new Date(year, monthNumber, 0).getDate()}`);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [reopenItem, setReopenItem] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const list = useQuery(api.timeClosing.list, [], { enabled: canManage });
  const company = useQuery(api.companies.me, [], { enabled: canManage });
  const closings = useMemo(() => (list.data ?? []).filter((item: any) => item.periodStart.slice(0, 10) >= periodStart && item.periodEnd.slice(0, 10) <= periodEnd), [list.data, periodStart, periodEnd]);
  const totals = closings.reduce((total: any, item: any) => ({
    gross: total.gross + Number(item.grossPay ?? 0), inss: total.inss + Number(item.inssDiscount ?? 0),
    irrf: total.irrf + Number(item.irrfDiscount ?? 0), fgts: total.fgts + Number(item.fgtsAmount ?? 0), net: total.net + Number(item.netPay ?? 0),
  }), { gross: 0, inss: 0, irrf: 0, fgts: 0, net: 0 });
  useEffect(() => { setDecision(null); setAdjustItem(null); setReopenItem(null); setError(null); setNotice(null); }, [user?.companyId, periodStart, periodEnd]);

  async function run(operation: () => Promise<unknown>, done: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice(null);
    try { await operation(); list.refetch(); done(); setNotice('Alteração salva. Os valores serão atualizados com a resposta do servidor.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir a operação.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function reconcile(item: any) {
    const current = await api.timeClosing.getById(item.id);
    if (current.status !== item.status || current.updatedAt !== item.updatedAt || Number(current.netPay) !== Number(item.netPay)) {
      list.refetch(); throw new Error('Este fechamento foi alterado. Feche o diálogo, atualize e revise os valores antes de confirmar.');
    }
    return current;
  }
  async function confirm() {
    if (!decision) return;
    await run(async () => {
      if (decision.action === 'generate') {
        if (!periodStart || !periodEnd || periodStart > periodEnd) throw new Error('Informe um período válido: o fim deve ser igual ou posterior ao início.');
        const [selectedYear, selectedMonth] = periodStart.split('-').map(Number);
        return api.timeClosing.generate({ periodStart, periodEnd, month: selectedMonth, year: selectedYear });
      }
      const item = await reconcile(decision.item);
      if (decision.action === 'review') return api.timeClosing.submitReview(item.id);
      if (decision.action === 'approve') return api.timeClosing.approve(item.id);
      if (decision.action === 'close') return api.timeClosing.close(item.id);
      return api.timeClosing.delete(item.id);
    }, () => setDecision(null));
  }
  async function download(item: any) {
    if (downloading) return;
    setDownloading(item.id); setError(null);
    try { await api.documents.downloadIndividual(item.id); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível baixar o PDF.'); }
    finally { setDownloading(null); }
  }

  if (authLoading) return <LoadingState label="Carregando fechamento..." />;
  if (!canManage) return <ErrorState message="Acesso ao fechamento restrito a administradores e RH autorizados." />;
  const decisionLabel = decision?.action === 'generate' ? 'Gerar / recalcular fechamento' : decision?.action === 'review' ? 'Enviar para revisão' : decision?.action === 'approve' ? 'Aprovar fechamento' : decision?.action === 'close' ? 'Fechar competência' : 'Excluir fechamento';
  return (
    <div className="space-y-5">
      <PageHeader title="Fechamento" subtitle="Revise a jornada e os valores antes de aprovar ou fechar a competência." actions={<Button variant="outline" onClick={list.refetch} disabled={list.loading || busy}><RefreshCw size={18} /> Atualizar</Button>} />
      <p className="text-sm text-slate-500">{company.data?.name ?? 'Empresa atual'} · Rascunho → Em revisão → Aprovado → Fechado</p>
      <form className="card-v2 flex flex-wrap items-end gap-3 p-4" onSubmit={event => { event.preventDefault(); if (!busy) setDecision({ action: 'generate' }); }}>
        <label className="min-w-0 flex-1 space-y-1"><span>Início do período *</span><input required type="date" value={periodStart} onChange={event => setPeriodStart(event.target.value)} disabled={busy} className="input-v2 w-full" /></label>
        <label className="min-w-0 flex-1 space-y-1"><span>Fim do período *</span><input required type="date" min={periodStart} value={periodEnd} onChange={event => setPeriodEnd(event.target.value)} disabled={busy} className="input-v2 w-full" /></label>
        <Button type="submit" disabled={busy || !periodStart || !periodEnd || periodStart > periodEnd}>Gerar / recalcular</Button>
      </form>
      {error && !decision && !adjustItem && !reopenItem && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{notice}</p>}
      {list.loading ? <LoadingState label="Carregando fechamentos..." /> : list.error ? <ErrorState message={list.error} onRetry={list.refetch} /> : <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Totais dos fechamentos no período">
          {[['Bruto', totals.gross], ['INSS', totals.inss], ['IRRF', totals.irrf], ['FGTS patronal', totals.fgts], ['Líquido', totals.net]].map(([label, value]) => <div key={String(label)} className="card-v2 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{money(value)}</p></div>)}
        </section>
        {closings.length === 0 ? <EmptyState message="Nenhum fechamento encontrado no período. Gere o fechamento para revisar os valores." /> : <div className="card-v2 overflow-hidden"><div className="overflow-x-auto" role="region" aria-label="Fechamentos por funcionário" tabIndex={0}><div className={styles.records}>
          <table className="w-full min-w-[1150px] text-left"><thead className="border-b bg-slate-50"><tr>{['Funcionário', 'Jornada', 'Proventos', 'Descontos', 'FGTS / líquido', 'Status', 'Ações'].map(label => <th key={label} scope="col" className="p-4">{label}</th>)}</tr></thead>
            <tbody className="divide-y">{closings.map((item: any) => <tr key={item.id} className="align-top">
              <td data-label="Funcionário" className="p-4"><p className="font-semibold">{item.employee?.name ?? 'Funcionário não informado'}</p><p className="text-sm">{item.employee?.registration ?? item.employeeId}</p><p className="text-sm text-slate-500">{item.employee?.department ?? item.employee?.role ?? 'Sem departamento/cargo'}</p><p className="mt-2 text-sm">{period(item)} · salário base {money(item.salaryBase)}</p></td>
              <td data-label="Jornada" className="space-y-1 p-4"><p>Extra 50%: {Number(item.overtime50 ?? 0).toFixed(2)} h</p><p>Extra 100%: {Number(item.overtime100 ?? 0).toFixed(2)} h</p><p>Noturno: {Number(item.nightShift ?? 0).toFixed(2)} h</p><p>Faltas: {item.absenceMinutes ?? 0} min</p><p>Atrasos: {item.lateMinutes ?? 0} min</p><p>Saídas antecipadas: {item.earlyLeaveMinutes ?? 0} min</p></td>
              <td data-label="Proventos" className="space-y-1 p-4"><p>Extras: {money(Number(item.overtime50Value ?? 0) + Number(item.overtime100Value ?? 0))}</p><p>Noturno: {money(item.nightShiftValue)}</p><p>DSR: {money(item.dsrValue)}</p><p>Bruto: {money(item.grossPay)}</p></td>
              <td data-label="Descontos" className="space-y-1 p-4"><p>Faltas: {money(item.absenceDiscount)}</p><p>INSS: {money(item.inssDiscount)}</p><p>IRRF: {money(item.irrfDiscount)}</p></td>
              <td data-label="FGTS / líquido" className="space-y-2 p-4"><p>FGTS patronal: {money(item.fgtsAmount)}</p><p className="font-semibold">Líquido: {money(item.netPay)}</p></td>
              <td data-label="Status" className="p-4">{STATUS[item.status] ?? item.status}</td>
              <td data-label="Ações" className="p-4"><div className="flex flex-col gap-2">
                <Button variant="outline" onClick={() => download(item)} disabled={!!downloading}><Download size={18} /> {downloading === item.id ? 'Gerando PDF...' : 'Folha PDF'}</Button>
                {['DRAFT', 'IN_REVIEW'].includes(item.status) && <Button variant="outline" disabled={busy} onClick={() => { setError(null); setAdjustItem(item); }}>Ajuste manual</Button>}
                {item.status === 'DRAFT' && <Button variant="outline" disabled={busy} onClick={() => setDecision({ action: 'review', item })}>Enviar para revisão</Button>}
                {item.status === 'IN_REVIEW' && <Button disabled={busy} onClick={() => setDecision({ action: 'approve', item })}>Aprovar fechamento</Button>}
                {item.status === 'APPROVED' && <Button disabled={busy} onClick={() => setDecision({ action: 'close', item })}>Fechar competência</Button>}
                {item.status === 'CLOSED' && <Button variant="outline" disabled={busy} onClick={() => { setError(null); setReason(''); setReopenItem(item); }}>Reabrir fechamento</Button>}
                {item.status !== 'CLOSED' && <Button variant="danger" disabled={busy} onClick={() => setDecision({ action: 'delete', item })}>Excluir fechamento</Button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div></div></div>}
      </>}
      <ConfirmDialog isOpen={!!decision} onClose={() => { setDecision(null); setError(null); }} onConfirm={confirm} title={decisionLabel} description={decision?.item ? `${decision.item.employee?.name ?? 'Funcionário'} · ${period(decision.item)} · líquido ${money(decision.item.netPay)}. ${decision.action === 'delete' ? 'Este fechamento será excluído.' : decision.action === 'close' ? 'Após fechar, correções exigem reabertura com motivo.' : 'Confirme a transição após revisar os valores.'}` : `${company.data?.name ?? 'Empresa atual'} · ${date(periodStart)} a ${date(periodEnd)}. O servidor gera ou recalcula os rascunhos dos funcionários elegíveis. Fechamentos protegidos continuam bloqueados.`} confirmText={decisionLabel} variant={decision?.action === 'delete' ? 'danger' : 'primary'} isLoading={busy} />
      {decision && error && <p role="alert" className="fixed bottom-6 left-1/2 z-[60] w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</p>}
      {adjustItem && <AdjustmentModal item={adjustItem} busy={busy} error={error} onClose={() => { if (!busy) { setAdjustItem(null); setError(null); } }} onSave={(field, value, why) => run(async () => { await reconcile(adjustItem); return api.timeClosing.adjust(adjustItem.id, field, value, why); }, () => setAdjustItem(null))} />}
      <Modal isOpen={!!reopenItem} onClose={() => { if (!busy) { setReopenItem(null); setError(null); } }} title="Reabrir fechamento">
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (reopenItem && reason.trim()) void run(async () => { await reconcile(reopenItem); return api.timeClosing.reopen(reopenItem.id, reason.trim()); }, () => setReopenItem(null)); }}>
          <p>{reopenItem?.employee?.name} · {reopenItem ? period(reopenItem) : ''} · líquido {money(reopenItem?.netPay)}. A reabertura devolve o fechamento ao rascunho e registra o motivo no histórico.</p>
          <label className="block space-y-1"><span>Motivo obrigatório *</span><textarea required className="input-v2 w-full" value={reason} onChange={event => setReason(event.target.value)} disabled={busy} rows={3} /></label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={() => setReopenItem(null)}>Cancelar</Button><Button type="submit" isLoading={busy} disabled={!reason.trim()}>Reabrir fechamento</Button></div>
        </form>
      </Modal>
    </div>
  );
}

function AdjustmentModal({ item, busy, error, onClose, onSave }: { item: any; busy: boolean; error: string | null; onClose: () => void; onSave: (field: string, value: number, reason: string) => Promise<void> }) {
  const [field, setField] = useState('salaryBase');
  const [value, setValue] = useState(String(item.salaryBase ?? 0));
  const [reason, setReason] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const valid = value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && !!reason.trim();
  return <Modal isOpen onClose={onClose} title={reviewing ? 'Confirmar ajuste' : 'Ajuste manual'}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!valid || busy) return; if (!reviewing) setReviewing(true); else void onSave(field, Number(value), reason.trim()); }}>
      <p className="font-semibold">{item.employee?.name} · {period(item)}</p>
      {reviewing ? <div className="rounded-lg border bg-slate-50 p-4"><p>{FIELDS.find(option => option.value === field)?.label}</p><p>Valor anterior: {String(item[field] ?? 0)} → novo valor: {value}</p><p>Motivo: {reason}</p><p className="mt-2 text-sm">Os efeitos sobre o líquido e os tributos serão calculados pelo servidor.</p></div> : <>
        <label className="block space-y-1"><span>Campo para ajustar</span><select className="input-v2 w-full" value={field} onChange={event => { setField(event.target.value); setValue(String(item[event.target.value] ?? 0)); }}>{FIELDS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="block space-y-1"><span>Novo valor *</span><input required type="number" step="any" min="0" className="input-v2 w-full" value={value} onChange={event => setValue(event.target.value)} /></label>
        <label className="block space-y-1"><span>Justificativa *</span><textarea required className="input-v2 w-full" rows={3} value={reason} onChange={event => setReason(event.target.value)} /></label>
      </>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={busy} onClick={reviewing ? () => setReviewing(false) : onClose}>{reviewing ? 'Voltar ao ajuste' : 'Cancelar'}</Button><Button type="submit" isLoading={busy} disabled={!valid}>{reviewing ? 'Confirmar ajuste' : 'Revisar ajuste'}</Button></div>
    </form>
  </Modal>;
}
