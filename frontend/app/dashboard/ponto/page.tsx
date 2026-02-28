'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, Calendar, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import AppLayout from '../../../components/AppLayout';

interface TimeBankEntry {
    id: number;
    type: 'credit' | 'debit';
    hours: number;
    reason: string;
    created_at: string;
    status: string;
}

interface BalanceData {
    total_credit_hours: number;
    total_debit_hours: number;
    balance_hours: number;
    entries: TimeBankEntry[];
}

export default function PontoPage() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Tick clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    };

    const showNotification = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, msg });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchBalance = useCallback(async () => {
        const token = getToken();
        if (!token) {
            window.location.href = '/login';
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/rh/v2/time-bank/balance`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.status === 401) { window.location.href = '/login'; return; }
            if (res.ok) {
                const data = await res.json();
                setBalance(data);
            }
        } catch {
            // silently fail — show cached or empty state
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBalance(); }, [fetchBalance]);

    const handlePonto = async (type: 'credit' | 'debit') => {
        if (isSubmitting) return; // Anti-double-click
        setIsSubmitting(true);

        const token = getToken();
        if (!token) { window.location.href = '/login'; return; }

        const reason = type === 'credit' ? 'Entrada registrada via portal' : 'Saída registrada via portal';

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/rh/v2/time-bank`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ type, hours: 1, reason }),
            });

            if (res.status === 401) { window.location.href = '/login'; return; }

            if (res.ok) {
                setLastAction(type);
                showNotification('success', type === 'credit' ? '✅ Entrada registrada com sucesso!' : '✅ Saída registrada com sucesso!');
                await fetchBalance();
            } else {
                const err = await res.json();
                showNotification('error', err.detail || 'Erro ao registrar ponto');
            }
        } catch {
            showNotification('error', 'Erro de conexão com o servidor');
        } finally {
            // 3-second cooldown before re-enabling the button
            setTimeout(() => setIsSubmitting(false), 3000);
        }
    };

    const formatHours = (h: number) => {
        const hrs = Math.floor(Math.abs(h));
        const mins = Math.round((Math.abs(h) - hrs) * 60);
        return `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`;
    };

    const todayEntries = balance?.entries?.filter(e => {
        const d = new Date(e.created_at);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }) ?? [];

    return (
        <AppLayout title="Ponto Eletrônico">
            <div className="min-h-screen bg-gray-950 text-white p-6">
                {/* Notification Toast */}
                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 ${notification.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                        : 'bg-red-500/20 border border-red-500/40 text-red-300'
                        }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {notification.msg}
                    </div>
                )}

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                            Ponto Eletrônico
                        </h1>
                        <p className="text-gray-400 mt-1">Registre sua entrada e saída com segurança</p>
                    </div>

                    {/* Clock Card */}
                    <div className="relative bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-10 mb-6 text-center overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />
                        <Clock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                        <div className="text-6xl font-mono font-black text-white tracking-widest">
                            {currentTime.toLocaleTimeString('pt-BR')}
                        </div>
                        <div className="text-gray-400 mt-2 text-lg">
                            {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>

                        {/* Ponto Buttons */}
                        <div className="flex gap-4 justify-center mt-8">
                            <button
                                onClick={() => handlePonto('credit')}
                                disabled={isSubmitting || lastAction === 'credit'}
                                className="flex items-center gap-2 px-8 py-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting && lastAction !== 'debit' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <LogIn className="w-5 h-5" />
                                )}
                                Entrada
                            </button>
                            <button
                                onClick={() => handlePonto('debit')}
                                disabled={isSubmitting || lastAction === 'debit'}
                                className="flex items-center gap-2 px-8 py-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-xl font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting && lastAction !== 'credit' ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <LogOut className="w-5 h-5" />
                                )}
                                Saída
                            </button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                        </div>
                    ) : balance ? (
                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-center">
                                <div className="text-sm text-gray-500 mb-1">Total de Créditos</div>
                                <div className="text-2xl font-bold text-green-400">{formatHours(balance.total_credit_hours)}</div>
                            </div>
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-center">
                                <div className="text-sm text-gray-500 mb-1">Total de Débitos</div>
                                <div className="text-2xl font-bold text-red-400">{formatHours(balance.total_debit_hours)}</div>
                            </div>
                            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 text-center">
                                <div className="text-sm text-gray-500 mb-1">Saldo do Banco de Horas</div>
                                <div className={`text-2xl font-bold ${balance.balance_hours >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                    {balance.balance_hours >= 0 ? '+' : ''}{formatHours(balance.balance_hours)}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Today's Entries */}
                    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-purple-400" />
                            <h3 className="font-bold text-gray-200">Registros de Hoje</h3>
                        </div>
                        {todayEntries.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">Nenhum registro hoje ainda</p>
                        ) : (
                            <div className="space-y-2">
                                {todayEntries.map((e) => (
                                    <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${e.type === 'credit' ? 'bg-green-400' : 'bg-red-400'}`} />
                                            <span className="text-gray-300 text-sm">{e.reason}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-medium ${e.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                {e.type === 'credit' ? '+' : '-'}{formatHours(e.hours)}
                                            </span>
                                            <span className="text-gray-500 text-xs">
                                                {new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
