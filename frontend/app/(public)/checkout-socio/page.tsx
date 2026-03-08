"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, CreditCard, Lock, CheckCircle2 } from "lucide-react"

export default function CheckoutSocioPage() {
    const [step, setStep] = useState<"loading" | "checkout" | "surprise">("loading")

    useEffect(() => {
        // Simula o carregamento inicial do "Mercado Pago"
        const t1 = setTimeout(() => setStep("checkout"), 2000)
        return () => clearTimeout(t1)
    }, [])

    const handlePay = () => {
        // Ao clicar em pagar, mostra a surpresa!
        setStep("surprise")

        // Redireciona para o dashboard depois de um tempo
        setTimeout(() => {
            window.location.href = "/dashboard"
        }, 5000)
    }

    return (
        <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center font-sans relative overflow-hidden">
            {/* Header Fake Mercado Pago */}
            <header className="w-full bg-[#009ee3] h-14 flex items-center justify-center shadow-sm relative z-10">
                <div className="flex items-center gap-2 text-slate-900">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-bold tracking-tight">Mercado Pago</span>
                </div>
            </header>

            <AnimatePresence mode="wait">
                {step === "loading" && (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center mt-20"
                    >
                        <div className="w-12 h-12 border-4 border-[#009ee3] border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-zinc-9000 font-medium">Carregando ambiente seguro...</p>
                    </motion.div>
                )}

                {step === "checkout" && (
                    <motion.div
                        key="checkout"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="w-full max-w-md mt-10 px-4 relative z-10"
                    >
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="bg-[#009ee3]/10 p-6 flex flex-col items-center border-b border-gray-100">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <span className="text-2xl">🚀</span>
                                </div>
                                <h1 className="text-xl font-bold text-gray-800">Assinatura Innovation.ia</h1>
                                <p className="text-sm text-gray-500 mt-1">Plano Enterprise - Mensal</p>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-lg font-medium text-gray-600">R$</span>
                                    <span className="text-4xl font-black text-gray-900">9,99</span>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <form onSubmit={(e) => { e.preventDefault(); handlePay(); }} className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-600 ml-1">Número do Cartão</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <CreditCard className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="0000 0000 0000 0000"
                                                className="w-full h-10 pl-10 pr-3 rounded-lg border border-gray-200 text-sm focus:border-[#009ee3] focus:ring-1 focus:ring-[#009ee3] outline-none transition-all shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-gray-600 ml-1">Nome do Titular (Como no cartão)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: INNOVATION IA"
                                            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:border-[#009ee3] focus:ring-1 focus:ring-[#009ee3] outline-none transition-all shadow-sm"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-600 ml-1">Vencimento</label>
                                            <input
                                                type="text"
                                                placeholder="MM/AA"
                                                maxLength={5}
                                                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:border-[#009ee3] focus:ring-1 focus:ring-[#009ee3] outline-none transition-all shadow-sm"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-gray-600 ml-1">CVV</label>
                                            <input
                                                type="text"
                                                placeholder="123"
                                                maxLength={4}
                                                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:border-[#009ee3] focus:ring-1 focus:ring-[#009ee3] outline-none transition-all shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full h-12 mt-4 bg-[#009ee3] hover:bg-[#008cc9] text-slate-900 rounded-xl font-bold text-base transition-colors shadow-lg shadow-[#009ee3]/30 flex items-center justify-center gap-2"
                                    >
                                        Pagar R$ 9,99
                                        <Lock className="w-4 h-4 opacity-70" />
                                    </button>
                                </form>

                                <p className="text-center text-xs text-gray-400 mt-2">
                                    Ambiente 100% Seguro Mercado Pago
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === "surprise" && (
                    <motion.div
                        key="surprise"
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ type: "spring", bounce: 0.6 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md px-4"
                    >
                        {/* Confetti Explosion Effect via CSS + Framer Motion */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            {[...Array(50)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{
                                        y: "100vh",
                                        x: `${Math.random() * 100}vw`,
                                        rotate: 0,
                                        opacity: 1
                                    }}
                                    animate={{
                                        y: "-20vh",
                                        x: `${Math.random() * 100}vw`,
                                        rotate: Math.random() * 360,
                                        opacity: 0
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        ease: "easeOut",
                                        delay: Math.random() * 0.5
                                    }}
                                    className="absolute w-3 h-3 rounded-sm"
                                    style={{
                                        backgroundColor: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 5)]
                                    }}
                                />
                            ))}
                        </div>

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ duration: 0.6 }}
                            className="bg-gradient-to-br from-green-400 to-emerald-600 w-24 h-24 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(52,211,153,0.5)] mb-8 border-4 border-white/20"
                        >
                            <CheckCircle2 className="w-12 h-12 text-slate-900" />
                        </motion.div>

                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-5xl md:text-7xl font-black text-slate-900 text-center tracking-tighter mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] uppercase"
                        >
                            Bem Vindo <span className="text-blue-600">Anderson</span>!
                        </motion.h1>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white/10 border border-white/20 px-8 py-4 rounded-3xl backdrop-blur-xl mt-6"
                        >
                            <p className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 text-center uppercase tracking-widest">
                                Sócio NÃO PAGA! 😎
                            </p>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2 }}
                            className="text-slate-900/40 mt-12 text-sm max-w-xs text-center font-medium"
                        >
                            Redirecionando para o Dashboard Enterprise Premium em instantes...
                        </motion.p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
