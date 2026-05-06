'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Star, Loader2, RefreshCw, Users, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { apiFetch } from '@/services/api';

interface CSATSummary {
    average: number;
    total: number;
    distribution: Record<string, number>;
}

interface SpikeData {
    tickets_last_hour: number;
    hourly_average_24h: number;
    spike_ratio: number;
    is_spike: boolean;
    severity: 'normal' | 'warning' | 'critical';
    top_offenders: { category: string; count: number }[];
}

interface TimeBankBalance {
    total_credit_hours: number;
    total_debit_hours: number;
    balance_hours: number;
}

export default function AnalyticsPage() {
    const [csat, setCsat] = useState<CSATSummary | null>(null);
    const [spike, setSpike] = useState<SpikeData | null>(null);
    const [timeBank, setTimeBank] = useState<TimeBankBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [csatData, spikeData, bankData] = await Promise.allSettled([
                apiFetch('/api/support/v2/csat/summary'),
                apiFetch('/api/support/v2/analytics/spikes'),
                apiFetch('/api/rh/v2/time-bank/balance'),
            ]);
            if (csatData.status === 'fulfilled') setCsat(csatData.value);
            if (spikeData.status === 'fulfilled') setSpike(spikeData.value);
            if (bankData.status === 'fulfilled') setTimeBank(bankData.value);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadData();
    };

    const getSeverityColor = (severity?: string) => {
        if (severity === 'critical') return 'text-red-600 bg-red-50 border-red-100';
        if (severity === 'warning') return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    };

    const renderStars = (avg: number) => {
        return [1, 2, 3, 4, 5].map(i => (
            <Star
                key={i}
                className={`w-5 h-5 ${i <= Math.round(avg) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`}
            />
        ));
    };

    const maxBar = csat ? Math.max(...Object.values(csat.distribution)) : 1;

    return (
        <AppLayout title="B.I. Analytics">
            <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
                <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1 uppercase">
                                B.I. <span className="text-blue-600">Analytics</span>
                            </h1>
                            <p className="text-slate-500 font-medium tracking-tight">Visão em tempo real do desempenho operacional</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Atualizar Dashboard
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
                                <p className="text-gray-500">Carregando dados do servidor...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Top KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/40 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-600 to-orange-500 opacity-[0.03] rounded-bl-[4rem]" />
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 flex items-center justify-center text-amber-500 shadow-sm">
                                            <Star size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Satisfação Média</span>
                                            <div className="text-2xl font-black text-slate-900">
                                                {csat ? csat.average.toFixed(1) : '—'}<span className="text-sm text-slate-400 font-medium ml-1">/ 5.0</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 mb-2">{csat ? renderStars(csat.average) : null}</div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{csat?.total ?? 0} avaliações coletadas</p>
                                </div>

                                <div className={`border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-6 shadow-sm group relative overflow-hidden transition-all ${getSeverityColor(spike?.severity)}`}>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 flex items-center justify-center shadow-sm">
                                            <AlertTriangle size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black opacity-60 uppercase tracking-widest block">Tickets (Última Hora)</span>
                                            <div className="text-2xl font-black">{spike?.tickets_last_hour ?? '—'}</div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">
                                        Média: {spike?.hourly_average_24h?.toFixed(1) ?? '—'}/h
                                        {spike?.is_spike ? ' • SPIKE DETECTADO' : ''}
                                    </p>
                                </div>

                                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/40 transition-all group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-500 opacity-[0.03] rounded-bl-[4rem]" />
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 flex items-center justify-center text-blue-600 shadow-sm">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Banco de Horas</span>
                                            <div className={`text-2xl font-black ${(timeBank?.balance_hours ?? 0) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                                {timeBank ? `${timeBank.balance_hours >= 0 ? '+' : ''}${Math.floor(timeBank.balance_hours)}h` : '—'}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {timeBank ? `${Math.floor(timeBank.total_credit_hours)}h crédito • ${Math.floor(timeBank.total_debit_hours)}h débito` : 'Calculando balanço...'}
                                    </p>
                                </div>
                            </div>

                            {/* CSAT Distribution Chart */}
                            {csat && (
                                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                                    <div className="flex items-center gap-3 mb-8">
                                        <BarChart3 className="w-6 h-6 text-blue-600" />
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Distribuição de Notas CSAT</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {[5, 4, 3, 2, 1].map(score => {
                                            const count = csat.distribution[String(score)] ?? 0;
                                            const pct = maxBar > 0 ? (count / maxBar) * 100 : 0;
                                            return (
                                                <div key={score} className="flex items-center gap-5">
                                                    <div className="flex items-center gap-1.5 w-20">
                                                        <span className="text-amber-500 text-sm font-black">{score}</span>
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                    </div>
                                                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-1000"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-slate-400 font-bold text-sm w-10 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Spike Top Offenders */}
                            {spike && (spike.top_offenders?.length ?? 0) > 0 && (
                                <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <TrendingUp className="w-6 h-6 text-red-500" />
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Categorias em Alta (Surtos)</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                        {spike.top_offenders?.map((off, i) => (
                                            <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:border-red-100 transition-all group">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{off.category}</div>
                                                <div className="text-3xl font-black text-slate-900">{off.count}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">ocorrências</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Employees Placeholder */}
                            <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <Users className="w-6 h-6 text-emerald-500" />
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Telemetria de Equipe</h3>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Crédito Global', value: Math.floor(timeBank?.total_credit_hours ?? 0) + 'h', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                        { label: 'Débito Global', value: Math.floor(timeBank?.total_debit_hours ?? 0) + 'h', color: 'text-red-600', bg: 'bg-red-50' },
                                        { label: 'Tickets Críticos', value: spike?.tickets_last_hour ?? 0, color: 'text-amber-600', bg: 'bg-amber-50' },
                                        { label: 'Performance', value: csat ? `${csat.average.toFixed(1)}/5` : '—', color: 'text-blue-600', bg: 'bg-blue-50' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col items-center text-center">
                                            <div className={`text-3xl font-black mb-1 ${stat.color}`}>{stat.value}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
