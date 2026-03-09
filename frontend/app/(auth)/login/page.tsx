"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Lock, Mail, ChevronRight, Sparkles, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/services/api"
import { useState, useEffect } from "react"

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [mounted, setMounted] = useState(false)
    const [redirecting, setRedirecting] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            // Limpa sessão anterior antes de novo login
            localStorage.removeItem("token")
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'

            const data = await AuthService.login(email, password)
            if (data.access_token) {
                localStorage.setItem("token", data.access_token)
                document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`
                setRedirecting(true)
                window.location.href = "/dashboard"
                return
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } }
            const detail = axiosErr?.response?.data?.detail
            if (detail) {
                setError(detail)
            } else if (axiosErr?.response?.status === 401) {
                setError("Credenciais inválidas. Verifique seu email e senha.")
            } else {
                setError("Erro de conexão. Tente novamente em alguns instantes.")
            }
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    // Spinner durante redirecionamento
    if (redirecting) return (
        <div className="flex min-h-screen items-center justify-center bg-[#050508]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Carregando plataforma...</p>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 relative overflow-hidden font-sans">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)]" />
                <div className="absolute inset-0 opacity-[0.03]"
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
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a0a0f] border border-white/10 mb-6 transition-all duration-300">
                            <Bot className="h-8 w-8 text-blue-600 group-hover:text-slate-900 transition-colors" />

                        </div>
                    </motion.div>

                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">
                        INNOV<span className="text-blue-500">A</span>TION IA
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border-slate-200 border-black/5 shadow-sm/5 border-white/10">
                        <ShieldCheck className="w-3 h-3 text-green-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Enterprise Access Gateway</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2.1rem] blur-sm"></div>
                    <Card className="relative border-white/[0.08] bg-white/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

                        <CardHeader className="pt-8 pb-4">
                            <CardTitle className="text-xl font-bold text-slate-900 text-center">Bem-vindo de volta</CardTitle>
                            <CardDescription className="text-zinc-9000 text-center">Inicie sua jornada no ecossistema de IA</CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-8">
                            <form onSubmit={handleLogin} className="space-y-5">
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
                                </AnimatePresence>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-9000 ml-1">Enterprise ID</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-zinc-600 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="seu@endereco.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-slate-900 placeholder:text-zinc-600 focus:bg-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"

                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-zinc-9000">Security Key</label>
                                        <Link href="/forgot-password" className="text-[10px] font-bold text-blue-600 hover:text-blue-500 transition-colors uppercase tracking-widest">Esqueceu?</Link>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-zinc-600 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-slate-900 placeholder:text-zinc-600 focus:bg-white/10 focus:border-blue-500/50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"

                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 bg-white text-slate-900 hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group shadow-xl shadow-white/5"

                                    disabled={loading}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Autenticando..." : "Inicializar Plataforma"}
                                        {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-6 bg-white border-slate-200 border-black/5 shadow-sm/[0.02] border-t border-white/[0.05] p-8">
                            <div className="text-center">
                                <p className="text-xs text-zinc-9000">
                                    Novo por aqui?{" "}
                                    <Link href="/register" className="font-black text-slate-900 hover:text-blue-600 transition-colors uppercase tracking-widest ml-1">
                                        Criar Enterprise ID
                                    </Link>
                                </p>
                            </div>

                            <div className="flex items-center gap-2 justify-center opacity-30">
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-zinc-400">NextGen OS Integrated</span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <p className="mt-8 text-center text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-medium opacity-50">
                    &copy; 2026 Innovation.ia &bull; Security Protocol v4.2.0
                </p>
            </motion.div>
        </div>
    )
}
