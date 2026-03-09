"use client"

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Mail,
    ArrowRight,
    Zap,
    ArrowLeft,
    Lock,
    Fingerprint,
    Activity,
    Globe
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { AuthService } from "@/services/api"

/**
 * FORGOT PASSWORD ENTERPRISE ELITE - INNOVATION.IA
 * Estética: White Panel / High Authority
 */

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const data = await AuthService.forgotPassword(email);
            setMessage(data.message || "Se o e-mail estiver cadastrado, você receberá instruções de recuperação.");
        } catch (err: any) {
            console.error("Forgot password error:", err);
            setError(err.response?.data?.detail || "Erro ao processar solicitação. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans relative overflow-hidden selection:bg-blue-100 selection:text-blue-900">

            {/* CSS CUSTOMIZADO PARA SOMBRAS DE TEXTO E ANIMAÇÕES */}
            <style jsx global>{`
        .text-shadow-elite {
          text-shadow: 2px 3px 6px rgba(0, 0, 0, 0.15);
        }
        .text-shadow-blue {
          text-shadow: 0px 4px 12px rgba(37, 99, 235, 0.4);
        }
        .login-card-shadow {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.02);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>

            {/* ELEMENTOS DINÂMICOS DE FUNDO */}
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-indigo-100/50 rounded-full blur-[100px]"></div>

            <div className="relative z-10 w-full max-w-[460px]">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                >
                    {/* LOGO AREA */}
                    <div className="text-center mb-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-xl mb-6 animate-float">
                            <Lock className="text-blue-600 fill-blue-600/10" size={36} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-shadow-elite uppercase">
                            Recuperar <span className="text-blue-600 text-shadow-blue">A</span>cesso
                        </h1>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                            <ShieldCheck size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Security Recovery Protocol</span>
                        </div>
                    </div>

                    {/* CARD DE RECUPERAÇÃO */}
                    <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-slate-100 login-card-shadow relative">

                        <div className="absolute top-12 left-0 w-1.5 h-12 bg-blue-600 rounded-r-full"></div>

                        <div className="mb-10">
                            <h2 className="text-2xl font-black text-slate-900 text-shadow-elite italic">Esqueceu sua chave?</h2>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Insira seu e-mail para continuar</p>
                        </div>

                        <form onSubmit={handleResetRequest} className="space-y-6">

                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 mb-2"
                                    >
                                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shrink-0" />
                                        {error}
                                    </motion.div>
                                )}
                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 mb-2"
                                    >
                                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse shrink-0" />
                                        {message}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* EMAIL */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enterprise Email</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
                                        <Mail size={20} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        placeholder="email@empresa.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all text-slate-700 font-bold placeholder:text-slate-300 shadow-inner"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !!message}
                                className="w-full mt-4 group relative overflow-hidden py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-70 bg-blue-600 text-white shadow-xl shadow-blue-200"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Solicitar Redefinição
                                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>

                        </form>

                        <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center gap-6">
                            <Link href="/login" className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest group/back">
                                <ArrowLeft size={16} className="group-hover/back:-translate-x-1 transition-transform" />
                                Voltar para o <span className="text-blue-600 border-b-2 border-blue-600/30 ml-1">LOGIN</span>
                            </Link>
                        </div>

                    </div>

                    <p className="text-center mt-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                        © 2026 INNOVATION SOFTWARE COMPANY • PROTOCOLO V6
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
