'use client';

import AppLayout from '../../components/AppLayout';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Users, Briefcase } from 'lucide-react';

interface AnalyticsData {
    summary: {
        revenue: number;
        profit: number;
        expenses: number;
        active_jobs: number;
        candidates: number;
    };
    chart_data: Array<{
        name: string;
        revenue: number;
        expenses: number;
        profit: number;
    }>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/analytics');
                setData(res.data);
            } catch (err) {
                console.error(err);
                setError('Falha ao carregar dados analíticos.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <AppLayout title="Analytics & BI">
                <div className="flex h-full items-center justify-center text-gray-400">
                    Carregando dados...
                </div>
            </AppLayout>
        );
    }

    if (error || !data) {
        return (
            <AppLayout title="Analytics & BI">
                <div className="flex h-full items-center justify-center text-red-400">
                    {error || 'Nenhum dado disponível'}
                </div>
            </AppLayout>
        );
    }

    const { summary, chart_data } = data;

    return (
        <AppLayout title="Analytics & BI">
            <div className="flex flex-col h-full bg-[#050508] text-white overflow-y-auto">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Business Intelligence
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Visão estratégica em tempo real (Nativo)
                    </p>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Cards de Resumo */}
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Receita Total</span>
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            R$ {summary.revenue.toLocaleString('pt-BR')}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Lucro Líquido</span>
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            R$ {summary.profit.toLocaleString('pt-BR')}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Vagas Ativas</span>
                            <Briefcase className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {summary.active_jobs}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-400 text-sm">Candidatos</span>
                            <Users className="w-5 h-5 text-orange-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {summary.candidates}
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
                    {/* Gráfico de Área - Evolução Financeira */}
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Evolução Financeira</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chart_data}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" name="Receita" />
                                    <Area type="monotone" dataKey="profit" stroke="#82ca9d" fillOpacity={1} fill="url(#colorProfit)" name="Lucro" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico de Barras - Comparativo */}
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Receita vs Despesas</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chart_data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="revenue" fill="#3B82F6" name="Receita" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expenses" fill="#EF4444" name="Despesas" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
