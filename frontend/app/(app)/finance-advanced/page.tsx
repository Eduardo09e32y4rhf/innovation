'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Upload, TrendingUp, DollarSign, PieChart, FileText, Plus, Building2, BarChart } from 'lucide-react';
import api from '@/services/api';

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
        const res = await api.post('/api/finance/v2/payroll-cost', { employees }).then(r => r.data).catch(() => null);
        setPayroll(res);
        setLoading(false);
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

    const COLORS = ['purple', 'blue', 'green', 'orange', 'red', 'yellow'];

    return (
        <div className="min-h-screen bg-gray-950 text-white flex">
            <Sidebar />
            <main className="ml-[280px] flex-1 p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold gradient-text">Financeiro Avançado</h1>
                    <p className="text-gray-400 mt-1">Centros de Custo, Folha Real, Importação OFX e Cofre Digital</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 flex-wrap">
                    {(['costs', 'payroll', 'ofx', 'vault'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}>
                            {tab === 'costs' ? '📊 Centros de Custo' : tab === 'payroll' ? '💼 Custo Real da Folha' : tab === 'ofx' ? '🏦 Importar OFX' : '🗄 Cofre Digital'}
                        </button>
                    ))}
                </div>

                {/* COST CENTERS */}
                {activeTab === 'costs' && (
                    <div>
                        {costCenters ? (
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
                                        <p className="text-gray-400 text-sm">Gasto Total</p>
                                        <p className="text-2xl font-bold text-white">R$ {Number(costCenters.total_spend).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {costCenters.cost_centers?.map((c: any, i: number) => (
                                        <div key={c.category} className="bg-gray-900 border border-purple-500/20 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-white font-medium">{c.category}</span>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-gray-400 text-sm">{c.count} transações</span>
                                                    <span className="text-purple-400 font-bold">{c.percentage}%</span>
                                                    <span className="text-white font-bold">R$ {Number(c.total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                            <div className="bg-gray-800 rounded-full h-2">
                                                <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${c.percentage}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <PieChart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p>Nenhuma transação categorizada ainda</p>
                            </div>
                        )}
                    </div>
                )}

                {/* PAYROLL */}
                {activeTab === 'payroll' && (
                    <div>
                        <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-6 mb-6">
                            <h3 className="font-semibold text-white mb-4">Calculadora de Custo Real</h3>
                            <div className="space-y-3 mb-4">
                                {employees.map((emp, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-2">
                                        <input value={emp.employee_name} onChange={e => updateEmployee(i, 'employee_name', e.target.value)}
                                            placeholder="Nome" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                        <input type="number" value={emp.gross_salary} onChange={e => updateEmployee(i, 'gross_salary', Number(e.target.value))}
                                            placeholder="Salário Bruto" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                        <input type="number" value={emp.benefits} onChange={e => updateEmployee(i, 'benefits', Number(e.target.value))}
                                            placeholder="Benefícios (VR+VT+PS)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                        <input type="number" value={emp.equipment_cost} onChange={e => updateEmployee(i, 'equipment_cost', Number(e.target.value))}
                                            placeholder="Equipamentos" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={addEmployee} className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Funcionário
                                </button>
                                <button onClick={calcPayroll} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition">
                                    {loading ? 'Calculando...' : 'Calcular Custo Real'}
                                </button>
                            </div>
                        </div>

                        {payroll && (
                            <div className="bg-gray-900 border border-green-500/30 rounded-xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                    <h3 className="font-semibold text-white">Resultado</h3>
                                    <span className="ml-auto text-2xl font-black text-green-400">
                                        R$ {Number(payroll.total_payroll_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {payroll.breakdown?.map((emp: any) => (
                                        <div key={emp.employee} className="bg-gray-800 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-white font-medium">{emp.employee}</span>
                                                <span className="text-green-400 font-bold text-sm">
                                                    R$ {Number(emp.total_real_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    <span className="text-gray-500 font-normal ml-1">({emp.overhead_factor}x salário)</span>
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2 text-xs text-gray-400">
                                                <div>Salário: <span className="text-white">R$ {emp.gross_salary.toLocaleString('pt-BR')}</span></div>
                                                <div>INSS: <span className="text-red-400">R$ {Number(emp.inss_patronal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                                <div>FGTS: <span className="text-orange-400">R$ {Number(emp.fgts).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                                                <div>Benefícios: <span className="text-blue-400">R$ {emp.benefits.toLocaleString('pt-BR')}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* OFX IMPORT */}
                {activeTab === 'ofx' && (
                    <div className="max-w-md mx-auto">
                        <div className="bg-gray-900 border border-purple-500/20 rounded-xl p-8 text-center">
                            <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">Importar Extrato OFX</h3>
                            <p className="text-gray-400 text-sm mb-6">Importe o extrato do banco em formato .OFX para conciliar suas transações automaticamente</p>
                            <label className="bg-purple-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-purple-700 transition inline-flex items-center gap-2">
                                <Upload className="w-4 h-4" /> Selecionar arquivo .OFX
                                <input type="file" accept=".ofx,.OFX" onChange={importOFX} className="hidden" />
                            </label>
                        </div>
                        {ofxResult && (
                            <div className={`mt-4 p-4 rounded-xl border ${ofxResult.error ? 'border-red-500/30 bg-red-500/10' : 'border-green-500/30 bg-green-500/10'}`}>
                                {ofxResult.error
                                    ? <p className="text-red-400">{ofxResult.error}</p>
                                    : <p className="text-green-400">✓ {ofxResult.imported} transações importadas com sucesso!</p>
                                }
                            </div>
                        )}
                    </div>
                )}

                {/* VAULT */}
                {activeTab === 'vault' && (
                    <div>
                        <div className="space-y-3">
                            {vouchers.map(v => (
                                <div key={v.id} className="bg-gray-900 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-purple-400" />
                                        <div>
                                            <p className="text-white text-sm">{v.description}</p>
                                            <p className="text-gray-400 text-xs">R$ {Number(v.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {vouchers.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum comprovante armazenado</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
