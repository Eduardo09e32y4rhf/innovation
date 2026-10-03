'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Calculator, CheckCircle2, FilePenLine, FileText, Landmark,
  LockKeyhole, ReceiptText, RefreshCw, Search, ShieldCheck, UsersRound, X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, PageHeader, Modal as SharedModal } from '@/app/components/ui';
import { toast } from 'sonner';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery } from '../_components/use-platform-query';
import { ApiError, type AccountingClosing, type AccountingCompanyRow, type AccountingPayroll, api } from '@/app/lib/api';

const money = (value: number | string | null | undefined) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)) : '-';
const monthName = (value: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${value}-01T12:00:00`));

type Tab = 'time' | 'payroll' | 'billing';

export default function AccountingPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const query = useSearchParams();
  const tenant = String(params?.tenant || '');
  const queueRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<Tab | ''>('');
  const role = String(user?.profile || user?.role || '').toUpperCase();
  const allowed = role === 'DEV' || role === 'CEO';
  const [month, setMonth] = useState(() => /^\d{4}-(0[1-9]|1[0-2])$/.test(query.get('month') || '') ? query.get('month')! : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [search, setSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState(query.get('companyId') || '');
  const [tab, setTab] = useState<Tab>(['time', 'payroll', 'billing'].includes(query.get('tab') || '') ? query.get('tab') as Tab : 'time');
  const [editingClosing, setEditingClosing] = useState<AccountingClosing | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<AccountingPayroll | null>(null);

  const overview = useQuery(() => api.platform.accounting.overview(month), [month], { enabled: allowed });
  const selectedCompany = overview.data?.companies.find((company) => company.id === selectedCompanyId);
  const closings = useQuery(() => api.platform.accounting.closings(selectedCompanyId, month), [selectedCompanyId, month], { enabled: allowed && Boolean(selectedCompanyId) && tab === 'time' });
  const payroll = useQuery(() => api.platform.accounting.payroll(selectedCompanyId, month), [selectedCompanyId, month], { enabled: allowed && Boolean(selectedCompanyId) && tab === 'payroll' });

  const companies = useMemo(() => (overview.data?.companies || []).filter(company =>
    [company.name, company.document || ''].some(value => value.toLowerCase().includes(search.trim().toLowerCase()))
    && (!focus || (focus === 'time' ? company.closingsInReview > 0 : focus === 'payroll' ? company.payrollsPending > 0 : company.invoices > 0))
  ), [overview.data?.companies, search, focus]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('month', month);
    if (selectedCompanyId) next.set('companyId', selectedCompanyId);
    next.set('tab', tab);
    router.replace(`/${tenant}/dashboard/platform/accounting?${next}`, { scroll: false });
  }, [month, selectedCompanyId, tab, router, tenant]);

  function openFocus(nextTab: Tab) {
    setFocus(nextTab);
    setTab(nextTab);
    queueRef.current?.scrollIntoView({ block: 'start' });
    queueRef.current?.focus();
  }

  if (!allowed) return <Restricted />;

  function selectCompany(id: string, nextTab: Tab = 'time') {
    setSelectedCompanyId(id);
    setTab(nextTab);
  }

  async function refresh() {
    overview.refetch();
    if (selectedCompanyId && tab === 'time') closings.refetch();
    if (selectedCompanyId && tab === 'payroll') payroll.refetch();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Contabilidade" subtitle="Revise ponto, folha e cobranças por empresa e competência." actions={<div className="flex flex-wrap items-end gap-2"><label className="text-sm font-medium text-fg">Competência<input className="input-v2 mt-1 block" type="month" required value={month} onChange={event => { if (event.target.value) { setMonth(event.target.value); setEditingClosing(null); setEditingPayroll(null); } }} /></label><Button variant="outline" onClick={refresh}><RefreshCw size={18} /> Atualizar</Button></div>} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Landmark} label="Empresas monitoradas" value={overview.data?.metrics.companies} hint="Escopo global" tone="violet" />
        <Metric icon={FilePenLine} label="Correções de ponto" value={overview.data?.metrics.closingsInReview} hint={`${overview.data?.metrics.closings ?? 0} fechamentos no período`} tone="amber" />
        <Metric icon={Calculator} label="Folhas pendentes" value={overview.data?.metrics.payrollsPending} hint={`${overview.data?.metrics.payrolls ?? 0} folhas calculadas`} tone="blue" />
        <Metric icon={ReceiptText} label="Sem nota fiscal" value={overview.data?.metrics.invoicesWithoutFiscalNumber} hint={`${money(overview.data?.metrics.invoiceTotal)} em cobranças`} tone="rose" />
      </section>

      <section className="rounded-v2 border border-brand/20 bg-brand/5 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><ShieldCheck size={18} /></span><div><p className="text-sm font-black text-fg">Governança antes da correção</p><p className="mt-1 text-xs font-medium leading-5 text-fg-mut">Toda correção exige motivo. A trilha disponível depende do registro retornado pelo servidor; confira os totais após salvar. Fechamentos aprovados ou folhas pagas permanecem protegidos.</p></div></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
        <div ref={queueRef} tabIndex={-1} className="card-v2 overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub">Painel de empresas</p><h2 className="mt-1 text-base font-semibold text-fg">Fila de revisão por empresa</h2>{focus && <Button variant="ghost" onClick={() => { setFocus(''); setSearch(''); }}>Limpar filtros</Button>}</div><label className="input-v2 flex items-center gap-2 px-3 sm:w-64"><Search size={14} className="text-fg-sub" /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Buscar empresa por nome ou CNPJ" placeholder="Nome ou CNPJ" className="w-full bg-transparent text-xs font-semibold text-fg outline-none" /></label></div>
          {overview.loading ? <div className="p-8 text-sm font-semibold text-fg-mut">Carregando escopo contábil...</div> : overview.error ? <div role="alert" className="p-5 text-sm text-danger">{overview.error}<Button variant="outline" onClick={overview.refetch}>Tentar novamente</Button></div> : companies.length === 0 ? <div className="p-8 text-sm font-semibold text-fg-mut">Nenhuma empresa encontrada.</div> : <div className="divide-y divide-border">{companies.map((company) => <CompanyRow key={company.id} company={company} selected={company.id === selectedCompanyId} onSelect={selectCompany} />)}</div>}
        </div>
        <div className="card-v2 p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-fg-sub">Próximos focos</p><h3 className="mt-1 text-base font-black text-fg">O que precisa de atenção</h3><div className="mt-4 space-y-2"><Focus icon={FilePenLine} label="Folhas de ponto em revisão" value={overview.data?.metrics.closingsInReview ?? 0} tone="amber" onClick={() => openFocus('time')} /><Focus icon={Calculator} label="Folhas aguardando validação" value={overview.data?.metrics.payrollsPending ?? 0} tone="blue" onClick={() => openFocus('payroll')} /><Focus icon={ReceiptText} label="Empresas com cobranças no período" value={overview.data?.companies.filter(company => company.invoices > 0).length ?? 0} tone="rose" onClick={() => openFocus('billing')} /></div><div className="mt-5 rounded-xl bg-bg-sub p-3 text-xs font-medium leading-5 text-fg-mut">Selecione uma empresa para abrir a fila detalhada. A Innovation pode ser tratada como qualquer outra empresa no mesmo fluxo.</div></div>
      </section>

      {selectedCompany && <CompanyWorkspace financeHref={`/${tenant}/dashboard/platform/finance?companyId=${encodeURIComponent(selectedCompany.id)}&from=${month}-01&to=${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate()}`} queryError={tab === 'time' ? closings.error : tab === 'payroll' ? payroll.error : null} onRetry={tab === 'time' ? closings.refetch : payroll.refetch} company={selectedCompany} tab={tab} setTab={setTab} closings={closings.data || []} payroll={payroll.data || []} loading={closings.loading || payroll.loading} onEditClosing={setEditingClosing} onEditPayroll={setEditingPayroll} />}
      {editingClosing && <ClosingCorrection closing={editingClosing} onClose={() => setEditingClosing(null)} onDone={() => { setEditingClosing(null); closings.refetch(); overview.refetch(); }} />}
      {editingPayroll && <PayrollCorrection payroll={editingPayroll} onClose={() => setEditingPayroll(null)} onDone={() => { setEditingPayroll(null); payroll.refetch(); overview.refetch(); }} />}
    </div>
  );
}

function Restricted() { return <div className="card-v2 mx-auto max-w-2xl p-10 text-center"><LockKeyhole className="mx-auto text-danger" size={30} /><h1 className="mt-3 text-xl font-black text-fg">Acesso restrito</h1><p className="mt-2 text-sm font-medium text-fg-mut">A Contabilidade é exclusiva para os perfis DEV e CEO.</p></div>; }

function Metric({ icon: Icon, label, value, hint, tone }: { icon: typeof Calculator; label: string; value?: number; hint: string; tone: 'violet' | 'amber' | 'blue' | 'rose' }) { const colors = { violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-sky-50 text-sky-700', rose: 'bg-rose-50 text-rose-700' }; return <div className="card-v2 flex items-center gap-3 p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[tone]}`}><Icon size={18} /></span><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-fg-sub">{label}</p><p className="mt-1 text-xl font-black text-fg">{value ?? '—'}</p><p className="mt-1 truncate text-[10px] font-medium text-fg-mut">{hint}</p></div></div>; }

