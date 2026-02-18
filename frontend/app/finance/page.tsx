'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { BadgeDollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Download, FileText } from 'lucide-react';
import { FinanceService, FinanceSummary, Transaction, TaxSummary } from '../../services/finance';

export default function FinancePage() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [taxes, setTaxes] = useState<TaxSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [summaryData, txData, taxesData] = await Promise.all([
                    FinanceService.getSummary(),
                    FinanceService.getTransactions(10),
                    FinanceService.getTaxes()
                ]);
                setSummary(summaryData);
                setTransactions(txData);
                setTaxes(taxesData);
            } catch (error) {
                console.error("Erro ao carregar dados financeiros:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#0a0a0f] text-white">
                <Sidebar />
                <main className="flex-1 ml-[280px] p-8 flex items-center justify-center">
                    <div className="animate-pulse text-purple-400">Carregando dados financeiros...</div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />

            <main className="flex-1 ml-[280px] p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                            Gestão Financeira
                        </h1>
                        <p className="text-gray-400 mt-1">Fluxo de caixa, impostos e assinaturas enterprise</p>
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
                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <BadgeDollarSign className="w-16 h-16 text-green-400" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium mb-1">Saldo Atual</p>
                            <h3 className="text-2xl font-bold text-white mb-2">{formatCurrency(summary?.balance || 0)}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-green-400">
                                Disponível
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wallet className="w-16 h-16 text-blue-400" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium mb-1">Receita Total</p>
                            <h3 className="text-2xl font-bold text-white mb-2">{formatCurrency(summary?.total_income || 0)}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-blue-400">
                                + Pendente: {formatCurrency(summary?.pending_income || 0)}
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <TrendingUp className="w-16 h-16 text-red-400" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium mb-1">Despesas</p>
                            <h3 className="text-2xl font-bold text-white mb-2">{formatCurrency(summary?.total_expenses || 0)}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-red-400">
                                + A Pagar: {formatCurrency(summary?.pending_expenses || 0)}
                            </span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FileText className="w-16 h-16 text-yellow-400" />
                        </div>
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium mb-1">Impostos (Estimado)</p>
                            <h3 className="text-2xl font-bold text-white mb-2">{formatCurrency(taxes?.total_taxes || 0)}</h3>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-yellow-400">
                                DAS/INSS/FGTS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Charts & Transaction Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Main Chart Area */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-6">Fluxo de Caixa (Real-Time)</h3>
                        <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-900/50 rounded-lg">
                            <p>Gráfico interativo carregando dados do backend...</p>
                            {/* Placeholder for chart implementation */}
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Transações Recentes</h3>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {transactions.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">Nenhuma transação encontrada.</p>
                            ) : (
                                transactions.map((tx, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition border border-transparent hover:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {tx.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium truncate max-w-[150px]" title={tx.description}>{tx.description}</p>
                                                <p className="text-xs text-gray-500 capitalize">{tx.category || tx.tax_type || "Geral"}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-sm font-bold block ${tx.type === 'income' ? 'text-green-400' : 'text-gray-400'}`}>
                                                {tx.type === 'income' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                                            </span>
                                            <span className="text-[10px] text-gray-600 block">
                                                {new Date(tx.due_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-gray-700 text-gray-400 text-sm hover:border-gray-500 hover:text-white transition">
                            Ver todas as transações
                        </button>
                    </div>
                </div>

                {/* Accounting Section */}
                <div className="glass-panel rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Contabilidade & Impostos
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {taxes && Object.entries(taxes.breakdown).map(([key, data]) => (
                            <div key={key} className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="font-bold text-gray-300">{key}</h4>
                                    <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">Mensal</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Total</span>
                                        <span className="text-white">{formatCurrency(data.total)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Pago</span>
                                        <span className="text-green-500">{formatCurrency(data.paid)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Pendente</span>
                                        <span className="text-red-400">{formatCurrency(data.pending)}</span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-800">
                                    <button className="w-full py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs rounded transition">
                                        Gerar Guia
                                    </button>
                                </div>
                            </div>
                         ))}
                         {(!taxes || Object.keys(taxes.breakdown).length === 0) && (
                             <div className="col-span-3 text-center py-8 text-gray-500">
                                 Nenhum registro de impostos encontrado para este período.
                             </div>
                         )}
                    </div>
                </div>

            </main>
        </div>
    );
}
