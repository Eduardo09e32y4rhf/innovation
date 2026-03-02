'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { CreditCard, Wallet, TrendingDown, RefreshCcw, Landmark, ShieldCheck } from 'lucide-react';

interface BankAccount {
    bank: string;
    balance: number;
    currency: string;
    status: string;
}

interface HubData {
    total_balance: number;
    banks: BankAccount[];
    last_update: string;
}

export default function BankHubPage() {
    const [data, setData] = useState<HubData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchHubData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/finance/bank-hub`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error("Failed to fetch hub data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHubData();
    }, []);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    return (
        <AppLayout title="Hub Bancário - Open Finance">
            <div className="min-h-screen bg-gray-950 p-6">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <h1 className="text-4xl font-black text-white mb-2">Hub Bancário</h1>
                            <p className="text-gray-400">Visão consolidada de todas as suas contas através do Open Finance.</p>
                        </div>
                        <button
                            onClick={fetchHubData}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-xl hover:bg-purple-600/30 transition-all"
                        >
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar Agora
                        </button>
                    </div>

                    {/* Total Balance Card */}
                    <div className="relative bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-[2.5rem] p-10 mb-10 overflow-hidden backdrop-blur-3xl shadow-2xl">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div>
                                <span className="text-sm font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4" /> Saldo Consolidado Seguro
                                </span>
                                <div className="text-6xl font-black text-white tracking-tighter">
                                    {loading ? '---' : formatCurrency(data?.total_balance || 0)}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-black/30 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-w-[180px]">
                                    <span className="text-xs text-gray-500 block mb-1">Burn Rate Mensal</span>
                                    <span className="text-xl font-bold text-red-400 flex items-center gap-1">
                                        <TrendingDown className="w-4 h-4" /> R$ 12.500
                                    </span>
                                </div>
                                <div className="bg-black/30 backdrop-blur-md p-6 rounded-3xl border border-white/5 min-w-[180px]">
                                    <span className="text-xs text-gray-500 block mb-1">Runway Estimado</span>
                                    <span className="text-xl font-bold text-green-400">8.5 meses</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bank Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data?.banks.map((bank, idx) => (
                            <div key={idx} className="group bg-gray-900/50 border border-gray-800 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all">
                                        <Landmark className="w-7 h-7 text-gray-400 group-hover:text-purple-400" />
                                    </div>
                                    <span className="bg-green-500/10 text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-green-500/20">
                                        Conectado
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-300 mb-1">{bank.bank}</h3>
                                <div className="text-3xl font-black text-white">
                                    {formatCurrency(bank.balance)}
                                </div>
                                <div className="mt-8 flex justify-between items-center text-xs text-gray-600">
                                    <span>Última sinc. há 5 min</span>
                                    <a href="#" className="text-purple-400 hover:underline">Ver extrato</a>
                                </div>
                            </div>
                        ))}

                        {/* Add New Bank */}
                        <div className="border-2 border-dashed border-gray-800 rounded-3xl p-8 flex flex-col items-center justify-center text-gray-600 hover:border-gray-700 hover:text-gray-500 transition-all cursor-pointer">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-800 flex items-center justify-center mb-4">
                                <Landmark className="w-6 h-6" />
                            </div>
                            <span className="font-bold">Conectar Novo Banco</span>
                            <span className="text-xs">Usa tecnologia Open Finance</span>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <p className="mt-12 text-center text-gray-700 text-[10px] uppercase tracking-[0.2em]">
                        Protegido por criptografia bancária de 256 bits • Innovation Open Connectivity
                    </p>

                </div>
            </div>
        </AppLayout>
    );
}
