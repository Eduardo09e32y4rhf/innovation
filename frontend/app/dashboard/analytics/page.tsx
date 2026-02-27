'use client';

import { useEffect, useState } from 'react';
import api from '../../../services/api';
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
import { Loader2, TrendingUp, TrendingDown, DollarSign, Briefcase } from 'lucide-react';
import AppLayout from '../../../components/AppLayout';

interface AnalyticsData {
    summary: {
        total_revenue: number;
        total_expenses: number;
        profit: number;
        active_jobs: number;
        total_candidates: number;
    };
    history: {
        name: string;
        revenue: number;
        expenses: number;
        profit: number;
    }[];
}

const KPICard = ({ title, value, subValue, icon, className }: { title: string; value: string; subValue?: string; icon: React.ReactNode; className?: string }) => {
    return (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${className}`}>
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold mt-1 text-white">{value}</p>
                {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                {icon}
            </div>
        </div>
    );
}

const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Mock data for initial display if API fails or is not ready
                const mockData = {
                    summary: {
                        total_revenue: 150000,
                        total_expenses: 50000,
                        profit: 100000,
                        active_jobs: 12,
                        total_candidates: 340
                    },
                    history: [
                        { name: 'Jan', revenue: 4000, expenses: 2400, profit: 2400 },
                        { name: 'Feb', revenue: 3000, expenses: 1398, profit: 2210 },
                        { name: 'Mar', revenue: 2000, expenses: 9800, profit: 2290 },
                        { name: 'Apr', revenue: 2780, expenses: 3908, profit: 2000 },
                        { name: 'May', revenue: 1890, expenses: 4800, profit: 2181 },
                        { name: 'Jun', revenue: 2390, expenses: 3800, profit: 2500 },
                    ]
                };

                // Attempt to fetch real data
                try {
                   const response = await api.get('/analytics');
                   setData(response.data);
                } catch (e) {
                   console.warn("Using mock data for analytics");
                   setData(mockData);
                }
            } catch (err) {
                console.error('Failed to fetch analytics', err);
                setError('Falha ao carregar dados de analytics.');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);


    if (loading) {
        return (
            <AppLayout title="Analytics & BI">
                <div className="flex h-full items-center justify-center bg-[#050508] text-white">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                </div>
            </AppLayout>
        );
    }

    if (error || !data) {
        return (
            <AppLayout title="Analytics & BI">
                <div className="flex h-full items-center justify-center bg-[#050508] text-white">
                    <p className="text-red-400">{error || 'Nenhum dado disponível'}</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout title="Analytics & BI">
            <div className="flex flex-col h-full bg-[#050508] text-white overflow-y-auto">
                <div className="p-6 border-b border-gray-800">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        Dashboard Financeiro & Operacional
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Visão consolidada de performance</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            title="Receita Total"
                            value={formatCurrency(data.summary.total_revenue)}
                            icon={<TrendingUp className="text-green-400" />}
                            className="border-green-500/20 bg-green-500/5"
                        />
                        <KPICard
                            title="Despesas"
                            value={formatCurrency(data.summary.total_expenses)}
                            icon={<TrendingDown className="text-red-400" />}
                            className="border-red-500/20 bg-red-500/5"
                        />
                        <KPICard
                            title="Lucro Líquido"
                            value={formatCurrency(data.summary.profit)}
                            icon={<DollarSign className="text-blue-400" />}
                            className="border-blue-500/20 bg-blue-500/5"
                        />
                        <KPICard
                            title="Vagas Ativas"
                            value={data.summary.active_jobs.toString()}
                            subValue={`${data.summary.total_candidates} Candidatos`}
                            icon={<Briefcase className="text-purple-400" />}
                            className="border-purple-500/20 bg-purple-500/5"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
                        {/* Area Chart: Evolution */}
                        <div className="p-4 rounded-2xl border border-gray-800 bg-gray-900 flex flex-col h-full">
                            <h3 className="text-lg font-semibold mb-4 text-gray-200">Evolução Financeira</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.history}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9CA3AF" />
                                        <YAxis stroke="#9CA3AF" tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                            formatter={(value: any) => formatCurrency(value)}
                                        />
                                        <Area type="monotone" dataKey="profit" stroke="#8884d8" fillOpacity={1} fill="url(#colorProfit)" name="Lucro" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart: Income vs Expenses */}
                        <div className="p-4 rounded-2xl border border-gray-800 bg-gray-900 flex flex-col h-full">
                            <h3 className="text-lg font-semibold mb-4 text-gray-200">Receitas vs Despesas</h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.history}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="name" stroke="#9CA3AF" />
                                        <YAxis stroke="#9CA3AF" tickFormatter={(val) => `R$ ${val / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                            formatter={(value: any) => formatCurrency(value)}
                                        />
                                        <Legend />
                                        <Bar dataKey="revenue" name="Receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expenses" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
