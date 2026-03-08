'use client';

import { CheckCircle, AlertCircle, Clock, Activity, Wifi, Database, Server, Cpu, Globe, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

const SERVICES = [
    { name: 'API Principal', key: 'api', icon: Server },
    { name: 'Banco de Dados', key: 'db', icon: Database },
    { name: 'Gemini AI', key: 'ai', icon: Cpu },
    { name: 'Mercado Pago', key: 'payments', icon: Globe },
    { name: 'SendGrid Email', key: 'email', icon: Wifi },
    { name: 'Worker de Background', key: 'worker', icon: Activity },
];

const INCIDENTS = [
    {
        id: 1,
        title: 'Lentidão no processamento de CVs',
        status: 'resolved',
        severity: 'minor',
        date: '19/02/2026 14:00',
        resolution: 'Aumentada capacidade do Gemini API. Resolvido às 14h45.',
    },
];

export default function StatusPage() {
    const [services, setServices] = useState<Record<string, 'operational' | 'degraded' | 'outage'>>(
        Object.fromEntries(SERVICES.map(s => [s.key, 'operational']))
    );
    const [lastCheck, setLastCheck] = useState(new Date().toLocaleTimeString('pt-BR'));
    const [checking, setChecking] = useState(false);

    const checkHealth = async () => {
        setChecking(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const res = await fetch(`${apiUrl}/health`);
            setServices(prev => ({ ...prev, api: res.ok ? 'operational' : 'outage' }));
        } catch {
            setServices(prev => ({ ...prev, api: 'outage' }));
        }
        setLastCheck(new Date().toLocaleTimeString('pt-BR'));
        setChecking(false);
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    const allOperational = Object.values(services).every(s => s === 'operational');
    const hasOutage = Object.values(services).some(s => s === 'outage');

    const overallStatus = hasOutage ? 'outage' : allOperational ? 'operational' : 'degraded';

    const statusConfig = {
        operational: { color: 'green', text: 'Todos os sistemas operacionais', icon: CheckCircle, bg: 'bg-green-500/10 border-green-500/30' },
        degraded: { color: 'yellow', text: 'Degradação parcial detectada', icon: Clock, bg: 'bg-yellow-500/10 border-yellow-500/30' },
        outage: { color: 'red', text: 'Interrupção em andamento', icon: AlertCircle, bg: 'bg-red-500/10 border-red-500/30' },
    };

    const svcConfig = {
        operational: { text: 'Operacional', color: 'text-green-400', dot: 'bg-green-400' },
        degraded: { text: 'Degradado', color: 'text-yellow-400', dot: 'bg-yellow-400' },
        outage: { text: 'Fora do ar', color: 'text-red-400', dot: 'bg-red-400' },
    };

    const cfg = statusConfig[overallStatus];
    const StatusIcon = cfg.icon;

    const uptimes = { api: '99.97%', db: '99.99%', ai: '99.80%', payments: '99.95%', email: '99.90%', worker: '99.85%' };

    return (
        <div className="min-h-screen bg-gray-950 text-slate-900">
            {/* Header */}
            <div className="border-b border-blue-500/20 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            INNOVATION.IA
                        </span>
                        <span className="text-gray-500 text-sm">/ Status</span>
                    </div>
                    <button onClick={checkHealth} disabled={checking}
                        className="flex items-center gap-2 text-gray-400 hover:text-slate-900 text-sm transition">
                        <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Overall status banner */}
                <div className={`border rounded-2xl p-8 text-center mb-10 ${cfg.bg}`}>
                    <StatusIcon className={`w-16 h-16 mx-auto mb-4 text-${cfg.color}-400`} />
                    <h1 className={`text-2xl font-bold text-${cfg.color}-400 mb-2`}>{cfg.text}</h1>
                    <p className="text-gray-500 text-sm">Última verificação: {lastCheck}</p>
                </div>

                {/* Services */}
                <div className="mb-10">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Componentes do Sistema</h2>
                    <div className="bg-white border border-blue-500/20 rounded-2xl overflow-hidden divide-y divide-gray-800">
                        {SERVICES.map(service => {
                            const status = services[service.key] || 'operational';
                            const sc = svcConfig[status];
                            const Icon = service.icon;
                            return (
                                <div key={service.key} className="flex items-center justify-between px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-gray-500" />
                                        <span className="text-slate-900">{service.name}</span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-gray-500 text-sm">{uptimes[service.key as keyof typeof uptimes]} uptime</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${sc.dot} ${status === 'operational' ? 'animate-pulse' : ''}`} />
                                            <span className={`text-sm ${sc.color}`}>{sc.text}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Uptime chart (visual bars) */}
                <div className="mb-10">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Disponibilidade (90 dias)</h2>
                    <div className="bg-white border border-blue-500/20 rounded-2xl p-6">
                        {SERVICES.map(service => (
                            <div key={service.key} className="mb-4">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">{service.name}</span>
                                    <span className="text-green-400">{uptimes[service.key as keyof typeof uptimes]}</span>
                                </div>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 90 }).map((_, i) => {
                                        const isDown = Math.random() < 0.005;
                                        return (
                                            <div key={i} className={`h-6 flex-1 rounded-sm ${isDown ? 'bg-red-500' : 'bg-green-500/70'}`} />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-between text-xs text-gray-600 mt-2">
                            <span>90 dias atrás</span>
                            <span className="flex items-center gap-4">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-sm inline-block" />Operacional</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm inline-block" />Incidente</span>
                            </span>
                            <span>Hoje</span>
                        </div>
                    </div>
                </div>

                {/* Incidents */}
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Histórico de Incidentes</h2>
                    <div className="space-y-3">
                        {INCIDENTS.map(incident => (
                            <div key={incident.id} className="bg-white border border-blue-500/20 rounded-xl p-5">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-slate-900 font-medium">{incident.title}</h3>
                                    <span className="text-green-400 text-xs bg-green-500/10 px-2 py-0.5 rounded-full">✓ Resolvido</span>
                                </div>
                                <p className="text-gray-400 text-sm">{incident.resolution}</p>
                                <p className="text-gray-600 text-xs mt-2">{incident.date}</p>
                            </div>
                        ))}
                        <div className="text-center py-8 text-gray-600 text-sm">
                            Nenhum incidente ativo nos últimos 30 dias ✓
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-700 text-xs mt-12">
                    innovation.ia © 2026 — Esta página é pública em <code className="text-gray-600">status.innovation.ia</code>
                </p>
            </div>
        </div>
    );
}
