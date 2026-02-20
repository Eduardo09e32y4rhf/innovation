'use client';

import { Sidebar } from '../../components/Sidebar';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Activity, Bot, Calendar, DollarSign, Target, TrendingUp, Users } from "lucide-react"
import { useEffect, useState } from 'react';
import { DashboardService } from '../../services/api';

interface Activity {
    id: number;
    type: string;
    message: string;
    candidate_name?: string;
    timestamp: string;
    avatar?: string;
}

interface DashboardMetrics {
    revenue: {
        current: number;
        previous: number;
        change_percent: number;
        chart_data: { month: string; value: number }[];
    };
    costs: {
        current: number;
        previous: number;
        change_percent: number;
        breakdown: {
            salaries: number;
            infrastructure: number;
            marketing: number;
            others: number;
        };
        chart_data: { month: string; value: number }[];
    };
    profit: {
        current: number;
        previous: number;
        change_percent: number;
        margin_percent: number;
        chart_data: { month: string; value: number }[];
    };
}

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [m, a] = await Promise.all([
                    DashboardService.getMetrics(),
                    DashboardService.getRecentActivity(),
                ]);
                setMetrics(m);
                setActivities(a.activities || []);
            } catch (e) {
                console.error('Dashboard error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const stats = metrics ? [
        {
            title: "Receita Mensal",
            value: `R$ ${metrics.revenue?.current?.toLocaleString('pt-BR') ?? '---'}`,
            change: `+${metrics.revenue?.change_percent ?? 0}% vs mês anterior`,
            icon: DollarSign, color: "text-green-500",
        },
        {
            title: "Lucro Líquido",
            value: `R$ ${metrics.profit?.current?.toLocaleString('pt-BR') ?? '---'}`,
            change: `Margem ${metrics.profit?.margin_percent ?? 0}%`,
            icon: TrendingUp, color: "text-blue-500",
        },
        {
            title: "Custo Operacional",
            value: `R$ ${metrics.costs?.current?.toLocaleString('pt-BR') ?? '---'}`,
            change: `+${metrics.costs?.change_percent ?? 0}% vs mês anterior`,
            icon: Target, color: "text-pink-500",
        },
        {
            title: "Infraestrutura",
            value: `R$ ${metrics.costs?.breakdown?.infrastructure?.toLocaleString('pt-BR') ?? '---'}`,
            change: "Custo de servidores",
            icon: Users, color: "text-purple-500",
        },
    ] : [
        { title: "Receita Mensal", value: "Carregando...", change: "...", icon: DollarSign, color: "text-green-500" },
        { title: "Lucro Líquido", value: "Carregando...", change: "...", icon: TrendingUp, color: "text-blue-500" },
        { title: "Custo Operacional", value: "Carregando...", change: "...", icon: Target, color: "text-pink-500" },
        { title: "Infraestrutura", value: "Carregando...", change: "...", icon: Users, color: "text-purple-500" },
    ];

    const activityIconMap: Record<string, typeof Bot> = {
        application: Users, interview: Calendar, job: Target,
    };

    return (
        <div className="flex bg-[#0a0a0f] min-h-screen text-white">
            <Sidebar />
            <main className="flex-1 ml-[280px] p-8">
                <div className="flex flex-col space-y-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dashboard Enterprise</h1>
                            <p className="text-zinc-400">Visão geral em tempo real das operações.</p>
                        </div>
                        <Button className="bg-purple-600 hover:bg-purple-700">Novo Relatório</Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-zinc-200">{stat.title}</CardTitle>
                                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-white">{loading ? "..." : stat.value}</div>
                                        <p className="text-xs text-zinc-500 mt-1">{stat.change}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Revenue Chart */}
                        <Card className="col-span-4 border-zinc-800 bg-zinc-900/50">
                            <CardHeader>
                                <CardTitle className="text-white">Crescimento da Receita</CardTitle>
                                <CardDescription className="text-zinc-400">Últimos 6 meses</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px] flex items-end justify-between px-4 pb-4 space-x-2">
                                    {(metrics?.revenue?.chart_data ?? [35, 45, 60, 70, 80, 90].map((v, i) => ({ month: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'][i], value: v }))).map((d: { month: string; value: number }, i: number) => {
                                        const max = metrics?.revenue?.chart_data ? Math.max(...metrics.revenue.chart_data.map((x: { value: number }) => x.value)) : 100;
                                        const h = Math.round((d.value / max) * 100);
                                        return (
                                            <div key={i} className="w-full flex flex-col items-center gap-1">
                                                <div className="w-full bg-purple-500/20 hover:bg-purple-500/40 transition-colors rounded-t-sm relative" style={{ height: '260px' }}>
                                                    <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-purple-600 rounded-t-sm" />
                                                </div>
                                                <span className="text-xs text-zinc-500">{d.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Activity Feed */}
                        <Card className="col-span-3 border-zinc-800 bg-zinc-900/50">
                            <CardHeader>
                                <CardTitle className="text-white">Atividade Recente</CardTitle>
                                <CardDescription className="text-zinc-400">Ações do sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {loading ? (
                                        <p className="text-zinc-500 text-sm">Carregando...</p>
                                    ) : activities.length === 0 ? (
                                        <p className="text-zinc-500 text-sm">Nenhuma atividade recente.</p>
                                    ) : activities.map((item, i) => {
                                        const IconComp = activityIconMap[item.type] || Activity;
                                        return (
                                            <div className="flex items-center" key={i}>
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                                                    <IconComp className="h-4 w-4 text-purple-500" />
                                                </div>
                                                <div className="ml-4 space-y-1">
                                                    <p className="text-sm font-medium leading-none text-white">{item.candidate_name || 'Sistema'}</p>
                                                    <p className="text-xs text-zinc-400">{item.message}</p>
                                                </div>
                                                <div className="ml-auto font-medium text-xs text-zinc-500">
                                                    {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
