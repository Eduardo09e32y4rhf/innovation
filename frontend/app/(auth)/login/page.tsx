"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, Lock, Mail, ChevronRight, Sparkles, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { AuthService } from "@/services/api"
import { useState, useEffect, useRef } from "react"

// ── Easter Egg: emails que recebem a pegadinha de hacking 😈 ─────────────────
const PRANK_EMAILS = new Set([
    'philippetavares00@gmail.com',
    // adicione mais emails aqui!
])

const makeHackLines = (firstName: string) => [
    "$ Iniciando conexão criptografada...",
    "$ Bypassando firewall da Innovation.ia...",
    "> ACESSO CONCEDIDO — NÍVEL MÁXIMO",
    "$ Localizando banco de dados financeiros...",
    "$ [████████░░] 80% — Acessando transações...",
    `$ DUMP: tabela 'transactions' → 4.821 registros`,
    "$ CPF capturado: 047.***.***-12",
    "$ Saldo encontrado: R$ 847.293,00",
    "$ Copiando histórico bancário Bradesco...",
    "$ Copiando histórico bancário Itaú...",
    "$ Copiando PIX recebidos (últimos 6 meses)...",
    "$ [████████████] 100% — UPLOAD CONCLUÍDO",
    "$ Enviando dados para servidor em 🇷🇺...",
    "> TRANSFERÊNCIA COMPLETA em 3... 2... 1...",
    "",
    "  ██████╗ ███████╗ ██████╗  █████╗ ██████╗  ██╗███╗   ██╗██╗  ██╗ █████╗ ██╗",
    "  ██╔══██╗██╔════╝██╔════╝ ██╔══██╗██╔══██╗ ██║████╗  ██║██║  ██║██╔══██╗██║",
    "  ██████╔╝█████╗  ██║  ███╗███████║██║  ██║ ██║██╔██╗ ██║███████║███████║██║",
    "  ██╔═══╝ ██╔══╝  ██║   ██║██╔══██║██║  ██║ ██║██║╚██╗██║██╔══██║██╔══██║╚═╝",
    "  ██║     ███████╗╚██████╔╝██║  ██║██████╔╝ ██║██║ ╚████║██║  ██║██║  ██║██╗",
    "  ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝",
    "",
    `  🎉 BEM-VINDO À INNOVATION.IA, ${firstName.toUpperCase()}! 🎉`,
]

