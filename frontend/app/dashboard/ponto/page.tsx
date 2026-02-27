'use client';

import { useState, useEffect } from 'react';
import { Clock, Play, Square, Pause } from 'lucide-react';
import AppLayout from '../../../components/AppLayout';
import api from '../../../services/api';

// Simple Clock component
function DigitalClock() {
    const [time, setTime] = useState('');

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="text-6xl font-black font-mono text-white tracking-widest bg-gray-900/50 px-8 py-4 rounded-2xl border border-white/5 shadow-2xl">
            {time}
        </div>
    );
}

export default function PontoPage() {
    const [status, setStatus] = useState<'idle' | 'working' | 'break'>('idle');
    const [lastRecord, setLastRecord] = useState<any>(null);
    const [todayHistory, setTodayHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await api.get('/rh/attendance/history?limit=5');
            // Assuming the API returns a list of records, we filter for today to check status
            const records = res.data;
            setTodayHistory(records);

            // Simple logic to determine current status based on last record
            // Real implementation would depend on backend logic
            if (records.length > 0) {
                const last = records[0];
                const today = new Date().toISOString().split('T')[0];
                if (last.date === today && !last.exit_time) {
                    setStatus('working');
                    setLastRecord(last);
                } else {
                    setStatus('idle');
                }
            }
        } catch (error) {
            console.error("Failed to load attendance history", error);
        }
    };

    const handleClockIn = async () => {
        setLoading(true);
        try {
            await api.post('/rh/attendance/clock-in', { record_type: 'normal' });
            setStatus('working');
            loadHistory();
        } catch (error) {
            console.error("Clock in failed", error);
            alert("Erro ao bater ponto. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleClockOut = async () => {
        setLoading(true);
        try {
            await api.post('/rh/attendance/clock-out');
            setStatus('idle');
            loadHistory();
        } catch (error) {
            console.error("Clock out failed", error);
            alert("Erro ao encerrar expediente. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout title="Meu Ponto">
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-12 p-8">

                <div className="text-center space-y-2">
                    <h2 className="text-gray-400 text-sm uppercase tracking-widest">Horário de Brasília</h2>
                    <DigitalClock />
                    <p className="text-gray-500 text-xs mt-4">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>

                <div className="flex flex-col items-center gap-6">
                    {status === 'idle' ? (
                        <button
                            onClick={handleClockIn}
                            disabled={loading}
                            className="group relative flex items-center justify-center w-64 h-64 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_60px_-15px_rgba(16,185,129,0.5)] hover:shadow-[0_0_100px_-10px_rgba(16,185,129,0.7)] hover:scale-105 transition-all duration-300"
                        >
                            <div className="flex flex-col items-center gap-2 text-white">
                                <Play className="w-16 h-16 fill-current" />
                                <span className="text-xl font-bold uppercase tracking-widest">Iniciar</span>
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse" />
                        </button>
                    ) : (
                        <button
                            onClick={handleClockOut}
                            disabled={loading}
                            className="group relative flex items-center justify-center w-64 h-64 rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_60px_-15px_rgba(244,63,94,0.5)] hover:shadow-[0_0_100px_-10px_rgba(244,63,94,0.7)] hover:scale-105 transition-all duration-300"
                        >
                            <div className="flex flex-col items-center gap-2 text-white">
                                <Square className="w-16 h-16 fill-current" />
                                <span className="text-xl font-bold uppercase tracking-widest">Encerrar</span>
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-pulse" />
                        </button>
                    )}

                    <p className="text-gray-400 text-sm">
                        {status === 'idle' ? 'Pronto para começar?' : 'Jornada em andamento...'}
                    </p>
                </div>

                {/* Recent History Mini-View */}
                <div className="w-full max-w-md bg-white/5 rounded-xl border border-white/10 p-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Últimos Registros</h3>
                    <div className="space-y-3">
                        {todayHistory.length === 0 ? (
                            <p className="text-center text-gray-600 text-sm py-4">Nenhum registro recente</p>
                        ) : (
                            todayHistory.slice(0, 3).map((record: any) => (
                                <div key={record.id} className="flex items-center justify-between text-sm p-3 bg-black/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${record.exit_time ? 'bg-gray-500' : 'bg-green-500'}`} />
                                        <span className="text-white font-medium">{new Date(record.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-400">
                                        <span>Entrada: {record.entry_time?.slice(0, 5) || '--:--'}</span>
                                        <span>Saída: {record.exit_time?.slice(0, 5) || '--:--'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
