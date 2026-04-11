"use client"

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Globe,
    Fingerprint,
    Zap,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { AuthService } from "@/services/api"

/**
 * LOGIN ENTERPRISE ELITE - INNOVATION.IA
 * Estética: White Panel / High Authority
 * Destaques: Azul Cobalto e Sombras de Texto (Text Shadows)
 * Experiência: Dinâmica, limpa e extremamente profissional.
 */

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [mounted, setMounted] = useState(false);
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Limpa sessão anterior antes de novo login
            localStorage.removeItem("token");
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            const data = await AuthService.login({ email, password });
            if (data.access_token) {
                localStorage.setItem("token", data.access_token);
                document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
                setRedirecting(true);
                window.location.href = "/dashboard";
                return;
            }
        } catch (err: any) {
            const axiosErr = err as { response?: { data?: { detail?: string }; status?: number } };
            const detail = axiosErr?.response?.data?.detail;
            if (detail) {
                setError(detail);
            } else if (axiosErr?.response?.status === 401) {
                setError("Credenciais inválidas. Verifique seu email e senha.");
            } else {
                setError("Erro de conexão. Tente novamente em alguns instantes.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    if (redirecting) return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans tracking-tight">
            <div className="flex flex-col items-center gap-6">
                <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-100" />
                <div className="text-center">
                    <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-[10px] mb-1">Acesso Autorizado</p>
                    <p className="text-slate-400 font-bold text-xs">Inicializando Protocolos Enterprise...</p>
                </div>
            </div>
        </div>
    );

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
                    {/* LOGO AREA - ALTA RESPONSABILIDADE */}
                    <div className="text-center mb-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-xl mb-6 animate-float">
                            <Zap className="text-blue-600 fill-blue-600" size={36} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-shadow-elite">
                            INNOV<span className="text-blue-600 text-shadow-blue">A</span>TION IA
                        </h1>
                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                            <ShieldCheck size={14} className="text-blue-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Secure Enterprise Gateway</span>
                        </div>
                    </div>

                    {/* CARD DE LOGIN BRANCO (ESTILO PAINEL) */}
                    <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-slate-100 login-card-shadow relative">

                        {/* DETALHE AZUL DE ACENTO */}
                        <div className="absolute top-12 left-0 w-1.5 h-12 bg-blue-600 rounded-r-full"></div>

                        <div className="mb-10">
                            <h2 className="text-2xl font-black text-slate-900 text-shadow-elite italic">Bem-vindo de volta</h2>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Inicie a sua jornada de IA</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">

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
                            </AnimatePresence>

                            {/* ENTERPRISE ID */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enterprise ID</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
                                        <User size={20} />
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        placeholder="exemplo@empresa.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all text-slate-700 font-bold placeholder:text-slate-300 shadow-inner"
                                    />
                                </div>
                            </div>

                            {/* SECURITY KEY */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Security Key</label>
                                    <Link href="/forgot-password" disabled={loading} className="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">Esqueceu?</Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all text-slate-700 font-bold placeholder:text-slate-300 shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* BOTÃO PRINCIPAL DINÂMICO */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full mt-4 group relative overflow-hidden py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-70 bg-blue-600 text-white shadow-xl shadow-blue-200"
                            >
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Inicializar Plataforma
                                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </span>
                                {/* Efeito de brilho hover */}
                                <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>

                        </form>

                        {/* RODAPÉ DO CARD */}
                        <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center gap-6">
                            <Link href="/register" className="text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">
                                Novo por aqui? <span className="text-blue-600 border-b-2 border-blue-600/30 ml-1 uppercase">CRIAR ENTERPRISE ID</span>
                            </Link>

                            <div className="flex gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                                <div className="flex items-center gap-1.5">
                                    <Fingerprint size={14} className="text-slate-600" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Biometric Auth</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Activity size={14} className="text-slate-600" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Real-time Node</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Globe size={14} className="text-slate-600" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">V6.0 Secure</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* FOOTER EXTERNO */}
                    <p className="text-center mt-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                        © 2026 INNOVATION SOFTWARE COMPANY • PROTOCOLO V6
                    </p>
                </motion.div>
            </div>

        </div>
    );
}
