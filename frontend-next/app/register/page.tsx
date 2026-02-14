"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Bot, Lock, Mail, User } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function RegisterPage() {
    const [loading, setLoading] = useState(false)

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            window.location.href = "/dashboard"
        }, 1500)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-black p-4 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-10 left-10 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="z-10 w-full max-w-md"
            >
                <div className="mb-8 text-center flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-lg shadow-purple-500/20">
                        <Bot className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Innovation.ia Enterprise</h1>
                    <p className="text-zinc-400">Crie sua credencial de acesso global</p>
                </div>

                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle>Nova Conta Enterprise</CardTitle>
                        <CardDescription>Junte-se à revolução da IA Corporativa.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="João Silva"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Email Corporativo</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        type="email"
                                        placeholder="voce@empresa.com"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                        required
                                    />
                                </div>
                            </div>
                            <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700" disabled={loading}>
                                {loading ? "Criando Conta..." : "Inicializar Acesso"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 border-t border-zinc-800 pt-6">
                        <div className="text-center text-sm text-zinc-400">
                            Já possui credenciais?{" "}
                            <Link href="/login" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                                Fazer Login
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
