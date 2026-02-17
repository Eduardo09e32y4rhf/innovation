'use client';

import { Sidebar } from '../../components/Sidebar';
import { BadgeDollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../services/api';

interface FinanceSummary {
    balance: number;
    total_income: number;
    total_expenses: number;
    pending_income: number;
    pending_expenses: number;
}

interface TaxSummary {
    total_taxes: number;
    breakdown: Record<string, { total: number; pending: number; paid: number }>;
}

export default function FinancePage() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [taxes, setTaxes] = useState<TaxSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryRes, taxesRes] = await Promise.all([
                    api.get('/finance/summary'),
                    api.get('/finance/taxes')
                ]);
                setSummary(summaryRes.data);
                setTaxes(taxesRes.data);
            } catch (error) {
                console.error("Error fetching finance data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />

            <main className="flex-1 ml-[280px] p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                            Gestão Financeira
                        </h1>
                        <p className="text-gray-400 mt-1">Fluxo de caixa e assinaturas enterprise</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 transition">
                            <Download className="w-4 h-4" /> Exportar Relatório
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition shadow-lg shadow-green-900/20">
                            <CreditCard className="w-4 h-4" /> Nova Transação
                        </button>
                    </div>
                </header>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        {
                            title: "Saldo Atual",
                            value: summary ? formatCurrency(summary.balance) : "R$ 0,00",
                            change: "Calculado",
                            icon: BadgeDollarSign,
                            color: "text-green-400"
                        },
                        {
                            title: "Despesas Totais",
                            value: summary ? formatCurrency(summary.total_expenses) : "R$ 0,00",
                            change: "Pago",
                            icon: Wallet,
                            color: "text-red-400"
                        },
                        {
                            title: "A Receber (Pendente)",
                            value: summary ? formatCurrency(summary.pending_income) : "R$ 0,00",
                            change: "Previsto",
                            icon: TrendingUp,
                            color: "text-emerald-400"
                        },
                        {
                            title: "A Pagar (Pendente)",
                            value: summary ? formatCurrency(summary.pending_expenses) : "R$ 0,00",
                            change: "Previsto",
                            icon: CreditCard,
                            color: "text-purple-400"
                        },
                    ].map((kpi, i) => (
                        <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-white/5 bg-white/5">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <kpi.icon className={`w-16 h-16 ${kpi.color}`} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-gray-400 text-sm font-medium mb-1">{kpi.title}</p>
                                <h3 className="text-2xl font-bold text-white mb-2">{loading ? "..." : kpi.value}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400`}>
                                    {kpi.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Tax Breakdown Area */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/5 bg-white/5">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-yellow-500" />
                            Impostos e Tributos (DAS, INSS, FGTS)
                        </h3>

                        {!loading && taxes?.breakdown && Object.keys(taxes.breakdown).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(taxes.breakdown).map(([key, data]) => (
                                    <div key={key} className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-lg text-white">{key}</p>
                                            <p className="text-xs text-gray-400">Total Acumulado</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-white">{formatCurrency(data.total)}</p>
                                            <p className="text-xs text-red-400">Pendente: {formatCurrency(data.pending)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-gray-500">
                                <p>{loading ? "Carregando..." : "Nenhum registro tributário encontrado."}</p>
                            </div>
                        )}
                    </div>

                    {/* Recent Transactions (Placeholder for now, could be real too) */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-white/5">
                        <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
                         <div className="space-y-3">
                            <button className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-xl transition flex items-center justify-center gap-2 font-medium">
                                <CreditCard className="w-4 h-4" /> Pagar Impostos
                            </button>
                            <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center justify-center gap-2 font-medium">
                                <TrendingUp className="w-4 h-4" /> Ver Relatórios Completos
                            </button>
                         </div>

                        <h3 className="text-lg font-semibold mt-8 mb-4">Status Tributário</h3>
                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                            <p className="text-green-400 text-sm font-medium">Sua empresa está em dia!</p>
                            <p className="text-gray-400 text-xs mt-1">Nenhuma pendência crítica encontrada nos últimos 30 dias.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
