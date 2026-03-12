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
            <div className="min-h-screen bg-slate-50 text-slate-900 p-8 relative">
                {/* Notification Toast */}
                {notification && (
                    <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 animate-in slide-in-from-right ${notification.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                        : 'bg-rose-50 border border-rose-100 text-rose-600'
                        }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-xs font-black uppercase tracking-tight">{notification.msg}</span>
                    </div>
                )}

                <div className="max-w-5xl mx-auto pb-20 space-y-10 animate-in fade-in duration-700">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-1 uppercase">
                                Ponto <span className="text-blue-600">Eletrônico</span>
                            </h1>
                            <p className="text-slate-500 font-medium tracking-tight">Registre sua jornada com precisão e segurança</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                        >
                            <Edit3 className="w-4 h-4" />
                            Registro Manual
                        </button>
                    </div>

                    {/* Clock Card */}
                    <div className="relative bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[3rem] p-12 text-center shadow-xl overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-600 to-indigo-500 opacity-[0.03] rounded-bl-[10rem] pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-[0.02] rounded-tr-[10rem] pointer-events-none" />

                        <div className="relative z-10">
                            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mx-auto mb-8 shadow-inner group-hover:scale-110 transition-transform">
                                <Clock size={40} />
                            </div>

                            <div className="text-8xl md:text-9xl font-black text-slate-900 tracking-tighter mb-4">
                                {mounted ? currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                            </div>
                            <div className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">
                                {mounted ? currentTime.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Carregando data...'}
                            </div>

                            {/* Ponto Buttons */}
                            <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
                                <button
                                    onClick={() => handlePonto('credit')}
                                    disabled={isSubmitting || lastAction === 'credit'}
                                    className="flex items-center justify-center gap-4 px-12 py-5 bg-emerald-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl shadow-emerald-100"
                                >
                                    {isSubmitting && lastAction !== 'debit' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <LogIn className="w-5 h-5" />
                                    )}
                                    Registrar Entrada
                                </button>
                                <button
                                    onClick={() => handlePonto('debit')}
                                    disabled={isSubmitting || lastAction === 'debit'}
                                    className="flex items-center justify-center gap-4 px-12 py-5 bg-white border-2 border-rose-100 text-rose-600 rounded-[1.8rem] font-black text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-xl shadow-rose-50"
                                >
                                    {isSubmitting && lastAction !== 'credit' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <LogOut className="w-5 h-5" />
                                    )}
                                    Registrar Saída
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-8 text-center hover:shadow-lg transition-all">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Entradas</div>
                                <div className="text-3xl font-black text-emerald-600">{formatHours(balance.total_credit_hours)}</div>
                            </div>
                            <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-8 text-center hover:shadow-lg transition-all">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Saídas</div>
                                <div className="text-3xl font-black text-rose-600">{formatHours(balance.total_debit_hours)}</div>
                            </div>
                            <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2rem] p-8 text-center hover:shadow-lg transition-all relative overflow-hidden">
                                <div className={`absolute top-0 w-full h-1 left-0 ${balance.balance_hours >= 0 ? 'bg-blue-600' : 'bg-orange-600'}`} />
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo Global</div>
                                <div className={`text-3xl font-black ${balance.balance_hours >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                                    {balance.balance_hours >= 0 ? '+' : ''}{formatHours(balance.balance_hours)}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Today's Entries */}
                    <div className="bg-white border-slate-200 border-black/5 shadow-sm border-slate-100 rounded-[2.5rem] p-8">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-blue-600" />
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Timeline Diária</h3>
                            </div>
                            <span className="bg-blue-50 text-blue-600 text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest">
                                {sortedEntries.length} {sortedEntries.length === 1 ? 'REGISTRO' : 'REGISTROS'}
                            </span>
                        </div>

                        {sortedEntries.length === 0 ? (
                            <div className="text-center py-16 opacity-40 grayscale">
                                <Clock size={48} className="mx-auto mb-4 text-slate-400" />
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nenhuma telemetria detectada hoje</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sortedEntries.map((e) => (
                                    <div key={e.id} className="flex items-center justify-between p-5 rounded-2xl bg-white border-slate-200 border-black/5 shadow-sm border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all group">
                                        <div className="flex items-center gap-5">
                                            <div className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-inner ${e.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                {e.type === 'credit' ? <LogIn size={20} /> : <LogOut size={20} />}
                                            </div>
                                            <div>
                                                <span className="block text-sm font-black text-slate-900 uppercase tracking-tight">{e.reason}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocolo Neural Validado</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`block text-xl font-black ${e.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {e.type === 'credit' ? '+' : '-'}{formatHours(e.hours)}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Manual Entry Modal */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 w-full max-w-xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[5rem] pointer-events-none" />

                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic">
                                        <Edit3 className="w-6 h-6 text-blue-600" /> Registro Manual
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Correção de Telemetria de Jornada</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                if (!manualDate || !manualTime || !manualReason) {
                                    showNotification('error', 'Preencha todos os campos requeridos.');
                                    return;
                                }
                                handlePonto(manualType, { date: manualDate, time: manualTime, reason: manualReason });
                            }} className="space-y-6">

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Evento</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setManualType('credit')}
                                            className={`py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all border ${manualType === 'credit' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                                        >
                                            <LogIn size={18} /> Entrada
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setManualType('debit')}
                                            className={`py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all border ${manualType === 'debit' ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                                        >
                                            <LogOut size={18} /> Saída
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data do Log</label>
                                        <input
                                            type="date"
                                            value={manualDate}
                                            onChange={(e) => setManualDate(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário Preciso</label>
                                        <input
                                            type="time"
                                            value={manualTime}
                                            onChange={(e) => setManualTime(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Justificativa Técnica</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Falha na telemetria biométrica"
                                        value={manualReason}
                                        onChange={(e) => setManualReason(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-slate-900 font-bold focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all placeholder:text-slate-300"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full mt-4 py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-100 flex justify-center items-center gap-3"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                    Finalizar Registro Manual
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
