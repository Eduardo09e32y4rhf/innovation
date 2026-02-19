'use client';

import { Sidebar } from '../../components/Sidebar';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Activity, Bot, Calendar, DollarSign, Target, TrendingUp, Users } from "lucide-react"
import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [metricsRes, activityRes] = await Promise.all([
                    api.get('/dashboard/metrics'),
                    api.get('/dashboard/recent-activity')
                ]);
                setMetrics(metricsRes.data);
                setActivities(activityRes.data.activities);
            } catch (e) {
                console.error("Failed to load dashboard data", e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const stats = [
        {
            title: "Receita Mensal",
            value: metrics ? formatCurrency(metrics.revenue.current) : "R$ 0,00",
            change: metrics ? `${metrics.revenue.change_percent}% vs mês anterior` : "...",
            icon: DollarSign,
            color: "text-green-500",
        },
        {
            title: "Custo Operacional",
            value: metrics ? formatCurrency(metrics.costs.current) : "R$ 0,00",
            change: metrics ? `${metrics.costs.change_percent}% vs mês anterior` : "...",
            icon: TrendingUp, // Using TrendingUp for costs usually implies up is bad, but icon choice is generic
            color: "text-red-500",
        },
        {
            title: "Lucro Líquido",
            value: metrics ? formatCurrency(metrics.profit.current) : "R$ 0,00",
            change: metrics ? `Margem: ${metrics.profit.margin_percent.toFixed(1)}%` : "...",
            icon: Target,
            color: "text-emerald-500",
        },
        {
            title: "Vagas Ativas",
            value: "12", // This is still hardcoded in backend metrics for now, so keeping static or need to add to metrics
            change: "+2 essa semana",
            icon: Users,
            color: "text-blue-500",
        },
    ]

    return (
        <div className="flex bg-[#0a0a0f] min-h-screen text-white">
            <Sidebar />

            <main className="flex-1 ml-[280px] p-8">
                <div className="flex flex-col space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dashboard Enterprise</h1>
                            <p className="text-zinc-400">Visão geral em tempo real das operações.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button className="bg-purple-600 hover:bg-purple-700">Novo Relatório</Button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <Card className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-zinc-200">
                                            {stat.title}
                                        </CardTitle>
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

                    {/* Main Content Areas */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Chart Area (Mock for UI, but could use metrics.revenue.chart_data) */}
                        <Card className="col-span-4 border-zinc-800 bg-zinc-900/50">
                            <CardHeader>
                                <CardTitle className="text-white">Crescimento da Plataforma</CardTitle>
                                <CardDescription className="text-zinc-400">Usuários ativos nos últimos 6 meses</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px] flex items-end justify-between px-4 pb-4 space-x-2">
                                    {/* Using mock heights for visual consistency, ideally map metrics.revenue.chart_data */}
                                    {[30, 45, 60, 50, 70, 85, 95].map((h, i) => (
                                        <div key={i} className="w-full bg-purple-500/20 hover:bg-purple-500/40 transition-colors rounded-t-sm relative group">
                                            <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-purple-600 rounded-t-sm"></div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="col-span-3 border-zinc-800 bg-zinc-900/50">
                            <CardHeader>
                                <CardTitle className="text-white">Atividade Recente</CardTitle>
                                <CardDescription className="text-zinc-400">Ações do sistema e usuários</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {loading ? <p className="text-sm text-zinc-500">Carregando atividades...</p> :
                                     activities.map((item, i) => (
                                        <div className="flex items-center" key={i}>
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                                                {item.type === 'application' ? <Users className="h-4 w-4 text-blue-500" /> :
                                                 item.type === 'interview' ? <Calendar className="h-4 w-4 text-purple-500" /> :
                                                 <Activity className="h-4 w-4 text-green-500" />}
                                            </div>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none text-white">{item.message}</p>
                                                <p className="text-xs text-zinc-400">{item.candidate_name || "Sistema"}</p>
                                            </div>
                                            {/* Timestamp would need formatting */}
                                            <div className="ml-auto font-medium text-xs text-zinc-500">Hoje</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    )
}
