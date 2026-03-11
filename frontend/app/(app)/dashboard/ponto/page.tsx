'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, Calendar, CheckCircle, AlertCircle, Loader2, Edit3, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { BiometricPunch } from '@/components/rh/BiometricPunch';
import { AttendanceService } from '@/services/api';

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
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [manualType, setManualType] = useState<'credit' | 'debit'>('credit');
    const [manualDate, setManualDate] = useState('');
    const [manualTime, setManualTime] = useState('');
    const [manualReason, setManualReason] = useState('');

    useEffect(() => {
        setMounted(true);
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
        try {
            const data = await AttendanceService.getPunchBalance();
            setBalance(data);
        } catch (err: any) {
            if (err.response?.status === 401) {
                // api.ts interceptor should handle this, but keeping safety check
                window.location.href = '/login';
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBalance(); }, [fetchBalance]);

    const handlePonto = async (type: 'credit' | 'debit', manualData?: { date: string, time: string, reason: string }) => {
        if (isSubmitting) return; // Anti-double-click
        setIsSubmitting(true);

        let reason = type === 'credit' ? 'Entrada registrada via portal' : 'Saída registrada via portal';
        let payload: any = { type, hours: 1 };

        if (manualData) {
            reason = `Registro Manual: ${manualData.reason}`;
            const dateTimeStr = `${manualData.date}T${manualData.time}:00`;
            const created_at = new Date(dateTimeStr).toISOString();
            payload = { ...payload, reason, created_at };
            setShowModal(false);
        } else {
            payload = { ...payload, reason };
        }

        try {
            await AttendanceService.registerPunch(payload);
            setLastAction(type);
            showNotification('success', type === 'credit' ? '✅ Entrada registrada com sucesso!' : '✅ Saída registrada com sucesso!');
            await fetchBalance();

            // reset modal fields
            setManualDate('');
            setManualTime('');
            setManualReason('');
        } catch (err: any) {
            const detail = err.response?.data?.detail || 'Erro ao registrar ponto';
            showNotification('error', detail);
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

    const sortedEntries = [...todayEntries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <AppLayout title="Ponto Eletrônico">
            <div className="min-h-screen bg-gray-950 text-slate-900 p-6 relative">
                {/* Notification Toast */}
                {notification && (
                    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl transition-all duration-300 ${notification.type === 'success'
                        ? 'bg-green-500/20 border-green-500/40 text-green-300'
                        : 'bg-red-500/20 border-red-500/40 text-red-300'
                        }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {notification.msg}
                    </div>
                )}

                <div className="max-w-4xl mx-auto pb-20">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Ponto Eletrônico
                            </h1>
                            <p className="text-gray-400 mt-1">Registre sua entrada e saída com segurança</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border-gray-700"
                        >
                            <Edit3 className="w-4 h-4" />
                            Registro Manual
                        </button>
                    </div>

                    {/* Clock Card */}
                    <div className="relative bg-gradient-to-br from-purple-900/40 to-blue-900/40 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-10 mb-6 text-center shadow-2xl overflow-hidden">

                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15)_0%,transparent_70%)]" />

                        <div className="relative z-10">
                            <Clock className="w-14 h-14 text-blue-600 mx-auto mb-6 drop-shadow-lg" />

                            <div className="text-7xl md:text-8xl font-mono font-black text-slate-900 tracking-widest drop-shadow-md">
                                {mounted ? currentTime.toLocaleTimeString('pt-BR') : '--:--:--'}
                            </div>
                            <div className="text-gray-400 mt-4 text-xl">
                                {mounted ? currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Carregando data...'}
                            </div>

                            {/* Ponto Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                                <button
                                    onClick={() => handlePonto('credit')}
                                    disabled={isSubmitting || lastAction === 'credit'}
                                    className="flex items-center justify-center gap-3 px-10 py-5 bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300 rounded-2xl font-bold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.3)] transform hover:-translate-y-1"
                                >
                                    {isSubmitting && lastAction !== 'debit' ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <LogIn className="w-6 h-6" />
                                    )}
                                    Entrar
                                </button>
                                <button
                                    onClick={() => handlePonto('debit')}
                                    disabled={isSubmitting || lastAction === 'debit'}
                                    className="flex items-center justify-center gap-3 px-10 py-5 bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-300 rounded-2xl font-bold text-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)] transform hover:-translate-y-1"
                                >
                                    {isSubmitting && lastAction !== 'credit' ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <LogOut className="w-6 h-6" />
                                    )}
                                    Sair
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Biometric Punch Section - Nível Militar */}
                    <div className="mb-12">
                        <BiometricPunch onSuccess={() => fetchBalance()} />
                    </div>

                    {/* Stats Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : balance ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-white/60 backdrop-blur-md border border-gray-800 rounded-2xl p-6 text-center transform transition-all hover:scale-105">
                                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Total Entradas</div>
                                <div className="text-3xl font-black text-green-400">{formatHours(balance.total_credit_hours)}</div>
                            </div>
                            <div className="bg-white/60 backdrop-blur-md border border-gray-800 rounded-2xl p-6 text-center transform transition-all hover:scale-105">
                                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Total Saídas</div>
                                <div className="text-3xl font-black text-red-400">{formatHours(balance.total_debit_hours)}</div>
                            </div>
                            <div className="bg-white/60 backdrop-blur-md border border-gray-800 rounded-2xl p-6 text-center transform transition-all hover:scale-105 relative overflow-hidden">

                                <div className={`absolute top-0 w-full h-1 left-0 ${balance.balance_hours >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                <div className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Saldo do Banco</div>
                                <div className={`text-3xl font-black ${balance.balance_hours >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                    {balance.balance_hours >= 0 ? '+' : ''}{formatHours(balance.balance_hours)}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Today's Entries */}
                    <div className="bg-white/60 backdrop-blur-md border border-gray-800 rounded-2xl p-6">

                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800/50">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-blue-600" />
                                <h3 className="font-bold text-xl text-gray-200">Registros de Hoje</h3>
                            </div>
                            <span className="bg-blue-500/20 text-blue-500 text-xs px-3 py-1 rounded-full font-bold">
                                {sortedEntries.length} {sortedEntries.length === 1 ? 'registro' : 'registros'}
                            </span>
                        </div>

                        {sortedEntries.length === 0 ? (
                            <div className="text-center py-10 opacity-50">
                                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-gray-400 text-lg">Nenhum registro encontrado hoje</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedEntries.map((e) => (
                                    <div key={e.id} className="group flex items-center justify-between p-4 rounded-xl hover:bg-gray-800/50 transition-colors border-transparent hover:border-gray-700">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${e.type === 'credit' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {e.type === 'credit' ? <LogIn className="w-5 h-5 ml-1" /> : <LogOut className="w-5 h-5 mr-1" />}
                                            </div>
                                            <div>
                                                <span className="block text-gray-200 font-medium">{e.reason}</span>
                                                <span className="text-gray-500 text-sm">Validado pelo sistema</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <span className={`block text-lg font-bold ${e.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                                    {e.type === 'credit' ? '+' : '-'}{formatHours(e.hours)}
                                                </span>
                                                <span className="text-gray-400 text-sm font-mono">
                                                    {new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Manual Entry Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm">
                        <div className="bg-white border border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl transform transition-all">

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Edit3 className="w-5 h-5 text-blue-600" />
                                    Registro Manual
                                </h3>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-slate-900 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-400 mb-6">
                                Utilize esta opção apenas caso tenha esquecido de registrar o ponto no horário correto.
                            </p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!manualDate || !manualTime || !manualReason) {
                                    showNotification('error', 'Preencha todos os campos');
                                    return;
                                }
                                handlePonto(manualType, { date: manualDate, time: manualTime, reason: manualReason });
                            }} className="space-y-4">

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Registro</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setManualType('credit')}
                                            className={`py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${manualType === 'credit' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                                        >
                                            <LogIn className="w-4 h-4" /> Entrada
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setManualType('debit')}
                                            className={`py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${manualType === 'debit' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-gray-800 text-gray-400 border-transparent'}`}
                                        >
                                            <LogOut className="w-4 h-4" /> Saída
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                                        <input
                                            type="date"
                                            value={manualDate}
                                            onChange={(e) => setManualDate(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [color-scheme:dark]"

                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Hora</label>
                                        <input
                                            type="time"
                                            value={manualTime}
                                            onChange={(e) => setManualTime(e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [color-scheme:dark]"

                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Motivo (Justificativa)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Esqueci de bater na entrada"
                                        value={manualReason}
                                        onChange={(e) => setManualReason(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"

                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-4 py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-slate-900 rounded-xl font-bold text-lg transition-colors flex justify-center items-center gap-2"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    Salvar Registro
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
