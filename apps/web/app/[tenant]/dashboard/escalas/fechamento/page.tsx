'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useQuery, useMutation } from '@/app/hooks/use-data';
import { api } from '@/app/lib/api';
import { hasPermission } from '@/app/lib/permissions';
import { LoadingState, ErrorState, SolidCard } from '@/app/components/platform-ui';
import { FileCheck2, AlertTriangle, Search, X, Download } from 'lucide-react';

// Modal de Ajuste
function AdjustmentModal({ item, onClose, onSave, error }: any) {
  const [field, setField] = useState('salaryBase');
  const [value, setValue] = useState(String(item[field] || 0));
  const [reason, setReason] = useState('');

  const fields = [
    { value: 'salaryBase', label: 'Salário Base (R$)' },
    { value: 'overtime50', label: 'Hora Extra 50% (Horas)' },
    { value: 'overtime100', label: 'Hora Extra 100% (Horas)' },
    { value: 'nightShift', label: 'Adicional Noturno (Horas)' },
    { value: 'absenceMinutes', label: 'Desconto de Faltas (Minutos)' },
    { value: 'lateMinutes', label: 'Atrasos (Minutos)' },
    { value: 'earlyLeaveMinutes', label: 'Saídas Antecipadas (Minutos)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-black text-slate-800 uppercase tracking-wide">Ajuste Manual</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold">{error}</div>}
          
          <div className="flex items-center gap-3 p-3 bg-brand/5 border border-brand/10 rounded-xl">
             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white text-sm font-black shadow-sm bg-gradient-to-br from-brand to-[#5e0382]">
               {item.employee.name.charAt(0).toUpperCase()}
             </div>
             <div>
               <p className="font-black text-sm text-slate-900 leading-tight">{item.employee.name.toUpperCase()}</p>
               <p className="text-[10px] font-bold text-brand mt-0.5 tracking-wider uppercase">Folha do Colaborador</p>
             </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Campo para Ajustar</label>
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setValue(String(item[e.target.value] || 0));
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all"
            >
              {fields.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Novo Valor</label>
            <input
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Justificativa (Obrigatório)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all resize-none h-20"
              placeholder="Descreva o motivo deste ajuste..."
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 text-sm transition-colors">CANCELAR</button>
          <button onClick={() => onSave(field, value, reason)} disabled={!reason.trim()} className="btn-nubank px-6 disabled:opacity-50 disabled:cursor-not-allowed">SALVAR AJUSTE</button>
        </div>
      </div>
    </div>
  );
}

export default function FechamentoPage() {
  const { user } = useAuth();
  const canManage = hasPermission(user, 'time_tracking.view_all');
  
  const { data: companyData } = useQuery(() => api.companies.me(), []);

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
  // Configuração padrão de período (Ex: 01 ao fim do mês)
  const now = new Date();
  const defStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [periodStart, setPeriodStart] = useState(defStart.toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(defEnd.toISOString().split('T')[0]);
  
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const [adjustItem, setAdjustItem] = useState<any>(null);
  
  const listQuery = useQuery(() => api.timeClosing.list(), []);
  const refresh = () => listQuery.refetch();
  
  const generateMut = useMutation((value: { periodStart: string; periodEnd: string; month: number; year: number }) => 
    api.timeClosing.generate({ 
      periodStart: value.periodStart, 
      periodEnd: value.periodEnd, 
      month: new Date(value.periodStart).getMonth() + 1, 
      year: new Date(value.periodStart).getFullYear() 
    }), { onSuccess: refresh }
  );
  
  const reviewMut = useMutation((id: string) => api.timeClosing.submitReview(id), { onSuccess: refresh });
  const approveMut = useMutation((id: string) => api.timeClosing.approve(id), { onSuccess: refresh });
  const closeMut = useMutation((id: string) => api.timeClosing.close(id), { onSuccess: refresh });
  const reopenMut = useMutation((value: { id: string; reason: string }) => api.timeClosing.reopen(value.id, value.reason), { onSuccess: refresh });
  const deleteMut = useMutation((id: string) => api.timeClosing.delete(id), { onSuccess: refresh });
  
  const allClosings = (listQuery.data as any[] | undefined) ?? [];
  
  // Filtragem para remover duplicações e mostrar apenas do período selecionado
  const closings = useMemo(() => {
    return allClosings.filter(item => {
      const itemStart = new Date(item.periodStart).toISOString().split('T')[0];
      const itemEnd = new Date(item.periodEnd).toISOString().split('T')[0];
      return itemStart >= periodStart && itemEnd <= periodEnd;
    });
  }, [allClosings, periodStart, periodEnd]);

  const money = (value: unknown) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const period = (item: any) => `${new Date(item.periodStart).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} a ${new Date(item.periodEnd).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`;
  
  const totals = closings.reduce((acc: any, item: any) => ({
    gross: acc.gross + Number(item.grossPay || 0), inss: acc.inss + Number(item.inssDiscount || 0),
    irrf: acc.irrf + Number(item.irrfDiscount || 0), fgts: acc.fgts + Number(item.fgtsAmount || 0), net: acc.net + Number(item.netPay || 0),
  }), { gross: 0, inss: 0, irrf: 0, fgts: 0, net: 0 });

  const generate = async () => {
    setError(null);
    try {
      const month = new Date(periodStart).getMonth() + 1;
      const year = new Date(periodStart).getFullYear();
      await generateMut.mutate({ periodStart, periodEnd, month, year }); 
    } catch (err: any) { 
      setError(err?.message ?? 'Erro ao gerar fechamento'); 
    }
  };

  const handleSaveAdjust = async (field: string, raw: string, reason: string) => {
    if (!adjustItem) return;
    const value = Number(raw.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) {
      setError('Informe um valor não negativo e válido.');
      return;
    }
    setError(null);
    try { 
      await api.timeClosing.adjust(adjustItem.id, field, value, reason.trim()); 
      await refresh(); 
      setAdjustItem(null);
    } catch (err: any) { 
      setError(err?.message ?? 'Erro ao salvar ajuste'); 
    }
  };

  const downloadPdf = async (item: any) => {
    try {
      setIsDownloading(item.id);
      await api.documents.downloadIndividual(item.id);
    } catch (err: any) {
      alert(err?.message || 'Erro ao gerar PDF. Verifique a conexão com o servidor.');
    } finally {
      setIsDownloading(null);
    }
  };

  if (listQuery.loading && !listQuery.data) return <LoadingState label="Carregando fechamentos..." />;
  if (listQuery.error && !listQuery.data) return <ErrorState message={listQuery.error} retry={refresh} />;
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Base',totals.gross],['INSS',totals.inss],['IRRF',totals.irrf],['FGTS patronal',totals.fgts],['Líquido',totals.net]
        ].map(([label,value]) => (
          <SolidCard key={String(label)} className="p-4 bg-white hover:border-brand/30 transition-colors group relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand/10 group-hover:bg-brand transition-colors rounded-l-2xl" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-2">{String(label)}</p>
            <p className={`mt-1 text-lg font-black ml-2 ${label === 'Líquido' ? 'text-brand' : 'text-slate-900'}`}>{money(value)}</p>
          </SolidCard>
        ))}
      </div>
      
      <SolidCard className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-end">
        <div className="flex flex-wrap items-end gap-3 w-full md:w-auto">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data Início
            <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="mt-1.5 block h-10 w-full md:w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all" />
          </label>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data Fim
            <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="mt-1.5 block h-10 w-full md:w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all" />
          </label>
          <button onClick={generate} disabled={generateMut.loading} className="btn-nubank h-10 mt-2 md:mt-0 w-full md:w-auto font-bold tracking-wider text-[11px] hover:scale-105 transition-transform">
            {generateMut.loading ? 'CALCULANDO...' : 'ADICIONAR / RECALCULAR'}
          </button>
        </div>
        {error && !adjustItem && <p className="text-[11px] font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">{error}</p>}
      </SolidCard>
      
      {closings.length === 0 ? (
        <SolidCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 ring-4 ring-slate-50/50">
            <FileCheck2 className="text-slate-300" size={32} />
          </div>
          <p className="text-lg font-black text-slate-800">Nenhum fechamento encontrado</p>
          <p className="text-sm font-medium text-slate-500 mt-1 max-w-md">Não há dados calculados para o período selecionado de {periodStart.split('-').reverse().join('/')} a {periodEnd.split('-').reverse().join('/')}. Clique em recalcular.</p>
        </SolidCard>
      ) : (
        <SolidCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500 text-[10px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-5 w-[25%]">Colaborador</th>
                  <th className="p-5 w-[15%]">Jornada</th>
                  <th className="p-5 w-[15%]">Proventos</th>
                  <th className="p-5 w-[12%]">Descontos</th>
                  <th className="p-5 w-[12%]">FGTS / Líquido</th>
                  <th className="p-5 w-[8%] text-center">Status</th>
                  <th className="p-5 w-[13%] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closings.map((item:any)=>(
                  <tr key={item.id} className="align-top hover:bg-brand/5 transition-colors group relative">
                    <td className="p-5 relative">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-brand transition-colors" />
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white text-sm font-black shadow-md group-hover:scale-110 transition-transform bg-gradient-to-br from-brand to-[#5e0382] ml-1">
                          {item.employee?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-widest border border-slate-200 group-hover:border-brand/30 group-hover:text-brand transition-colors">
                              {item.employee?.registration ? String(item.employee.registration).padStart(4, '0') : item.employee?.id?.slice(0,8).toUpperCase()}
                            </span>
                            <p className="font-black text-sm text-slate-900 tracking-tight">{item.employee?.name?.toUpperCase()}</p>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.employee?.department || item.employee?.role || 'SEM DEPARTAMENTO/CARGO'}</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-1">{period(item)} | Base: {money(item.salaryBase)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-slate-600 font-medium space-y-1.5">
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">Hora Extra 50%</span><span className="text-slate-900 font-black">{Number(item.overtime50).toFixed(2)}h</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">Hora Extra 100%</span><span className="text-slate-900 font-black">{Number(item.overtime100).toFixed(2)}h</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">Adc. Noturno</span><span className="text-slate-900 font-black">{Number(item.nightShift).toFixed(2)}h</span></div>
                      {item.absenceMinutes > 0 && <div className="flex justify-between items-center mt-2 pt-2 border-t border-rose-100"><span className="text-[10px] uppercase font-bold text-rose-500">Débito (Faltas)</span><span className="text-rose-700 font-black">{item.absenceMinutes} min</span></div>}
                    </td>
                    <td className="p-5 text-slate-600 font-medium space-y-1.5">
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">Extras</span><span className="text-emerald-700 font-black">{money(Number(item.overtime50Value)+Number(item.overtime100Value))}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">Noturno</span><span className="text-emerald-700 font-black">{money(item.nightShiftValue)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">DSR</span><span className="text-emerald-700 font-black">{money(item.dsrValue)}</span></div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100"><span className="text-[10px] uppercase font-bold text-slate-500">Base Cálc.</span><span className="text-slate-900 font-black">{money(item.grossPay)}</span></div>
                    </td>
                    <td className="p-5 text-rose-700 font-medium space-y-1.5">
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">Faltas</span><span className="font-black text-rose-600">{money(item.absenceDiscount)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">INSS</span><span className="font-black text-rose-600">{money(item.inssDiscount)}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] uppercase font-bold text-slate-400">IRRF</span><span className="font-black text-rose-600">{money(item.irrfDiscount)}</span></div>
                    </td>
                    <td className="p-5 flex flex-col gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">FGTS Patronal</span>
                        <p className="font-black text-slate-700">{money(item.fgtsAmount)}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Salário Líquido</span>
                        <span className="text-lg font-black text-brand tracking-tight">{money(item.netPay)}</span>
                      </div>
                    </td>
                    <td className="p-5 text-center align-middle">
                      <span className={`inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider
                        ${item.status === 'DRAFT' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                          item.status === 'IN_REVIEW' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                          item.status === 'APPROVED' ? 'bg-brand/10 text-brand border-brand/20' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                      >
                        {item.status === 'DRAFT' ? 'Rascunho' : item.status === 'IN_REVIEW' ? 'Revisão' : item.status === 'APPROVED' ? 'Aprovado' : 'Fechado'}
                      </span>
                    </td>
                    <td className="p-5 align-middle">
                      <div className="flex flex-col items-end gap-1.5 w-full">
                        <button onClick={(e) => { e.stopPropagation(); downloadPdf(item); }} disabled={!!isDownloading} className="btn-outline flex items-center justify-center gap-2 h-8 w-full text-[10px] border-brand/30 text-brand hover:bg-brand/5 transition-transform hover:scale-105 font-bold tracking-wider disabled:opacity-50">
                          <Download size={14} /> {isDownloading === item.id ? 'Gerando...' : 'Folha PDF'}
                        </button>
                        
                        {['DRAFT','IN_REVIEW'].includes(item.status) && (
                          <button onClick={()=>setAdjustItem(item)} className="btn-outline h-8 w-full text-[10px] bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-bold transition-transform hover:scale-105 tracking-wider">
                            Ajuste Manual
                          </button>
                        )}
                        
                        {item.status==='DRAFT' && <button onClick={()=>reviewMut.mutate(item.id)} className="h-8 w-full rounded-xl bg-sky-600 hover:bg-sky-700 transition-colors px-2 text-white font-bold text-[10px] tracking-wider shadow-sm">Enviar p/ Revisão</button>}
                        {item.status==='IN_REVIEW' && <button onClick={()=>approveMut.mutate(item.id)} className="h-8 w-full rounded-xl bg-brand hover:bg-[#72049e] transition-colors px-2 text-white font-bold text-[10px] tracking-wider shadow-sm">Aprovar Mês</button>}
                        {item.status==='APPROVED' && <button onClick={()=>closeMut.mutate(item.id)} className="h-8 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 transition-colors px-2 text-white font-bold text-[10px] tracking-wider shadow-sm">Finalizar Folha</button>}
                        
                        {item.status==='CLOSED' && (
                          <button onClick={()=>{const reason=prompt('Motivo da reabertura:');if(reason?.trim())reopenMut.mutate({id:item.id,reason});}} className="h-8 w-full rounded-xl bg-amber-500 hover:bg-amber-600 transition-colors px-2 text-white font-bold text-[10px] tracking-wider shadow-sm">
                            Reabrir Mês
                          </button>
                        )}
                        
                        {item.status!=='CLOSED' && (
                          <button onClick={()=>window.confirm('Excluir definitivamente este fechamento?')&&deleteMut.mutate(item.id)} className="h-8 w-full rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors px-2 font-bold text-[10px] mt-1">
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SolidCard>
      )}

      {/* Renders Adjustment Modal */}
      {adjustItem && (
        <AdjustmentModal 
          item={adjustItem} 
          onClose={() => { setAdjustItem(null); setError(null); }} 
          onSave={handleSaveAdjust} 
          error={error} 
        />
      )}
    </div>
  );
}