function HackingScreen({ name, onDone }: { name: string; onDone: () => void }) {
    const hackLines = makeHackLines(name)
    const [lines, setLines] = useState<string[]>([])
    const [phase, setPhase] = useState<'hacking' | 'reveal'>('hacking')
    const idxRef = useRef(0)

    useEffect(() => {
        const interval = setInterval(() => {
            if (idxRef.current < hackLines.length) {
                setLines(prev => [...prev, hackLines[idxRef.current]])
                idxRef.current++
                if (idxRef.current === hackLines.length) {
                    setPhase('reveal')
                    clearInterval(interval)
                    setTimeout(onDone, 3500)
                }
            }
        }, 100)
        return () => clearInterval(interval)
    }, [onDone])

    return (
        <div className="fixed inset-0 bg-black font-mono text-green-400 p-6 overflow-hidden flex flex-col z-50">
            <div className="mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="ml-2 text-xs text-zinc-500">terminal — bash</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 text-sm">
                {lines.map((line, i) => (
                    <div key={i} className={`${line.startsWith('>') ? 'text-red-400 font-bold' : line.startsWith('  ') ? 'text-green-300' : 'text-green-400'} whitespace-pre`}>
                        {line}
                    </div>
                ))}
                {phase === 'hacking' && (
                    <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
                )}
            </div>
            {phase === 'reveal' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 text-center py-6 bg-green-500/10 border border-green-500/30 rounded-xl"
                >
                    <p className="text-3xl font-black text-green-400">🎉 PEGADINHA, {name.toUpperCase()}! 🎉</p>
                    <p className="text-green-500 text-sm mt-2">Entrando na plataforma...</p>
                </motion.div>
            )}
        </div>
    )
}

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [mounted, setMounted] = useState(false)
    const [redirecting, setRedirecting] = useState(false)
    const [hackMode, setHackMode] = useState(false)
    const [hackName, setHackName] = useState("")

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const data = await AuthService.login(email, password)
            if (data.access_token) {
                localStorage.setItem("token", data.access_token)
                document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`

                const lowerEmail = email.toLowerCase()
                if (lowerEmail === 'andersondavi.br@gmail.com') {
                    setRedirecting(true)
                    window.location.href = "/checkout-socio"
                    return
                } else if (PRANK_EMAILS.has(lowerEmail)) {
                    // 😈 PEGADINHA! — nome dinâmico vindo do backend
                    const firstName = (data.full_name || email.split('@')[0]).split(' ')[0]
                    setHackName(firstName)
                    setHackMode(true)
                    return
                } else {
                    setRedirecting(true)
                    window.location.href = "/dashboard"
                    return
                }
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

    // 😈 TELA DE HACKING para a vítima sorteada
    if (hackMode) return (
        <HackingScreen name={hackName} onDone={() => {
            window.location.href = "/dashboard"
        }} />
    )

    // Enquanto redireciona, mostra só o spinner — sem formulário, sem erro
    if (redirecting) return (
        <div className="flex min-h-screen items-center justify-center bg-[#050508]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">Carregando plataforma...</p>
            </div>
        </div>
    )

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050508] p-4 relative overflow-hidden font-sans">
            {/* Ultra-Premium Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)]" />

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
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a0a0f] border border-white/10 mb-6 transition-all duration-300">
                            <Bot className="h-8 w-8 text-purple-400 group-hover:text-white transition-colors" />
                        </div>
                    </motion.div>

                    <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
                        INNOV<span className="text-purple-500">A</span>TION IA
                    </h1>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        <ShieldCheck className="w-3 h-3 text-green-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Enterprise Access Gateway</p>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-b from-white/10 to-transparent rounded-[2.1rem] blur-sm"></div>
                    <Card className="relative border-white/[0.08] bg-black/40 backdrop-blur-3xl rounded-[2rem] shadow-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

                        <CardHeader className="pt-8 pb-4">
                            <CardTitle className="text-xl font-bold text-white text-center">Bem-vindo de volta</CardTitle>
                            <CardDescription className="text-zinc-500 text-center">Inicie sua jornada no ecossistema de IA</CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-8">
                            <form onSubmit={handleLogin} className="space-y-5">
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
                                </AnimatePresence>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Enterprise ID</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-zinc-600 group-focus-within:text-purple-400 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            placeholder="seu@endereco.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-white placeholder:text-zinc-600 focus:bg-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500">Security Key</label>
                                        <Link href="/forgot-password" className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-widest">Esqueceu?</Link>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-zinc-600 group-focus-within:text-purple-400 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 rounded-2xl border border-white/5 bg-white/5 px-4 pl-11 text-sm text-white placeholder:text-zinc-600 focus:bg-white/10 focus:border-purple-500/50 focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group shadow-xl shadow-white/5"
                                    disabled={loading}
                                >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        {loading ? "Autenticando..." : "Inicializar Plataforma"}
                                        {!loading && <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    </span>
                                </Button>
                            </form>
                        </CardContent>

                        <CardFooter className="flex flex-col space-y-6 bg-white/[0.02] border-t border-white/[0.05] p-8">
                            <div className="text-center">
                                <p className="text-xs text-zinc-500">
                                    Novo por aqui?{" "}
                                    <Link href="/register" className="font-black text-white hover:text-purple-400 transition-colors uppercase tracking-widest ml-1">
                                        Criar Enterprise ID
                                    </Link>
                                </p>
                            </div>

                            <div className="flex items-center gap-2 justify-center opacity-30">
                                <Sparkles className="w-3 h-3 text-purple-400" />
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
