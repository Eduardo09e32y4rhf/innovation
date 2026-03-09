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
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm font-medium">Carregando plataforma...</p>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative overflow-hidden font-sans">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-100/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
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
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-slate-200 mb-6 shadow-sm transition-all duration-300">
                            <Bot className="h-8 w-8 text-blue-600 transition-colors" />
                        </div>
                    </motion.div>

                    <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">
                        INNOV<span className="text-blue-600">A</span>TION IA
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm">
                        <ShieldCheck className="w-3 h-3 text-blue-600" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enterprise Access Gateway</p>
                    </div>
                </div>

                <div className="relative">
                    <Card className="relative border-slate-200 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

                        <CardHeader className="pt-10 pb-4">
                            <CardTitle className="text-2xl font-black text-slate-900 text-center tracking-tight">Bem-vindo de volta</CardTitle>
                            <CardDescription className="text-slate-500 text-center font-medium mt-1">Inicie sua jornada no ecossistema de IA</CardDescription>
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
                                    <label className="text-[10px] uppercase tracking-widest font-black text-slate-500 ml-1">Enterprise ID</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="seu@endereco.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-slate-500">Security Key</label>
                                        <Link href="/forgot-password" university-bold className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">Esqueceu?</Link>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 pl-11 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 bg-slate-900 text-white hover:bg-slate-800 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group shadow-xl shadow-slate-200"
                                    disabled={loading}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Autenticando..." : "Inicializar Plataforma"}
                                        {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-6 bg-slate-50 p-8">
                            <div className="text-center">
                                <p className="text-xs text-slate-500 font-medium">
                                    Novo por aqui?{" "}
                                    <Link href="/register" className="font-black text-slate-900 hover:text-blue-600 transition-colors uppercase tracking-widest ml-1">
                                        Criar Enterprise ID
                                    </Link>
                                </p>
                            </div>

                            <div className="flex items-center gap-2 justify-center opacity-60">
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-400">NextGen OS Integrated</span>
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
