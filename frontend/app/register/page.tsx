"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { Bot, Lock, Mail, User, Building2, CreditCard } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function RegisterPage() {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        company_name: "",
        cnpj: "",
        role: "company" // Default to company as requested "Innovation Enterprise"
    })
    const [error, setError] = useState("")

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleGoogleLogin = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/google-login`)
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            }
        } catch (err) {
            console.error("Google Auth Error", err)
            setError("Erro ao iniciar login com Google")
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || "Erro ao criar conta")
            }

            // Success - Redirect to login or dashboard (if auto-login implemented)
            window.location.href = "/login?registered=true"
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
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
                        {error && <div className="mb-4 p-3 rounded bg-red-500/20 text-red-400 text-sm">{error}</div>}

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        name="name"
                                        type="text"
                                        placeholder="João Silva"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                        required
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">Empresa</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                        <input
                                            name="company_name"
                                            type="text"
                                            placeholder="Acme Corp"
                                            className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-300">CNPJ</label>
                                    <div className="relative">
                                        <CreditCard className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                        <input
                                            name="cnpj"
                                            type="text"
                                            placeholder="00.000.000/0001-00"
                                            className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Email Corporativo</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        name="email"
                                        type="email"
                                        placeholder="voce@empresa.com"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                        required
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <input
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 pl-9 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                        required
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700" disabled={loading}>
                                {loading ? "Criando Conta..." : "Inicializar Acesso"}
                            </Button>

                            <div className="text-center text-xs text-zinc-500 mt-4">
                                Ao continuar, você concorda com nossos <Link href="/terms" className="text-purple-400 hover:underline">Termos</Link> e <Link href="/rules" className="text-purple-400 hover:underline">Regras</Link>.
                            </div>
                        </form>

                        <div className="mt-4 relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-zinc-900 px-2 text-zinc-500">Ou continue com</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            className="w-full mt-4 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300"
                            onClick={handleGoogleLogin}
                        >
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Google
                        </Button>
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
