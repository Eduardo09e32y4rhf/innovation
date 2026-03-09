'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Star, Loader2, RefreshCw, Users, Clock } from 'lucide-react';
import AppLayout from '@/components/AppLayout';

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

    const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const apiFetch = async (path: string) => {
        const token = getToken();
        if (!token) { window.location.href = '/login'; throw new Error('No token'); }
        const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${BASE}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
    };

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
        if (severity === 'critical') return 'text-red-400 bg-red-500/10 border-red-500/30';
        if (severity === 'warning') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        return 'text-green-400 bg-green-500/10 border-green-500/30';
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
            <div className="min-h-screen bg-gray-950 text-slate-900 p-6">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                B.I. Analytics
                            </h1>
                            <p className="text-gray-400 mt-1">Visão em tempo real do desempenho operacional</p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border-gray-700 rounded-xl text-gray-300 text-sm transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Atualizar
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
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white/60 border border-gray-800 rounded-xl p-5">

                                    <div className="flex items-center gap-2 mb-3">
                                        <Star className="w-5 h-5 text-yellow-400" />
                                        <span className="text-sm text-gray-400">Satisfação Média (CSAT)</span>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">
                                        {csat ? csat.average.toFixed(1) : '—'}<span className="text-base text-gray-500">/5</span>
                                    </div>
                                    <div className="flex gap-1 mt-2">{csat ? renderStars(csat.average) : null}</div>
                                    <p className="text-xs text-gray-500 mt-1">{csat?.total ?? 0} avaliações</p>
                                </div>

                                <div className={`border rounded-xl p-5 ${getSeverityColor(spike?.severity)}`}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle className="w-5 h-5" />
                                        <span className="text-sm opacity-80">Tickets — Última Hora</span>
                                    </div>
                                    <div className="text-3xl font-black">{spike?.tickets_last_hour ?? '—'}</div>
                                    <p className="text-xs opacity-60 mt-1">
                                        Média: {spike?.hourly_average_24h?.toFixed(1) ?? '—'} / hora
                                        {spike?.is_spike ? ' — ⚠️ SPIKE DETECTADO' : ''}
                                    </p>
                                </div>

                                <div className="bg-white/60 border border-gray-800 rounded-xl p-5">

                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="w-5 h-5 text-blue-400" />
                                        <span className="text-sm text-gray-400">Banco de Horas (Saldo)</span>
                                    </div>
                                    <div className={`text-3xl font-black ${(timeBank?.balance_hours ?? 0) >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                        {timeBank ? `${timeBank.balance_hours >= 0 ? '+' : ''}${Math.floor(timeBank.balance_hours)}h` : '—'}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {timeBank ? `${Math.floor(timeBank.total_credit_hours)}h crédito / ${Math.floor(timeBank.total_debit_hours)}h débito` : 'Carregando...'}
                                    </p>
                                </div>
                            </div>

                            {/* CSAT Distribution Chart */}
                            {csat && (
                                <div className="bg-white/60 border border-gray-800 rounded-xl p-6">

                                    <div className="flex items-center gap-2 mb-6">
                                        <BarChart3 className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-bold text-gray-200">Distribuição de Notas CSAT</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {[5, 4, 3, 2, 1].map(score => {
                                            const count = csat.distribution[String(score)] ?? 0;
                                            const pct = maxBar > 0 ? (count / maxBar) * 100 : 0;
                                            return (
                                                <div key={score} className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 w-16">
                                                        <span className="text-yellow-400 text-sm font-bold">{score}</span>
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                    </div>
                                                    <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-400 text-sm w-8 text-right">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Spike Top Offenders */}
                            {spike && (spike.top_offenders?.length ?? 0) > 0 && (
                                <div className="bg-white/60 border border-gray-800 rounded-xl p-6">

                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-5 h-5 text-red-400" />
                                        <h3 className="font-bold text-gray-200">Categorias em Alta (Última Hora)</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {spike.top_offenders?.map((off, i) => (
                                            <div key={i} className="bg-gray-800/60 rounded-xl p-4 border-gray-700">
                                                <div className="text-sm text-gray-400">{off.category}</div>
                                                <div className="text-2xl font-black text-slate-900 mt-1">{off.count}</div>
                                                <div className="text-xs text-gray-500">tickets</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Employees Placeholder */}
                            <div className="bg-white/60 border border-gray-800 rounded-xl p-6">

                                <div className="flex items-center gap-2 mb-4">
                                    <Users className="w-5 h-5 text-green-400" />
                                    <h3 className="font-bold text-gray-200">Resumo Equipe</h3>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    {[
                                        { label: 'Crédito Total (h)', value: Math.floor(timeBank?.total_credit_hours ?? 0), color: 'text-green-400' },
                                        { label: 'Débito Total (h)', value: Math.floor(timeBank?.total_debit_hours ?? 0), color: 'text-red-400' },
                                        { label: 'Tickets Abertos', value: spike?.tickets_last_hour ?? 0, color: 'text-yellow-400' },
                                        { label: 'Score CSAT', value: csat ? `${csat.average.toFixed(1)}/5` : '—', color: 'text-blue-400' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-gray-800/40 rounded-xl p-4">
                                            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                                            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
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
