"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { motion } from "framer-motion"
import { Activity, BarChart3, Bot, Calendar, Clock, DollarSign, Target, TrendingUp, Users } from "lucide-react"

export default function DashboardPage() {
    const stats = [
        {
            title: "Vagas Ativas",
            value: "12",
            change: "+2 essa semana",
            icon: Target,
            color: "text-purple-500",
        },
        {
            title: "Candidatos",
            value: "458",
            change: "+24% vs mês anterior",
            icon: Users,
            color: "text-blue-500",
        },
        {
            title: "Entrevistas",
            value: "24",
            change: "Agendadas para hoje",
            icon: Calendar,
            color: "text-pink-500",
        },
        {
            title: "Receita (YTD)",
            value: "R$ 1.2M",
            change: "+12% meta batida",
            icon: DollarSign,
            color: "text-green-500",
        },
    ]

    const recent_activity = [
        {
            user: "IA Recrutadora",
            action: "Analisou 150 currículos para Dev Python",
            time: "2 min atrás",
            icon: Bot
        },
        {
            user: "João Silva",
            action: "Agendou entrevista com Candidato #42",
            time: "15 min atrás",
            icon: Calendar
        },
        {
            user: "Sistema",
            action: "Backup automático concluído",
            time: "1 hora atrás",
            icon: Activity
        },
        {
            user: "Superintendente",
            action: "Otimizou queries do banco de dados",
            time: "2 horas atrás",
            icon: TrendingUp
        }
    ]

    return (
        <div className="min-h-screen bg-black">
            <Navbar />

            <main className="container mx-auto px-4 pt-24 pb-12">
                <div className="flex flex-col space-y-8">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Enterprise</h1>
                            <p className="text-zinc-400">Visão geral em tempo real das operações.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button>Novo Relatório</Button>
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
                                <Card className="border-zinc-800 bg-zinc-900/50">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-zinc-200">
                                            {stat.title}
                                        </CardTitle>
                                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                                        <p className="text-xs text-zinc-500">{stat.change}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main Content Areas */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        {/* Chart Area (Mock) */}
                        <Card className="col-span-4 border-zinc-800 bg-zinc-900/50">
                            <CardHeader>
                                <CardTitle>Crescimento da Plataforma</CardTitle>
                                <CardDescription>Usuários ativos nos últimos 6 meses</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[300px] flex items-end justify-between px-4 pb-4 space-x-2">
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
                                <CardTitle>Atividade Recente da IA</CardTitle>
                                <CardDescription>Ações autônomas do sistema</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    {recent_activity.map((item, i) => (
                                        <div className="flex items-center" key={i}>
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
                                                <item.icon className="h-4 w-4 text-purple-500" />
                                            </div>
                                            <div className="ml-4 space-y-1">
                                                <p className="text-sm font-medium leading-none text-white">{item.user}</p>
                                                <p className="text-sm text-zinc-400">{item.action}</p>
                                            </div>
                                            <div className="ml-auto font-medium text-xs text-zinc-500">{item.time}</div>
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
