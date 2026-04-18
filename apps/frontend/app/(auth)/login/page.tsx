"use client"

import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Zap,
    MoveRight,
    Github,
    Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { AuthService } from "@/services/api"

/**
 * INNOVATION.IA — ENTERPRISE LOGIN v2.0
 * Arquitetura renovada: Estrutura clássica de 2 colunas com estética Glassmorphism Premium.
 * Bypassa o gateway congestionado e foca na confiabilidade operacional.
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
            // Limpeza de segurança preemptiva
            localStorage.removeItem("token");
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

            const data = await AuthService.login({ email, password });
            
            if (data.access_token) {
                localStorage.setItem("token", data.access_token);
                // Cookie para SSR / Middleware
                document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
                
                setRedirecting(true);
                // Delay sutil para feedback visual Premium
                setTimeout(() => {
                    window.location.href = "/dashboard";
                }, 800);
                return;
            }
        } catch (err: any) {
            console.error("Login capture:", err);
            const msg = err?.message || "Erro desconhecido";
            
            if (msg.includes("401")) {
                setError("Credenciais inválidas. Verifique seu acesso.");
            } else if (msg.includes("fetch")) {
                setError("Servidor indisponível (Gateway Timeout). Tente novamente.");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-blue-100 selection:text-blue-900">
            
            {/* COLUNA ESQUERDA: VISUAL & BRANDING (Oculto em Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0F172A] relative overflow-hidden items-center justify-center p-12">
                {/* Efeitos de fundo (Ambient Light) */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px]" />
                
                {/* Grade Decorativa */}
                <div className="absolute inset-0 opacity-[0.03]" 
                    style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
                />

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-lg"
                >
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-900/40 mb-8">
                        <Zap className="text-white fill-white" size={32} />
                    </div>
                    
                    <h2 className="text-5xl font-black text-white leading-tight tracking-tighter mb-6">
                        A Próxima Geração da <br/>
                        <span className="text-blue-500">Inteligência Corporativa</span>.
                    </h2>
                    
                    <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
                        Unifique seu ecossistema, automatize processos pesados e tome decisões baseadas em dados com o OS de IA mais avançado do mercado.
                    </p>

                    <div className="flex items-center gap-6">
                        <div className="flex -space-x-3">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#0F172A] bg-slate-800" />
                            ))}
                        </div>
                        <p className="text-slate-500 text-sm font-bold">
                            +500 Empresas utilizam a Innovation.ia
                        </p>
                    </div>
                </motion.div>

                {/* Badge Version no canto inferior */}
                <div className="absolute bottom-10 left-12 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">System v2.4.0 Stable</span>
                </div>
            </div>

            {/* COLUNA DIREITA: FORMULÁRIO DE LOGIN */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white lg:bg-transparent">
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[440px]"
                >
                    {/* Header Mobile Only Logo */}
                    <div className="lg:hidden flex justify-center mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Zap className="text-white" size={24} />
                        </div>
                    </div>

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Login Corporativo</h1>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Acesse sua instância Innovation.ia</p>
                    </div>

                    {/* Alerta de Erro */}
                    <AnimatePresence>
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-6 overflow-hidden"
                            >
                                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                                    <p className="text-red-600 text-[11px] font-black uppercase tracking-tight leading-none">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Login Success State */}
                    {redirecting ? (
                        <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2.5rem] text-center">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <h3 className="text-blue-900 font-black text-sm uppercase tracking-widest">Autenticado</h3>
                            <p className="text-blue-600/60 text-xs font-bold mt-1">Sincronizando Workspace...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-5">
                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">E-mail Empresarial</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
                                        <User size={18} />
                                    </div>
                                    <input 
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all text-slate-700 font-bold placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Chave de Segurança</label>
                                    <Link href="/forgot-password" disabled={loading} className="text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">Recuperar</Link>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
                                        <Lock size={18} />
                                    </div>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 focus:bg-white transition-all text-slate-700 font-bold placeholder:text-slate-300"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="flex items-center gap-2 px-1">
                                <input type="checkbox" id="remember" className="rounded border-slate-200 text-blue-600 focus:ring-blue-500" />
                                <label htmlFor="remember" className="text-xs font-bold text-slate-500 cursor-pointer">Lembrar nesta máquina</label>
                            </div>

                            {/* Submit Button */}
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Entrar no Sistema
                                        <MoveRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer / Links Extras */}
                    <div className="mt-10 pt-10 border-t border-slate-100 flex flex-col items-center gap-6">
                        <Link href="/register" className="text-xs font-bold text-slate-400 group">
                            Ainda não tem conta? <span className="text-blue-600 group-hover:underline">Criar Enterprise ID</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            <button className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-400">
                                <Github size={20} />
                            </button>
                            <button className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors text-slate-400">
                                <Twitter size={20} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Copyright Floating on corner */}
            <p className="hidden lg:block absolute bottom-8 right-8 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
                © 2026 Innovation Software Company
            </p>
        </div>
    );
}
