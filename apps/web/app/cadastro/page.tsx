"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  FileText,
} from 'lucide-react';
import { api, type PublicPlatformPlan } from '@/app/lib/api';
import { PricingSection } from '../_components/pricing-section';
import { persistAuthSession } from '@/app/lib/auth-session';
import type { Company, User as AuthUser } from '@/app/contexts/AuthContext';

function CadastroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialPlanId = searchParams.get('planId') || '';
  const initialSeats = searchParams.get('seats') || '1';
  
  const [formData, setFormData] = useState({
    companyName: '',
    document: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    planId: initialPlanId,
    seatQuantity: Number(initialSeats) || 1,
    couponCode: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!formData.planId) {
      api.auth.publicPlans()
        .then((items) => {
          const recommended = items.find((item) => !item.isFree) ?? items[0];
          if (recommended && !formData.planId) {
            setFormData((current) => ({ ...current, planId: recommended.id }));
          }
        })
        .catch(() => {});
    }
  }, [formData.planId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.registerCompany({
        companyName: formData.companyName,
        document: formData.document.replace(/\D/g, ''),
        name: formData.name,
        email: formData.email,
        phone: formData.phone.replace(/\D/g, ''),
        password: formData.password,
        planId: formData.planId,
        seatQuantity: formData.seatQuantity,
        couponCode: formData.couponCode || undefined,
      });

      const sessionUser: AuthUser = {
        id: response.user.sub,
        name: response.user.name,
        email: response.user.email,
        profile: String(response.user.role).toLowerCase(),
        role: response.user.role,
        companyId: response.user.companyId,
        companyStatus: response.user.companyStatus,
        billingStatus: response.user.billingStatus,
      };
      const sessionCompany: Company = response.company;
      persistAuthSession(response.access_token, sessionUser, sessionCompany, Boolean(response.passwordChangeRequired), false);
      setSuccess(true);

      const tenant = response.company.slug || response.company.id;
      router.replace(`/${tenant}/fatura-pendente?autoCheckout=1`);
      
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative z-10 w-full max-w-[440px] px-6 text-center animate-in fade-in zoom-in duration-700 mx-auto">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 size={48} strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Conta Criada!</h1>
        <p className="text-slate-400">
          Sua empresa foi cadastrada com sucesso.
        </p>
        <p className="mt-4 text-sm font-bold text-teal-400">Redirecionando para o pagamento da ativação...</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-[1200px] px-6 flex flex-col xl:flex-row gap-12 items-start justify-center mx-auto">
      
      {/* Left Column: Pricing Section */}
      <div className="flex-1 w-full animate-in fade-in slide-in-from-left-8 duration-700">
        <PricingSection 
          selectedPlanId={formData.planId} 
          initialSeats={Number(initialSeats) || 1}
          onSelectPlan={(id) => setFormData(p => ({ ...p, planId: id }))}
          onSeatQuantityChange={(seatQuantity) => setFormData((previous) => ({ ...previous, seatQuantity }))} 
        />
      </div>

      {/* Right Column: Registration Form */}
      <div className="w-full xl:w-[450px] shrink-0">
        <div className="mb-8 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-[0_0_40px_rgba(45,212,191,0.3)] ring-1 ring-white/10">
            <ShieldCheck size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Innovation RH</h1>
          <p className="mt-1 text-sm font-medium text-slate-400">Crie sua empresa e escolha o plano ideal</p>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-backwards">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-200">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <Building2 size={18} />
                </div>
                <input
                  type="text" required name="companyName" value={formData.companyName} onChange={handleChange}
                  placeholder="Nome da Empresa"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <FileText size={18} />
                </div>
                <input
                  type="text" required name="document" value={formData.document} onChange={handleChange}
                  placeholder="CNPJ ou CPF"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <User size={18} />
                </div>
                <input
                  type="text" required name="name" value={formData.name} onChange={handleChange}
                  placeholder="Seu Nome (Administrador)"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email" required name="email" value={formData.email} onChange={handleChange}
                  placeholder="Seu melhor e-mail"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              
              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <Phone size={18} />
                </div>
                <input
                  type="text" required name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="WhatsApp"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  value={formData.seatQuantity}
                  onChange={(event) => setFormData((previous) => ({ ...previous, seatQuantity: Number(event.target.value) || 1 }))}
                  placeholder="Quantidade de usuários"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm font-medium text-white outline-none focus:border-teal-500"
                />
                <input
                  type="text"
                  value={formData.couponCode}
                  onChange={(event) => setFormData((previous) => ({ ...previous, couponCode: event.target.value.toUpperCase() }))}
                  placeholder="Cupom promocional (opcional)"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm font-medium text-white outline-none focus:border-teal-500"
                />
              </div>

              <div className="group relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'} required name="password" value={formData.password} onChange={handleChange}
                  placeholder="Crie uma senha forte"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-11 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 rounded-r-xl"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <button
                type="submit" disabled={loading}
                className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-teal-500 font-bold text-slate-950 transition-all hover:bg-teal-400 disabled:opacity-70"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? 'Criando conta...' : 'Concluir Cadastro'}
                  {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="mt-4 w-full text-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Já tem uma conta? Entre aqui
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-slate-950 font-sans selection:bg-teal-500/30 py-12 lg:py-24">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-[100%] bg-teal-500/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-0 h-[500px] w-full bg-slate-900/80 blur-[80px]" />
      </div>

      <Suspense fallback={<div className="text-white z-10">Carregando...</div>}>
        <CadastroForm />
      </Suspense>
    </main>
  );
}
