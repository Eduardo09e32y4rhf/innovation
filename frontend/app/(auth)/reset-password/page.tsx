"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Lock, ChevronRight, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/services/api"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function ResetPasswordForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const token = searchParams.get("token")

    const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [message, setMessage] = useState("")
    const [error, setError] = useState("")
    const [mounted, setMounted] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (!token && mounted) {
            setError("Token de redefinição ausente. Por favor, solicite um novo link.")
        }
    }, [token, mounted])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.")
            return
        }

        setLoading(true)
        setError("")
        setMessage("")

        try {
            await AuthService.resetPassword({ token: token || "", password })
            setMessage("Senha redefinida com sucesso! Redirecionando para o login...")
            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } catch (err: any) {
            console.error("Reset password error:", err)
            setError(err.response?.data?.detail || "Erro ao redefinir senha. O link pode ter expirado.")
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 relative overflow-hidden font-sans">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
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
                            <ShieldCheck className="h-8 w-8 text-purple-400 group-hover:text-white transition-colors" />
                        </div>
                    </motion.div>

                    <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
                        NOVA <span className="text-purple-500">S</span>ENHA
                    </h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Security Credential Update</p>
                </div>

                <div className="relative">
                    <Card className="relative border-white/[0.08] bg-black/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-hidden">
                        <CardHeader className="pt-8 pb-4">
                            <CardTitle className="text-xl font-bold text-white text-center">Atualize seu acesso</CardTitle>
                            <CardDescription className="text-zinc-500 text-center px-4">Crie uma nova senha forte para proteger sua conta.</CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-8">
                            <form onSubmit={handleReset} className="space-y-5">
                                <AnimatePresence mode="wait">
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 mb-2"
                                        >
                                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}
                                    {message && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2 mb-2"
                                        >
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0" />
                                            {message}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Nova Security Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-zinc-600 group-focus-within:text-purple-400 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-white placeholder:text-zinc-600 focus:bg-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-600 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Confirmar Security Key</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-zinc-600 group-focus-within:text-purple-400 transition-colors" />
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-white placeholder:text-zinc-600 focus:bg-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group shadow-xl shadow-white/5"
                                    disabled={loading || !!message || !token}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Processando..." : "Redefinir Senha"}
                                        {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-6 bg-white/[0.02] border-t border-white/[0.05] p-8">
                            <div className="text-center">
                                <Link href="/login" className="inline-flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar para o login
                                </Link>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </motion.div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050508] text-white/50 text-xs uppercase tracking-[0.2em]">Iniciando protocolo de segurança...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}
