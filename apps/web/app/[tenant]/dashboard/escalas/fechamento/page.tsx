'use client';

import React, { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { LoadingState, ErrorState, SolidCard } from '@/app/components/platform-ui';
import { FileCheck2, AlertTriangle, Search } from 'lucide-react';

export default function FechamentoPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'time_tracking.view_all');
  
  const { data: companyData } = useQuery(() => api.companies.me(), []);

  // Proteção: apenas quem tem permissão para gerenciar a folha toda
  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-rose-200">
        <AlertTriangle className="text-rose-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-500 mt-2">Apenas administradores e RH têm acesso ao fechamento de folha.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="page-header">
        <h1 className="page-title">Fechamento Mensal</h1>
        <p className="page-subtitle">Jornada, proventos, tributos, encargos e líquido por colaborador.</p>
      </div>
      
      <ClosingTab company={companyData} canManage={canManage} />
    </div>
  );
}

function ClosingTab({ canManage, company }: { canManage: boolean; company?: any }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState<string | null>(null);
  
  const listQuery = useQuery(() => api.timeClosing.list(), []);
  const refresh = () => listQuery.refetch();
  
  const generateMut = useMutation((value: { month: number; year: number }) => api.timeClosing.generate({ month: value.month, year: value.year }), { onSuccess: refresh });
  const reviewMut = useMutation((id: string) => api.timeClosing.submitReview(id), { onSuccess: refresh });
  const approveMut = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: refresh });
  const closeMut = useMutation((id: string) => api.timeClosing.close(id), { onSuccess: refresh });
  const reopenMut = useMutation((value: { id: string; reason: string }) => api.timeClosing.reopen(value.id, value.reason), { onSuccess: refresh });
  const deleteMut = useMutation((id: string) => api.timeClosing.delete(id), { onSuccess: refresh });
  
  const closings = (listQuery.data as any[] | undefined) ?? [];
  const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const period = (item: any) => `${new Date(item.periodStart).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(item.periodEnd).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
  const labels: Record<string, string> = { DRAFT: 'Rascunho', IN_REVIEW: 'Em revisão', APPROVED: 'Aprovado', CLOSED: 'Fechado' };
  
  const totals = closings.reduce((acc: any, item: any) => ({
    gross: acc.gross + Number(item.grossPay || 0), inss: acc.inss + Number(item.inssDiscount || 0),
    irrf: acc.irrf + Number(item.irrfDiscount || 0), fgts: acc.fgts + Number(item.fgtsAmount || 0), net: acc.net + Number(item.netPay || 0),
  }), { gross: 0, inss: 0, irrf: 0, fgts: 0, net: 0 });

  const generate = async () => {
    setError(null);
    try { await generateMut.mutate({ month, year }); } catch (err: any) { setError(err?.message ?? 'Erro ao gerar fechamento'); }
  };

  const adjust = async (item: any) => {
    const allowed = ['salaryBase', 'overtime50', 'overtime100', 'nightShift', 'absenceMinutes', 'lateMinutes', 'earlyLeaveMinutes'];
    const field = prompt(`Campo para editar:\n${allowed.join(', ')}`);
    if (!field || !allowed.includes(field)) return;
    const raw = prompt(`Novo valor para ${field}:`, String(item[field] || 0));
    if (raw === null) return;
    const value = Number(raw.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) return alert('Informe um valor não negativo.');
    const reason = prompt('Justificativa obrigatória:');
    if (!reason?.trim()) return;
    try { await api.timeClosing.adjust(item.id, field, value, reason.trim()); await refresh(); } catch (err: any) { setError(err?.message ?? 'Erro ao ajustar'); }
  };

  const printClosing = async (summary: any) => {
    const item = await api.timeClosing.getById(summary.id);
    const { buildPdfShell, infoGrid, section, signatureBlock, printPdf } = require('@/app/lib/pdf-utils');
    const companyInfo = company ? { name: company.name, legalName: company.legalName, document: company.cnpj, logoUrl: company.logoUrl, phone: company.phone, email: company.email } : null;
    const html = buildPdfShell({ title: 'Memória de Cálculo da Folha', subtitle: `${item.employee.name} | ${period(item)}` }, companyInfo, `
      ${section('Jornada', infoGrid([
        { label: 'Normais', value: `${Number(item.normalHours).toFixed(2)}h` }, { label: 'Extras 50%', value: `${Number(item.overtime50).toFixed(2)}h` },
        { label: 'Extras 100%', value: `${Number(item.overtime100).toFixed(2)}h` }, { label: 'Noturnas', value: `${Number(item.nightShift).toFixed(2)}h` },
        { label: 'Atrasos', value: `${item.lateMinutes} min` }, { label: 'Saídas antecipadas', value: `${item.earlyLeaveMinutes} min` },
      ], 3))}
      ${section('Folha', infoGrid([
        { label: 'Salário base', value: money(item.salaryBase) }, { label: `Valor hora / ${item.monthlyDivisor}`, value: money(item.hourlyRate) },
        { label: 'Extras 50%', value: money(item.overtime50Value) }, { label: 'Extras 100%', value: money(item.overtime100Value) },
        { label: 'Adicional noturno', value: money(item.nightShiftValue) }, { label: 'DSR', value: money(item.dsrValue) },
        { label: 'Desconto jornada', value: `-${money(item.absenceDiscount)}` }, { label: 'INSS', value: `-${money(item.inssDiscount)}` },
        { label: 'IRRF', value: `-${money(item.irrfDiscount)}` }, { label: 'FGTS patronal', value: money(item.fgtsAmount) },
        { label: 'Base de Cálculo', value: money(item.grossPay) }, { label: 'Líquido', value: money(item.netPay) },
      ], 3))}
      ${signatureBlock(['RH / Empregador', 'Contabilidade', 'Colaborador'])}
    `);
    printPdf(html, `fechamento-${item.employee.name}-${item.periodStart.slice(0, 7)}.pdf`);
  };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando fechamentos..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} retry={refresh} />;
  
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Base',totals.gross],['INSS',totals.inss],['IRRF',totals.irrf],['FGTS patronal',totals.fgts],['Líquido',totals.net]
        ].map(([label,value]) => (
          <SolidCard key={String(label)} className="p-4 bg-white hover:border-brand/30 transition-colors">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{String(label)}</p>
            <p className={`mt-1 text-lg font-black ${label === 'Líquido' ? 'text-brand' : 'text-slate-900'}`}>{money(value)}</p>
          </SolidCard>
        ))}
      </div>
      
      <SolidCard className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-end">
        <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-slate-500 uppercase">Mês
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="mt-1 block h-10 w-full md:w-40 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all">
              {months.map((name,index)=><option key={name} value={index+1}>{name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500 uppercase">Ano
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="mt-1 block h-10 w-full md:w-28 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all" />
          </label>
          <button onClick={generate} disabled={generateMut.loading} className="btn-nubank h-10 mt-2 md:mt-0 w-full md:w-auto">
            {generateMut.loading ? 'CALCULANDO...' : 'ADICIONAR / RECALCULAR'}
          </button>
        </div>
        {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">{error}</p>}
      </SolidCard>
      
      {closings.length === 0 ? (
        <SolidCard className="p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <FileCheck2 className="text-slate-400" size={32} />
          </div>
          <p className="text-base font-bold text-slate-800">Nenhum fechamento calculado</p>
          <p className="text-sm text-slate-500 mt-1">Selecione o mês e ano acima para gerar a folha</p>
        </SolidCard>
      ) : (
        <SolidCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 text-[10px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Jornada</th>
                  <th className="p-4">Proventos</th>
                  <th className="p-4">Descontos</th>
                  <th className="p-4">FGTS</th>
                  <th className="p-4">Líquido</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closings.map((item:any)=>(
                  <tr key={item.id} className="align-top hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-sm">{item.employee?.name}</span>
                        <span className="text-slate-500 text-[11px] font-medium mt-0.5">{period(item)}</span>
                        <span className="text-slate-600 font-medium mt-1">Base {money(item.salaryBase)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-medium space-y-1">
                      <p>50% <span className="text-slate-900 font-semibold">{Number(item.overtime50).toFixed(2)}h</span></p>
                      <p>100% <span className="text-slate-900 font-semibold">{Number(item.overtime100).toFixed(2)}h</span></p>
                      <p>Noturno <span className="text-slate-900 font-semibold">{Number(item.nightShift).toFixed(2)}h</span></p>
                      <p className="text-rose-600">Débito <span className="font-bold">{item.absenceMinutes} min</span></p>
                    </td>
                    <td className="p-4 text-slate-600 font-medium space-y-1">
                      <p>Extras <span className="text-slate-900 font-semibold">{money(Number(item.overtime50Value)+Number(item.overtime100Value))}</span></p>
                      <p>Noturno <span className="text-slate-900 font-semibold">{money(item.nightShiftValue)}</span></p>
                      <p>DSR <span className="text-slate-900 font-semibold">{money(item.dsrValue)}</span></p>
                      <p className="text-slate-900 pt-1">Base Cálc. <span className="font-bold">{money(item.grossPay)}</span></p>
                    </td>
                    <td className="p-4 text-rose-700 font-medium space-y-1">
                      <p>Jornada {money(item.absenceDiscount)}</p>
                      <p>INSS {money(item.inssDiscount)}</p>
                      <p>IRRF {money(item.irrfDiscount)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{money(item.fgtsAmount)}</p>
                      <p className="text-slate-400 text-[10px] uppercase font-bold mt-0.5 tracking-wider">não descontado</p>
                    </td>
                    <td className="p-4">
                      <span className="text-base font-black text-brand">{money(item.netPay)}</span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center rounded border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider
                        ${item.status === 'DRAFT' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          item.status === 'IN_REVIEW' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                          item.status === 'APPROVED' ? 'bg-brand/10 text-brand border-brand/20' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                      >
                        {labels[item.status] || item.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 w-24">
                        <button onClick={()=>printClosing(item)} className="btn-outline h-7 px-2 text-[10px]">Gerar PDF</button>
                        {['DRAFT','IN_REVIEW'].includes(item.status) && <button onClick={()=>adjust(item)} className="btn-outline h-7 px-2 text-[10px] bg-slate-50 text-slate-600">Editar Valores</button>}
                        {item.status==='DRAFT' && <button onClick={()=>reviewMut.mutate(item.id)} className="h-7 rounded bg-sky-600 hover:bg-sky-700 transition-colors px-2 text-white font-bold text-[10px]">Enviar P/ Revisão</button>}
                        {item.status==='IN_REVIEW' && <button onClick={()=>approveMut.mutate(item.id)} className="h-7 rounded bg-brand hover:bg-[#72049e] transition-colors px-2 text-white font-bold text-[10px]">Aprovar Mês</button>}
                        {item.status==='APPROVED' && <button onClick={()=>closeMut.mutate(item.id)} className="h-7 rounded bg-emerald-600 hover:bg-emerald-700 transition-colors px-2 text-white font-bold text-[10px]">Finalizar Folha</button>}
                        {item.status==='CLOSED' && <button onClick={()=>{const reason=prompt('Motivo da reabertura:');if(reason?.trim())reopenMut.mutate({id:item.id,reason});}} className="h-7 rounded bg-amber-500 hover:bg-amber-600 transition-colors px-2 text-white font-bold text-[10px]">Reabrir Mês</button>}
                        {item.status!=='CLOSED' && <button onClick={()=>window.confirm('Excluir definitivamente este fechamento?')&&deleteMut.mutate(item.id)} className="h-7 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors px-2 font-bold text-[10px]">Excluir</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SolidCard>
      )}
    </div>
  );
}