function CompanyRow({ company, selected, onSelect }: { company: AccountingCompanyRow; selected: boolean; onSelect: (id: string, tab?: Tab) => void }) { return <button type="button" onClick={() => onSelect(company.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-sub ${selected ? 'bg-brand/5' : ''}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-brand text-white' : 'bg-bg-sub text-fg-sub'}`}><Landmark size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-fg">{company.name}</span><span className="block truncate text-[10px] font-medium text-fg-mut">{company.document || 'Documento não informado'}</span></span><span className="hidden items-center gap-2 md:flex"><Badge value={company.closingsInReview} label="ponto" tone="amber" /><Badge value={company.payrollsPending} label="folha" tone="blue" /><Badge value={company.invoicesOverdue} label="vencidas" tone="rose" /></span><ArrowRight size={15} className={selected ? 'text-brand' : 'text-fg-sub'} /></button>; }
function Badge({ value, label, tone }: { value: number; label: string; tone: 'amber' | 'blue' | 'rose' }) { const colors = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-sky-50 text-sky-700', rose: 'bg-rose-50 text-rose-700' }; return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${colors[tone]}`}>{value} {label}</span>; }
function Focus({ icon: Icon, label, value, tone, onClick }: { icon: typeof Calculator; label: string; value: number; tone: 'amber' | 'blue' | 'rose'; onClick: () => void }) { const colors = { amber: 'text-amber-700 bg-amber-50', blue: 'text-sky-700 bg-sky-50', rose: 'text-rose-700 bg-rose-50' }; return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-bg-sub"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[tone]}`}><Icon size={14} /></span><span className="flex-1 text-xs font-bold text-fg">{label}</span><span className="text-sm font-black text-fg">{value}</span><ArrowRight size={14} className="text-fg-sub" /></button>; }

function CompanyWorkspace({ financeHref, queryError, onRetry, company, tab, setTab, closings, payroll, loading, onEditClosing, onEditPayroll }: { financeHref: string; queryError: string | null; onRetry: () => void; company: AccountingCompanyRow; tab: Tab; setTab: (tab: Tab) => void; closings: AccountingClosing[]; payroll: AccountingPayroll[]; loading: boolean; onEditClosing: (item: AccountingClosing) => void; onEditPayroll: (item: AccountingPayroll) => void }) { const tabs: Array<[Tab, string, typeof Calculator]> = [['time', 'Ponto e fechamentos', FilePenLine], ['payroll', 'Folha e valores', Calculator], ['billing', 'Notas e mensalidades', ReceiptText]]; return <section className="card-v2 overflow-hidden"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-brand">Empresa selecionada</p><h3 className="mt-1 text-lg font-black text-fg">{company.name}</h3></div><span className="chip-neutral"><UsersRound size={12} /> {company.payrolls} folhas · {company.closings} fechamentos</span></div><div className="flex gap-2 overflow-x-auto border-b border-border px-4 pt-2">{tabs.map(([key, label, Icon]) => <button key={key} type="button" onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-black ${tab === key ? 'border-brand text-brand' : 'border-transparent text-fg-mut hover:text-fg'}`}><Icon size={14} /> {label}</button>)}</div><div className="p-4">{queryError ? <div role="alert" className="text-sm text-danger">{queryError}<Button variant="outline" onClick={onRetry}>Tentar novamente</Button></div> : <>{tab === 'time' && <ClosingList items={closings} loading={loading} onEdit={onEditClosing} />}{tab === 'payroll' && <PayrollList items={payroll} loading={loading} onEdit={onEditPayroll} />}{tab === 'billing' && <div className="rounded-xl border border-dashed border-border bg-bg-sub p-5"><div className="flex items-start gap-3"><ReceiptText className="text-brand" size={20} /><div><p className="text-sm font-black text-fg">Fiscal e mensalidades</p><p className="mt-1 text-xs font-medium leading-5 text-fg-mut">Consulte as cobranças desta empresa e do período selecionado no Financeiro. Emissão fiscal ainda não configurada: depende de provedor, credenciais e homologação.</p><a href={financeHref} className="btn-v2-outline mt-4 inline-flex">Abrir Financeiro <ArrowRight size={14} /></a></div></div></div>}</>}</div></section>; }

function ClosingList({ items, loading, onEdit }: { items: AccountingClosing[]; loading: boolean; onEdit: (item: AccountingClosing) => void }) { if (loading) return <p className="p-4 text-sm font-semibold text-fg-mut">Carregando fechamentos...</p>; if (!items.length) return <Empty message="Nenhum fechamento para esta competência." />; return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-border text-[10px] font-black uppercase tracking-wide text-fg-sub"><th className="px-3 py-3">Colaborador</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Líquido</th><th className="px-3 py-3">Atualizado</th><th className="px-3 py-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-border">{items.map((item) => <tr key={item.id}><td className="px-3 py-3"><p className="text-xs font-black text-fg">{item.employee?.name || 'Colaborador'}</p><p className="text-[10px] font-medium text-fg-mut">{item.employee?.position || '—'}</p></td><td className="px-3 py-3"><span className="chip-neutral">{item.status === 'IN_REVIEW' ? 'Em revisão' : item.status === 'DRAFT' ? 'Rascunho' : item.status}</span></td><td className="px-3 py-3 text-xs font-black text-fg">{money(item.netPay)}</td><td className="px-3 py-3 text-xs font-medium text-fg-mut">{date(item.updatedAt)}</td><td className="px-3 py-3 text-right">{['DRAFT', 'IN_REVIEW'].includes(item.status) ? <button type="button" onClick={() => onEdit(item)} className="btn-v2-outline px-3 py-2 text-[11px]"><FilePenLine size={13} /> Corrigir</button> : <span className="text-[10px] font-bold text-fg-sub">Protegido</span>}</td></tr>)}</tbody></table></div>; }
function PayrollList({ items, loading, onEdit }: { items: AccountingPayroll[]; loading: boolean; onEdit: (item: AccountingPayroll) => void }) { if (loading) return <p className="p-4 text-sm font-semibold text-fg-mut">Carregando folhas...</p>; if (!items.length) return <Empty message="Nenhuma folha para esta competência." />; return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead><tr className="border-b border-border text-[10px] font-black uppercase tracking-wide text-fg-sub"><th className="px-3 py-3">Colaborador</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Bruto</th><th className="px-3 py-3">Líquido</th><th className="px-3 py-3 text-right">Ação</th></tr></thead><tbody className="divide-y divide-border">{items.map((item) => <tr key={item.id}><td className="px-3 py-3"><p className="text-xs font-black text-fg">{item.employee?.name || 'Colaborador'}</p><p className="text-[10px] font-medium text-fg-mut">{item.employee?.position || '—'}</p></td><td className="px-3 py-3"><span className="chip-neutral">{item.status}</span></td><td className="px-3 py-3 text-xs font-black text-fg">{money(item.grossSalary)}</td><td className="px-3 py-3 text-xs font-black text-emerald-700">{money(item.netSalary)}</td><td className="px-3 py-3 text-right">{['DRAFT', 'PROCESSING'].includes(item.status) ? <button type="button" onClick={() => onEdit(item)} className="btn-v2-outline px-3 py-2 text-[11px]"><FilePenLine size={13} /> Corrigir</button> : <span className="text-[10px] font-bold text-fg-sub">Protegida</span>}</td></tr>)}</tbody></table></div>; }
function Empty({ message }: { message: string }) { return <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm font-semibold text-fg-mut">{message}</div>; }

function ClosingCorrection({ closing, onClose, onDone }: { closing: AccountingClosing; onClose: () => void; onDone: () => void }) { const [field, setField] = useState('salaryBase'); const [value, setValue] = useState(String(closing.salaryBase ?? 0)); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); async function save(event: React.FormEvent) { event.preventDefault(); if (saving) return; if (!reason.trim() || !value.trim() || !Number.isFinite(Number(value)) || Number(value) < 0) return toast.error('Informe um valor válido e o motivo da correção.'); setSaving(true); try { await api.platform.accounting.adjustClosing(closing.id, { field, newValue: Number(value), reason }); toast.success('Correção do fechamento salva.'); onDone(); } catch (error) { toast.error(error instanceof ApiError ? error.message : 'Não foi possível corrigir o fechamento.'); } finally { setSaving(false); } } return <Modal title="Corrigir fechamento de ponto" subtitle={closing.employee?.name || 'Colaborador'} onClose={onClose}><form onSubmit={save} className="space-y-4"><label className="form-group"><span>Campo</span><select value={field} onChange={(event) => { setField(event.target.value); setValue(String((closing as unknown as Record<string, unknown>)[event.target.value] ?? 0)); }} className="form-control">{[['salaryBase', 'Salário base'], ['overtime50', 'Hora extra 50%'], ['overtime100', 'Hora extra 100%'], ['nightShift', 'Adicional noturno'], ['absenceMinutes', 'Faltas (minutos)'], ['lateMinutes', 'Atrasos (minutos)'], ['earlyLeaveMinutes', 'Saídas antecipadas (minutos)']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><p className="rounded-lg bg-bg-sub p-3 text-sm">Valor atual: {String((closing as unknown as Record<string, unknown>)[field] ?? 'Não informado')}</p><label className="form-group"><span>Novo valor</span><input className="form-control" type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} required /></label><label className="form-group"><span>Motivo da correção</span><textarea className="form-control min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explique o documento ou conferência que originou o ajuste." required /></label><ModalActions saving={saving} onClose={onClose} /></form></Modal>; }

function PayrollCorrection({ payroll, onClose, onDone }: { payroll: AccountingPayroll; onClose: () => void; onDone: () => void }) { const [field, setField] = useState('netSalary'); const [value, setValue] = useState(String(payroll.netSalary ?? 0)); const [reason, setReason] = useState(''); const [saving, setSaving] = useState(false); async function save(event: React.FormEvent) { event.preventDefault(); if (!reason.trim()) return toast.error('Informe o motivo da correção.'); setSaving(true); try { await api.platform.accounting.correctPayroll(payroll.id, { [field]: Number(value), reason }); toast.success('Correção da folha salva. Confira os totais.'); onDone(); } catch (error) { toast.error(error instanceof ApiError ? error.message : 'Não foi possível corrigir a folha.'); } finally { setSaving(false); } } return <Modal title="Corrigir folha e valores" subtitle={payroll.employee?.name || 'Colaborador'} onClose={onClose}><form onSubmit={save} className="space-y-4"><label className="form-group"><span>Valor</span><select value={field} onChange={(event) => { setField(event.target.value); setValue(String((payroll as unknown as Record<string, unknown>)[event.target.value] ?? 0)); }} className="form-control">{[['baseSalary', 'Salário base'], ['grossSalary', 'Salário bruto'], ['netSalary', 'Valor líquido a pagar'], ['inssAmount', 'INSS'], ['irrfAmount', 'IRRF'], ['fgtsAmount', 'FGTS'], ['overtimeAmount', 'Horas extras'], ['nightShiftAmount', 'Adicional noturno']].map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="form-group"><span>Novo valor</span><input className="form-control" type="number" min="0" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} required /></label><label className="form-group"><span>Motivo da correção</span><textarea className="form-control min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Informe a origem da correção." required /></label><ModalActions saving={saving} onClose={onClose} /></form></Modal>; }

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) {
  return <SharedModal isOpen title={title} description={subtitle} onClose={onClose}><div className="max-h-[70dvh] overflow-y-auto">{children}</div></SharedModal>;
}
function ModalActions({ saving, onClose }: { saving: boolean; onClose: () => void }) { return <div className="flex justify-end gap-2 border-t border-border pt-4"><Button type="button" onClick={onClose} disabled={saving} variant="outline">Cancelar</Button><Button type="submit" isLoading={saving}>{saving ? 'Salvando...' : <><CheckCircle2 size={14} /> Salvar correção</>}</Button></div>; }
