'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { BadgeDollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Download, FileText, AlertCircle } from 'lucide-react';
import { FinanceService, FinanceSummary, Transaction, TaxSummary } from '../../services/finance';

export default function FinancePage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'accounting'>('overview');
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [taxes, setTaxes] = useState<TaxSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryData, txData, taxData] = await Promise.all([
                    FinanceService.getSummary(),
                    FinanceService.getTransactions(10),
                    FinanceService.getTaxes()
                ]);
                setSummary(summaryData);
                setTransactions(txData);
                setTaxes(taxData);
            } catch (error) {
                console.error("Erro ao carregar dados financeiros:", error);
                // Fallback / Empty state handled by null checks
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
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
                        <p className="text-gray-400 mt-1">Fluxo de caixa, contabilidade e impostos</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm border border-gray-700 transition">
                            <Download className="w-4 h-4" /> Relatório
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition shadow-lg shadow-green-900/20">
                            <CreditCard className="w-4 h-4" /> Nova Transação
                        </button>
                    </div>
                </header>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-800 mb-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-4 px-2 text-sm font-medium transition relative ${activeTab === 'overview' ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        Visão Geral
                        {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-400 rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('accounting')}
                        className={`pb-4 px-2 text-sm font-medium transition relative ${activeTab === 'accounting' ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
                    >
                        Contabilidade & Impostos
                        {activeTab === 'accounting' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-400 rounded-t-full"></div>}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500 animate-pulse">Carregando dados financeiros...</div>
                ) : (
                    <>
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            {[
                                { title: "Saldo Atual", value: formatCurrency(summary?.balance || 0), change: "Real-time", icon: BadgeDollarSign, color: "text-green-400" },
                                { title: "Receita (Mês)", value: formatCurrency(summary?.total_income || 0), change: `Pendente: ${formatCurrency(summary?.pending_income || 0)}`, icon: TrendingUp, color: "text-emerald-400" },
                                { title: "Despesas (Mês)", value: formatCurrency(summary?.total_expenses || 0), change: `Pendente: ${formatCurrency(summary?.pending_expenses || 0)}`, icon: Wallet, color: "text-red-400" },
                                { title: "Impostos a Pagar", value: formatCurrency(taxes?.total_taxes || 0), change: "Vencendo em breve", icon: FileText, color: "text-yellow-400" },
                            ].map((kpi, i) => (
                                <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group border border-white/5 bg-white/5">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <kpi.icon className={`w-16 h-16 ${kpi.color}`} />
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-gray-400 text-sm font-medium mb-1">{kpi.title}</p>
                                        <h3 className="text-2xl font-bold text-white mb-2">{kpi.value}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full bg-white/5 text-gray-400`}>
                                            {kpi.change}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Recent Transactions */}
                                <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-white/5 bg-white/5">
                                    <h3 className="text-lg font-semibold mb-4">Transações Recentes</h3>
                                    <div className="space-y-4">
                                        {transactions.length === 0 ? (
                                            <p className="text-gray-500 text-sm">Nenhuma transação registrada.</p>
                                        ) : (
                                            transactions.map((tx, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition border-b border-white/5 last:border-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{tx.description}</p>
                                                            <p className="text-xs text-gray-500">{new Date(tx.due_date).toLocaleDateString()} • {tx.category || 'Geral'}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-gray-400'}`}>
                                                        {tx.type === 'expense' ? '-' : '+'} {formatCurrency(tx.amount)}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions / Prediction */}
                                <div className="glass-panel rounded-2xl p-6 border border-white/5 bg-white/5">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-purple-400" /> Previsão IA
                                    </h3>
                                    <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 mb-4">
                                        <p className="text-sm text-purple-200">
                                            "Baseado no seu fluxo, prevemos estabilidade. Atenção aos impostos vencendo dia 20."
                                        </p>
                                    </div>
                                    <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition mb-2">
                                        Ver Análise Completa
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'accounting' && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl border border-white/5 bg-white/5">
                                    <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-yellow-400" /> Impostos (DAS, INSS, FGTS)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {taxes?.breakdown && Object.entries(taxes.breakdown).map(([key, data]) => (
                                            <div key={key} className="p-4 rounded-xl bg-black/40 border border-white/10">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-sm font-bold text-gray-300">{key}</span>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Mensal</span>
                                                </div>
                                                <p className="text-2xl font-bold text-white mb-1">{formatCurrency(data.total)}</p>
                                                <div className="flex justify-between text-xs text-gray-500">
                                                    <span>Pago: {formatCurrency(data.paid)}</span>
                                                    <span className="text-red-400">Pendente: {formatCurrency(data.pending)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!taxes?.breakdown || Object.keys(taxes.breakdown).length === 0) && (
                                            <div className="col-span-3 text-center py-8 text-gray-500">
                                                Nenhum registro de imposto encontrado para este período.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-white/5 bg-white/5">
                                    <h3 className="text-lg font-semibold mb-4 text-white">Lembretes Fiscais</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                            <div>
                                                <p className="text-sm font-medium text-red-200">Vencimento DAS (Simples Nacional)</p>
                                                <p className="text-xs text-red-300/60">Vence todo dia 20</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                                            <div>
                                                <p className="text-sm font-medium text-yellow-200">Fechamento Folha de Pagamento</p>
                                                <p className="text-xs text-yellow-300/60">Enviar dados até dia 05</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
