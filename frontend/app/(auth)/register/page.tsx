"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Lock, Mail, User, ChevronRight, Sparkles, ShieldCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/services/api"
import { useState, useEffect } from "react"

export default function RegisterPage() {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await AuthService.register({
                name,
                email,
                password,
                role: "candidate"
            })
            setSuccess(true)
            setTimeout(() => {
                window.location.href = "/login"
            }, 2000)
        } catch (err: any) {
            console.error("Register error:", err)
            setError(err.response?.data?.detail || "Erro ao criar conta. Verifique os dados e tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 relative overflow-hidden font-sans">
            {/* Ultra-Premium Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.05)_0%,transparent_70%)]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] bg-[grid-white-pattern] [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"
                    style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="z-10 w-full max-w-md"
            >
                <div className="mb-10 text-center flex flex-col items-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                        className="group relative"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a0a0f] border border-white/10 mb-6 transition-all duration-300">
                            <Bot className="h-8 w-8 text-pink-400 group-hover:text-slate-900 transition-colors" />

                        </div>
                    </motion.div>

                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">
                        INNOV<span className="text-pink-500">A</span>TION IA
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border-slate-200 border-black/5 shadow-sm/5 border-white/10">
                        <ShieldCheck className="w-3 h-3 text-blue-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Enterprise Registration</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2.1rem] blur-sm"></div>
                    <Card className="relative border-white/[0.08] bg-white/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pink-500/50 to-transparent" />

                        <CardHeader className="pt-8 pb-4">
                            <CardTitle className="text-xl font-bold text-slate-900 text-center">Criar Enterprise ID</CardTitle>
                            <CardDescription className="text-zinc-9000 text-center">Junte-se ao ecossistema de elite da Innovation.ia</CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-8">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <AnimatePresence mode="wait">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-500/10 border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 mb-2"
                                        >
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}
                                    {success && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-green-500/10 border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 mb-2"
                                        >
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                                            Conta criada! Inicializando gateway de login...
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-9000 ml-1">Nome Completo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-zinc-600 group-focus-within:text-pink-400 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Ex: João Silva"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full h-11 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-slate-900 placeholder:text-zinc-600 focus:bg-white/10 focus:border-pink-500/50 focus:outline-none transition-all"

                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-9000 ml-1">Email Corporativo</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-zinc-600 group-focus-within:text-pink-400 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="voce@empresa.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-11 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-slate-900 placeholder:text-zinc-600 focus:bg-white/10 focus:border-pink-500/50 focus:outline-none transition-all"

                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-9000 ml-1">Security Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-zinc-600 group-focus-within:text-pink-400 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-11 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-slate-900 placeholder:text-zinc-600 focus:bg-white/10 focus:border-pink-500/50 focus:outline-none transition-all"

                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 bg-white text-slate-900 hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group shadow-xl shadow-white/5 mt-4"

                                    disabled={loading || success}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Processando..." : "Registrar Credencial"}
                                        {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-6 bg-white border-slate-200 border-black/5 shadow-sm/[0.02] border-t border-white/[0.05] p-8">
                            <div className="text-center">
                                <Link href="/login" className="inline-flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-slate-900 transition-colors uppercase tracking-widest group/link">
                                    <ArrowLeft className="w-3 h-3 group-hover/link:-translate-x-1 transition-transform" />
                                    Voltar para o Login
                                </Link>
                            </div>

                            <div className="flex items-center gap-2 justify-center opacity-30">
                                <Sparkles className="w-3 h-3 text-pink-400" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">NextGen Data Protection</span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <p className="mt-8 text-center text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-medium opacity-50">
                    Sua privacidade é nossa prioridade absoluta.
                </p>
            </motion.div>
        </div>
    )
}
