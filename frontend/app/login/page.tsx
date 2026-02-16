"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Bot, Lock, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function LoginPage() {
    const [loading, setLoading] = useState(false)

    const handleLogin = (e: React.FormEvent) => {
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
                <div className="absolute top-10 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px]" />
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
                    <p className="text-zinc-400">Acesse o sistema operacional do futuro</p>
                </div>

                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle>Bem-vindo de volta</CardTitle>
                        <CardDescription>Entre com suas credenciais corporativas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        type="email"
                                        placeholder="seu@email.com"
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
                            <Button className="w-full" disabled={loading}>
                                {loading ? "Autenticando..." : "Entrar na Plataforma"}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 border-t border-zinc-800 pt-6">
                        <div className="text-center text-sm text-zinc-400">
                            Não tem uma conta?{" "}
                            <Link href="/register" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
                                Criar Enterprise ID
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
