'use client';

import { Award, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/app/components/data-states';
import { Button, ConfirmDialog } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '@/app/hooks/use-data';
import { api, type PromotionItem, type PromotionPolicy } from '@/app/lib/api';
import { resolveUserRole } from '@/app/lib/user-role';
import { ROLE_ACCESS, roleIn } from '@/app/lib/role-access';

const input = 'input-v2 w-full text-sm';
const brl = (v: number | null) => (v === null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const br = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const STATUS = { SCHEDULED: ['Agendada', 'bg-amber-50 text-amber-800'], APPLIED: ['Aplicada', 'bg-emerald-50 text-emerald-800'], CANCELED: ['Cancelada', 'bg-zinc-100 text-zinc-600'] } as const;
const message = (cause: unknown, fallback: string) => (cause instanceof Error && cause.message ? cause.message : fallback);

/** Promoções: a empresa define as regras, lança a promoção e o sistema ajusta cargo e salário e avisa o colaborador sozinho. */
export default function PromotionsPage() {
  const { user } = useAuth();
  const role = resolveUserRole(user);
  const canWrite = roleIn(ROLE_ACCESS.promotionsWrite, role);
  // Aplica as promocoes agendadas ja vencidas (POST) e so entao lista; quem nao pode aplicar (403) apenas le.
  const list = useQuery(async () => { await api.promotions.applyDue().catch(() => undefined); return api.promotions.list(); }, []);
  const policy = useQuery(() => api.promotions.policy(), []);
  const people = useQuery(() => api.employees.list(), [], { enabled: canWrite });

  const [employeeId, setEmployeeId] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancel, setCancel] = useState<PromotionItem | null>(null);
  const [rules, setRules] = useState<PromotionPolicy | null>(null);
  const [ladder, setLadder] = useState('');
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => { if (policy.data) { setRules(policy.data); setLadder(policy.data.positions.join('\n')); } }, [policy.data]);
  const employee = (people.data ?? []).find((p) => p.id === employeeId);
  const currentSalary = employee?.salary ? Number(employee.salary) : null;
  const newSalaryNumber = salary.trim() ? Number(salary.replace(/\./g, '').replace(',', '.')) : null;
  const raise = currentSalary && newSalaryNumber ? ((newSalaryNumber - currentSalary) / currentSalary) * 100 : null;
  const eligible = useMemo(() => (people.data ?? []).filter((p) => p.status !== 'TERMINATED'), [people.data]);
  const canSend = Boolean(employeeId && (position.trim() || newSalaryNumber) && date);

  async function submit() {
    setBusy(true);
    try {
      const result = await api.promotions.create({ employeeId, newPosition: position.trim() || undefined, newSalary: newSalaryNumber ?? undefined, effectiveDate: date, reason: reason.trim() || undefined });
      toast.success(result.status === 'APPLIED' ? 'Promoção aplicada: cargo e salário atualizados e o colaborador foi avisado.' : `Promoção agendada para ${br(date)}. No dia, o sistema atualiza o cadastro e avisa o colaborador.`);
      setEmployeeId(''); setPosition(''); setSalary(''); setReason(''); setDate(today());
      list.refetch(); people.refetch();
    } catch (cause) { toast.error(message(cause, 'Não foi possível lançar a promoção.')); }
    finally { setBusy(false); }
  }
  async function saveRules() {
    if (!rules) return;
    setSavingRules(true);
    try {
      await api.promotions.savePolicy({ ...rules, positions: ladder.split('\n').map((l) => l.trim()).filter(Boolean) });
      toast.success('Regras de promoção salvas.'); policy.refetch();
    } catch (cause) { toast.error(message(cause, 'Não foi possível salvar as regras.')); }
    finally { setSavingRules(false); }
  }
  async function doCancel() {
    if (!cancel) return;
    setBusy(true);
    try { await api.promotions.cancel(cancel.id); toast.success('Promoção cancelada.'); setCancel(null); list.refetch(); }
    catch (cause) { toast.error(message(cause, 'Não foi possível cancelar.')); }
    finally { setBusy(false); }
  }

  if (list.loading && !list.data) return <LoadingState label="Carregando promoções…" />;
  if (list.error) return <ErrorState message={list.error} onRetry={list.refetch} />;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="flex items-center gap-2 text-lg font-bold text-fg"><Award size={20} aria-hidden="true" /> Promoções</h2>
        <p className="mt-1 max-w-3xl text-sm text-fg-sub">Lance a promoção aqui: o sistema confere as regras da empresa, <strong>atualiza cargo e salário no cadastro</strong> na data de vigência e <strong>avisa o colaborador sozinho</strong>. Não precisa mandar comunicado.</p>
      </header>

      {canWrite && (
        <section className="card-v2 space-y-4 p-5">
          <h3 className="flex items-center gap-2 font-semibold"><TrendingUp size={16} aria-hidden="true" /> Nova promoção</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium sm:col-span-2">Funcionário
              <select className={input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Escolha…</option>
                {eligible.map((p) => <option key={p.id} value={p.id}>{p.name}{p.position ? ` · ${p.position}` : ''}</option>)}
              </select>
            </label>
            {employee && <p className="rounded-lg bg-bg-sub p-3 text-sm sm:col-span-2">Hoje: <strong>{employee.position || 'sem cargo'}</strong> · salário <strong>{brl(currentSalary)}</strong>{!employee.userId && <span className="ml-2 text-amber-800">(sem acesso ao sistema: a promoção é lançada, mas o aviso não chega — crie o acesso em Funcionários)</span>}</p>}
            <label className="block text-sm font-medium">Novo cargo
              <input className={input} list="ladder" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Deixe em branco para manter" />
              <datalist id="ladder">{(policy.data?.positions ?? []).map((p) => <option key={p} value={p} />)}</datalist>
            </label>
            <label className="block text-sm font-medium">Novo salário (R$)
              <input className={input} inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Deixe em branco para manter" />
              {raise !== null && <span className={`mt-1 block text-xs ${raise > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{raise > 0 ? '+' : ''}{raise.toFixed(1).replace('.', ',')}% sobre o salário atual</span>}
            </label>
            <label className="block text-sm font-medium">Vale a partir de
              <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
              <span className="mt-1 block text-xs font-normal text-fg-sub">Hoje ou antes: aplica na hora. Data futura: fica agendada.</span>
            </label>
            <label className="block text-sm font-medium">Motivo{policy.data?.requireReason ? ' *' : ''}
              <input className={input} maxLength={250} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: meta anual batida" />
            </label>
          </div>
          <div className="flex justify-end"><Button isLoading={busy} disabled={!canSend} onClick={() => void submit()}>Lançar promoção</Button></div>
        </section>
      )}

      <section className="card-v2 overflow-hidden">
        <header className="border-b border-border p-4"><h3 className="font-semibold">Histórico</h3></header>
        {(list.data ?? []).length === 0 ? <p className="p-8 text-center text-sm text-fg-sub">Nenhuma promoção lançada ainda.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-bg-sub text-xs text-fg-sub"><tr>{['Funcionário', 'Cargo', 'Salário', 'Vigência', 'Situação', 'Aviso', ''].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {(list.data ?? []).map((p) => {
                  const [label, tone] = STATUS[p.status];
                  const pct = p.previousSalary && p.newSalary ? ((p.newSalary - p.previousSalary) / p.previousSalary) * 100 : null;
                  return (
                    <tr key={p.id}>
                      <th scope="row" className="px-4 py-3 text-left font-medium">{p.employee.name}{p.reason && <span className="block text-xs font-normal text-fg-sub">{p.reason}</span>}</th>
                      <td className="px-4 py-3">{p.newPosition ? `${p.previousPosition || '—'} → ${p.newPosition}` : 'mantido'}</td>
                      <td className="px-4 py-3 tabular-nums">{p.newSalary !== null ? `${brl(p.previousSalary)} → ${brl(p.newSalary)}${pct !== null ? ` (+${pct.toFixed(1).replace('.', ',')}%)` : ''}` : 'mantido'}</td>
                      <td className="px-4 py-3">{br(p.effectiveDate)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span></td>
                      <td className="px-4 py-3 text-xs text-fg-sub">{p.notificationId ? 'Enviado' : p.status === 'APPLIED' ? 'Não enviado' : '—'}</td>
                      <td className="px-4 py-3 text-right">{canWrite && p.status === 'SCHEDULED' && <Button size="sm" variant="outline" onClick={() => setCancel(p)}>Cancelar</Button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rules && (
        <section className="card-v2 space-y-4 p-5">
          <header>
            <h3 className="font-semibold">Regras de promoção da empresa</h3>
            <p className="text-sm text-fg-sub">O sistema recusa promoções que não cumprem estas regras.</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Tempo mínimo no cargo (meses)
              <input type="number" min={0} max={240} className={input} disabled={!canWrite} value={rules.minMonthsInRole} onChange={(e) => setRules({ ...rules, minMonthsInRole: Math.max(0, Number(e.target.value) || 0) })} />
              <span className="mt-1 block text-xs font-normal text-fg-sub">Conta da admissão ou da última promoção. 0 = sem exigência.</span>
            </label>
            <label className="block text-sm font-medium">Aumento máximo por promoção (%)
              <input className={input} inputMode="decimal" disabled={!canWrite} placeholder="sem limite" value={rules.maxRaisePercent ?? ''} onChange={(e) => setRules({ ...rules, maxRaisePercent: e.target.value ? Number(e.target.value.replace(',', '.')) || null : null })} />
            </label>
            <label className="block text-sm font-medium sm:col-span-2">Escada de cargos permitidos (um por linha)
              <textarea className={`${input} min-h-24`} disabled={!canWrite} value={ladder} onChange={(e) => setLadder(e.target.value)} placeholder={'Analista Júnior\nAnalista Pleno\nAnalista Sênior'} />
              <span className="mt-1 block text-xs font-normal text-fg-sub">Em branco = qualquer cargo pode ser digitado.</span>
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canWrite} checked={rules.requireReason} onChange={(e) => setRules({ ...rules, requireReason: e.target.checked })} /> Exigir o motivo da promoção</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={!canWrite} checked={rules.autoNotify} onChange={(e) => setRules({ ...rules, autoNotify: e.target.checked })} /> Avisar o colaborador automaticamente</label>
          </div>
          {canWrite && <div className="flex justify-end"><Button isLoading={savingRules} onClick={() => void saveRules()}>Salvar regras</Button></div>}
        </section>
      )}

      <ConfirmDialog isOpen={Boolean(cancel)} onClose={() => !busy && setCancel(null)} onConfirm={doCancel} isLoading={busy} variant="danger" title="Cancelar promoção agendada" confirmText="Cancelar promoção"
        description={cancel ? `${cancel.employee.name}: ${cancel.newPosition ?? 'cargo mantido'} a partir de ${br(cancel.effectiveDate)}. O cadastro não será alterado.` : ''} />
    </div>
  );
}
