'use client';

import { Sidebar } from '../../components/Sidebar';
import { BadgeDollarSign, TrendingUp, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';

export default function FinancePage() {
    return (
        <div className="flex h-screen bg-[#0a0a0f] text-white">
            <Sidebar />

            <main className="flex-1 ml-[280px] p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600">
                            Gestão Financeira
                        </h1>
                        <p className="text-zinc-400 mt-1">Fluxo de caixa e assinaturas enterprise</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm border border-zinc-700 transition">
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
                        { title: "Receita Total", value: "R$ 1.2M", change: "+12.5%", icon: BadgeDollarSign, color: "text-green-400" },
                        { title: "Custos Operacionais", value: "R$ 450k", change: "-2.4%", icon: Wallet, color: "text-red-400" },
                        { title: "Lucro Líquido", value: "R$ 750k", change: "+18.2%", icon: TrendingUp, color: "text-emerald-400" },
                        { title: "Assinaturas Ativas", value: "1,240", change: "+54 recém-chegados", icon: CreditCard, color: "text-purple-400" },
                    ].map((kpi, i) => (
                        <div key={i} className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <kpi.icon className={`w-16 h-16 ${kpi.color}`} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-zinc-400 text-sm font-medium mb-1">{kpi.title}</p>
                                <h3 className="text-2xl font-bold text-white mb-2">{kpi.value}</h3>
                                <span className={`text-xs px-2 py-1 rounded-full bg-white/5 ${kpi.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                                    {kpi.change}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts & Transaction Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Chart Area */}
                    <div className="lg:col-span-2 glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-6">Fluxo de Caixa (Real-Time)</h3>
                        <div className="h-[300px] flex items-end justify-between gap-2 px-2">
                            {[65, 59, 80, 81, 56, 55, 40, 70, 75, 60, 90, 85].map((h, i) => (
                                <div key={i} className="w-full bg-zinc-800 rounded-t-sm hover:bg-zinc-700 transition-all relative group h-full flex flex-col justify-end">
                                    <div
                                        style={{ height: `${h}%` }}
                                        className={`w-full rounded-t-sm transition-all duration-500 ${i % 2 === 0 ? 'bg-green-500/80' : 'bg-emerald-600/80'} group-hover:bg-green-400`}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-zinc-500 mt-4 px-2">
                            <span>Jan</span><span>fev</span><span>mar</span><span>abr</span><span>mai</span><span>jun</span>
                            <span>jul</span><span>ago</span><span>set</span><span>out</span><span>nov</span><span>dez</span>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    <div className="glass-panel rounded-2xl p-6">
                        <h3 className="text-lg font-semibold mb-4">Transações Recentes</h3>
                        <div className="space-y-4">
                            {[
                                { name: "Licença Enterprise", desc: "Tech Corp Ltda", value: "+ R$ 12.000", type: "in" },
                                { name: "Servidores AWS", desc: "Infraestrutura", value: "- R$ 850,00", type: "out" },
                                { name: "Consultoria IA", desc: "Banco Digital", value: "+ R$ 45.000", type: "in" },
                                { name: "Marketing Q3", desc: "Google Ads", value: "- R$ 3.200", type: "out" },
                                { name: "Plano Pro", desc: "Startup X", value: "+ R$ 299,00", type: "in" },
                            ].map((tx, i) => (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {tx.type === 'in' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{tx.name}</p>
                                            <p className="text-xs text-zinc-500">{tx.desc}</p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold ${tx.type === 'in' ? 'text-green-400' : 'text-zinc-400'}`}>
                                        {tx.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 text-sm hover:border-zinc-500 hover:text-white transition">
                            Ver todas as transações
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
