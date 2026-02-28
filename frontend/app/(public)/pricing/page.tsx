'use client';

import { motion } from 'framer-motion';
import { Check, Zap, Building2, Rocket } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PaymentService } from '@/services/api';

const plans = [
    {
        id: 'starter',
        name: 'Starter',
        price: 299,
        icon: Rocket,
        color: 'from-blue-500 to-cyan-500',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/10',
        description: 'Para empresas que estão começando',
        features: [
            'Até 10 funcionários',
            'ATS completo com IA',
            'Kanban de tarefas',
            'Dashboard analítico',
            'Suporte por e-mail',
            '1 vaga ativa',
        ],
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 799,
        icon: Zap,
        color: 'from-purple-500 to-pink-500',
        border: 'border-purple-500/50',
        glow: 'shadow-purple-500/20',
        description: 'Para equipes em crescimento',
        popular: true,
        features: [
            'Até 50 funcionários',
            'Tudo do Starter',
            'Gestão de RH completa',
            'Time Tracking',
            'Service Desk',
            'Vagas ilimitadas',
            'E-mails automáticos',
            'Relatórios avançados',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 1999,
        icon: Building2,
        color: 'from-amber-500 to-orange-500',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/10',
        description: 'Para grandes empresas',
        features: [
            'Funcionários ilimitados',
            'Tudo do Growth',
            'Gestão Financeira completa',
            'CSC + SLA Automático',
            'API Pública + Webhooks',
            'White-Label',
            'Multi-tenant isolado',
            'Suporte 24/7 dedicado',
            'IA Superintendente',
        ],
    },
];

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams?.get('expired') === 'true') {
            setIsExpired(true);
        }
    }, [searchParams]);

    const handleCheckout = async (planId: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
            window.location.href = '/register';
            return;
        }
        setLoading(planId);
        try {
            const res = await PaymentService.createCheckout(planId);
            if (res.init_point) {
                window.location.href = res.init_point;
            } else if (res.checkout_url) {
                window.location.href = res.checkout_url;
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao processar pagamento. Tente novamente.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Nav */}
            <nav className="border-b border-zinc-800 py-4 px-8 flex justify-between items-center">
                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Innovation.ia
                </Link>
                <div className="flex gap-4">
                    <Link href="/login" className="text-zinc-400 hover:text-white text-sm transition">Login</Link>
                    <Link href="/register" className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition">Começar Grátis</Link>
                </div>
            </nav>

            <section className="py-20 px-4 text-center">
                {isExpired && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto mb-8 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl flex items-center justify-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="text-left text-sm">
                            <h3 className="font-bold text-red-300 text-base">Seu período de teste expirou</h3>
                            <p>Para continuar acessando todos os recursos da inovation.ia, escolha um plano premium abaixo.</p>
                        </div>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm mb-6">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        Sem taxa de setup · Cancele quando quiser
                    </div>
                    <h1 className="text-5xl font-bold mb-4">
                        Planos para cada{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                            momento da empresa
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                        Comece pequeno, escale sem limites. Todos os planos incluem IA integrada.
                    </p>
                </motion.div>
            </section>

            <section className="pb-24 px-4">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`relative rounded-2xl border ${plan.border} bg-zinc-900/50 p-8 shadow-xl ${plan.glow} ${plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-bold">
                                    🔥 MAIS POPULAR
                                </div>
                            )}

                            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${plan.color} mb-4`}>
                                <plan.icon className="w-6 h-6 text-white" />
                            </div>

                            <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                            <p className="text-zinc-400 text-sm mb-6">{plan.description}</p>

                            <div className="mb-8">
                                <span className="text-5xl font-bold">R${plan.price}</span>
                                <span className="text-zinc-400">/mês</span>
                            </div>

                            <button
                                onClick={() => handleCheckout(plan.id)}
                                disabled={loading === plan.id}
                                className={`w-full py-3 rounded-xl font-semibold text-sm transition mb-8 ${plan.popular
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading === plan.id ? 'Redirecionando...' : `Assinar ${plan.name}`}
                            </button>

                            <ul className="space-y-3">
                                {plan.features.map((f, j) => (
                                    <li key={j} className="flex items-center gap-3 text-sm text-zinc-300">
                                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    ))}
                </div>

                <div className="max-w-2xl mx-auto mt-16 text-center">
                    <p className="text-zinc-500 text-sm">
                        Precisa de algo personalizado?{' '}
                        <a href="mailto:vendas@innovation.ia" className="text-purple-400 hover:text-purple-300">
                            Fale com nosso time de vendas →
                        </a>
                    </p>
                </div>
            </section>
        </div>
    );
}
