'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Upload, TrendingUp, DollarSign, PieChart, FileText, Plus, Building2, BarChart, ChevronRight, X, Loader2, ShieldCheck, Landmark } from 'lucide-react';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function FinanceAdvancedPage() {
    const [costCenters, setCostCenters] = useState<any>(null);
    const [payroll, setPayroll] = useState<any>(null);
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'costs' | 'payroll' | 'ofx' | 'vault'>('costs');
    const [loading, setLoading] = useState(false);
    const [ofxResult, setOfxResult] = useState<any>(null);

    // Payroll form
    const [employees, setEmployees] = useState([{ employee_name: '', gross_salary: 0, benefits: 0, equipment_cost: 0 }]);

    const loadData = async () => {
        try {
            const [c, v] = await Promise.all([
                api.get('/api/finance/v2/cost-centers').then(r => r.data).catch(() => null),
                api.get('/api/finance/v2/vouchers').then(r => r.data).catch(() => []),
            ]);
            setCostCenters(c);
            setVouchers(Array.isArray(v) ? v : []);
        } catch { }
    };

    useEffect(() => { loadData(); }, []);

    const calcPayroll = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/finance/v2/payroll-cost', { employees }).then(r => r.data);
            setPayroll(res);
        } catch (e) { }
        finally { setLoading(false); }
    };

    const importOFX = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        const res = await api.post('/api/finance/v2/import-ofx', form, { headers: { 'Content-Type': 'multipart/form-data' } })
            .then(r => r.data).catch(err => ({ error: err.response?.data?.detail || 'Erro ao importar' }));
        setOfxResult(res);
        if (!res.error) loadData();
    };

    const addEmployee = () => setEmployees(prev => [...prev, { employee_name: '', gross_salary: 0, benefits: 0, equipment_cost: 0 }]);
    const updateEmployee = (i: number, field: string, value: any) => {
        setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
    };

    return (
        <AppLayout title="Inteligência Financeira">
            <div className="p-8 space-y-10 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Financeiro <span className="text-indigo-600">Pro</span></h1>
                        <p className="text-slate-9000 font-medium tracking-tight">Centros de custo, folha real e conciliação bancária via OFX.</p>
                    </div>
                </div>

                {/* Tabs Multi-Select */}
                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 p-2 rounded-[2.2rem] shadow-sm flex flex-wrap gap-2">
                    {[
                        { id: 'costs', label: 'Centros de Custo', icon: PieChart },
                        { id: 'payroll', label: 'Custo da Folha', icon: Building2 },
                        { id: 'ofx', label: 'Importação OFX', icon: Landmark },
                        { id: 'vault', label: 'Cofre Digital', icon: ShieldCheck }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-10 shadow-sm min-h-[500px]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'costs' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="costs">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                        <PieChart size={24} className="text-indigo-600" /> Distribuição de Custos
                                    </h2>
                                    {costCenters && (
                                        <div className="bg-emerald-50 text-emerald-600 px-6 py-2 rounded-2xl border-emerald-100 font-black text-xs">
                                            Total: R$ {Number(costCenters.total_spend).toLocaleString('pt-BR')}
                                        </div>
                                    )}
                                </div>

                                {costCenters ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            {costCenters.cost_centers?.map((c: any, i: number) => (
                                                <div key={c.category} className="group p-5 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{c.category}</span>
                                                        <span className="text-xs font-black text-indigo-600">R$ {Number(c.total).toLocaleString('pt-BR')}</span>
                                                    </div>
                                                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${c.percentage}%` }} />
                                                    </div>
                                                    <div className="flex justify-between mt-2">
                                                        <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{c.count} lançamentos</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.percentage}% do total</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-center p-10 bg-slate-50 rounded-[2rem] border-dashed border-slate-200">
                                            <div className="text-center">
                                                <BarChart size={48} className="mx-auto mb-4 text-slate-700" />
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Visualização Neural de Custos</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20 grayscale opacity-40">
                                        <PieChart size={64} className="mx-auto mb-4 text-slate-700" />
                                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Nenhuma métrica financeira processada.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'payroll' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="payroll" className="space-y-10">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                        <Building2 size={24} className="text-indigo-600" /> Simulador de Custo Real (Folha)
                                    </h2>
                                    <button onClick={addEmployee} className="text-[10px] font-black uppercase text-indigo-600 tracking-widest bg-indigo-50 px-4 py-2 rounded-xl border-indigo-100 hover:bg-white border-slate-200 border-black/5 shadow-sm transition-all">Adicionar Talento</button>
                                </div>

                                <div className="space-y-4">
                                    {employees.map((emp, i) => (
                                        <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-6 rounded-3xl border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Colaborador</label>
                                                <input value={emp.employee_name} onChange={e => updateEmployee(i, 'employee_name', e.target.value)} placeholder="Nome" className="w-full bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-indigo-50 outline-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Salário Bruto</label>
                                                <input type="number" value={emp.gross_salary} onChange={e => updateEmployee(i, 'gross_salary', Number(e.target.value))} placeholder="R$ 0,00" className="w-full bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-indigo-50 outline-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Benefícios</label>
                                                <input type="number" value={emp.benefits} onChange={e => updateEmployee(i, 'benefits', Number(e.target.value))} placeholder="R$ 0,00" className="w-full bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-indigo-50 outline-none" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Equipamentos</label>
                                                <input type="number" value={emp.equipment_cost} onChange={e => updateEmployee(i, 'equipment_cost', Number(e.target.value))} placeholder="R$ 0,00" className="w-full bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-indigo-50 outline-none" />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button onClick={calcPayroll} disabled={loading} className="w-full bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all">
                                    {loading ? 'Calculando Matriz de Custos...' : 'Processar Custo Real'}
                                </button>

                                {payroll && (
                                    <div className="pt-10 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-8">
                                            <h3 className="text-lg font-black text-slate-900 uppercase">Resultado da Projeção</h3>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Total da Folha</p>
                                                <p className="text-3xl font-black text-emerald-600 tracking-tighter">R$ {Number(payroll.total_payroll_cost).toLocaleString('pt-BR')}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {payroll.breakdown?.map((emp: any) => (
                                                <div key={emp.employee} className="bg-slate-50 border-slate-100 p-6 rounded-3xl group transition-all hover:bg-white border-slate-200 border-black/5 shadow-sm hover:border-indigo-100 hover:shadow-lg">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <span className="text-sm font-black text-slate-900 uppercase tracking-tighter">{emp.employee}</span>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fator Overhead: <span className="text-indigo-600">{emp.overhead_factor}x</span></span>
                                                    </div>
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Custo Real</p>
                                                            <p className="text-sm font-black text-emerald-600">R$ {Number(emp.total_real_cost).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">INSS Patronal</p>
                                                            <p className="text-sm font-black text-rose-500">R$ {Number(emp.inss_patronal).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">FGTS</p>
                                                            <p className="text-sm font-black text-amber-500">R$ {Number(emp.fgts).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                            <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Provisões</p>

                                                            <p className="text-sm font-black text-indigo-600">R$ {Number(emp.total_real_cost - emp.gross_salary - emp.inss_patronal - emp.fgts).toLocaleString('pt-BR')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'ofx' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="ofx" className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-600 mb-8 shadow-inner">
                                    <Upload size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Sincronização Bancária (OFX)</h3>
                                <p className="text-slate-400 text-sm max-w-md mx-auto mb-10 leading-relaxed font-medium">Importe seus arquivos OFX para conciliação automática via inteligência cognitiva. O sistema processa cada transação e as aloca em centros de custo automaticamente.</p>

                                <label className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:scale-[1.02] cursor-pointer transition-all inline-flex items-center gap-3">
                                    <Landmark size={20} /> Selecionar Arquivo OFX
                                    <input type="file" accept=".ofx,.OFX" onChange={importOFX} className="hidden" />
                                </label>

                                {ofxResult && (
                                    <div className={`mt-10 p-5 rounded-2xl border animate-in slide-in-from-top-4 duration-500 ${ofxResult.error ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                        <p className="text-xs font-black uppercase tracking-widest">{ofxResult.error || `Sincronização concluída: ${ofxResult.imported} transações importadas.`}</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'vault' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="vault">
                                <div className="flex items-center justify-between mb-10">
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                                        <ShieldCheck size={24} className="text-indigo-600" /> Cofre Digital
                                    </h2>
                                    <button className="bg-slate-50 text-slate-900 px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Upload Seguro</button>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {vouchers.map(v => (
                                        <div key={v.id} className="flex items-center justify-between p-6 bg-slate-50 border-slate-100 rounded-3xl hover:bg-white border-slate-200 border-black/5 shadow-sm hover:shadow-lg hover:border-indigo-100 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{v.description}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {v.id} • PDF / Comprovante</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <p className="text-sm font-black text-slate-900">R$ {Number(v.amount).toLocaleString('pt-BR')}</p>
                                                <button className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm">

                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {vouchers.length === 0 && (
                                        <div className="text-center py-20 grayscale opacity-40">
                                            <FileText size={64} className="mx-auto mb-4 text-slate-700" />
                                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Cofre digital vazio.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </AppLayout>
    );
}
