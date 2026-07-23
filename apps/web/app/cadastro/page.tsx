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
import Link from 'next/link';
import { AuthSplitLayout } from '@/app/components/auth-split-layout';
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
  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.auth.publicPlans()
      .then((items) => {
        setPlans(items);
        if (!formData.planId) {
          const recommended = items.find((item) => !item.isFree) ?? items[0];
          if (recommended) {
            setFormData((current) => ({ ...current, planId: recommended.id }));
          }
        }
      })
      .catch(() => {});
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
      <AuthSplitLayout>
        <div className="text-center animate-in fade-in zoom-in duration-700">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={48} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Conta Criada!</h1>
          <p className="text-slate-500">
            Sua empresa foi cadastrada com sucesso.
          </p>
          <p className="mt-4 text-sm font-bold text-brand-600">Redirecionando para o painel...</p>
        </div>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout title="Crie sua conta" subtitle="E comece a usar a plataforma Innovation RH hoje mesmo.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-50 px-4 py-3">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <p className="text-sm font-medium text-rose-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <User size={18} />
            </div>
            <input
              type="text"
              name="name"
              placeholder="Seu Nome Completo"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              required
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <Building2 size={18} />
            </div>
            <input
              type="text"
              name="companyName"
              placeholder="Nome da Empresa"
              value={formData.companyName}
              onChange={handleChange}
              disabled={loading}
              required
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <FileText size={18} />
            </div>
            <input
              type="text"
              name="document"
              placeholder="CNPJ"
              value={formData.document}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, "");
                if (v.length > 14) v = v.slice(0, 14);
                if (v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
                else if (v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4}).*/, "$1.$2.$3/$4");
                else if (v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{1,3}).*/, "$1.$2.$3");
                else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,3}).*/, "$1.$2");
                setFormData(p => ({...p, document: v}));
              }}
              disabled={loading}
              required
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>

          <div className="group relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
              <Phone size={18} />
            </div>
            <input
              type="text"
              name="phone"
              placeholder="Telefone / WhatsApp"
              value={formData.phone}
              onChange={(e) => {
                let v = e.target.value.replace(/\D/g, "");
                if (v.length > 11) v = v.slice(0, 11);
                if (v.length > 10) v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
                else if (v.length > 6) v = v.replace(/^(\d{2})(\d{4})(\d{1,4}).*/, "($1) $2-$3");
                else if (v.length > 2) v = v.replace(/^(\d{2})(\d{1,4}).*/, "($1) $2");
                else if (v.length > 0) v = v.replace(/^(\d{1,2}).*/, "($1");
                setFormData(p => ({...p, phone: v}));
              }}
              disabled={loading}
              required
              className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="group relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
            <Mail size={18} />
          </div>
          <input
            type="email"
            name="email"
            placeholder="Seu melhor e-mail"
            value={formData.email}
            onChange={handleChange}
            disabled={loading}
            required
            className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
          />
        </div>

        <div className="group relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors group-focus-within:text-brand-500">
            <Lock size={18} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Crie uma senha forte"
            value={formData.password}
            onChange={handleChange}
            disabled={loading}
            required
            className="h-12 w-full rounded-[14px] border border-slate-200/80 bg-slate-50/50 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-4 mb-2">
          <label className="text-sm font-bold text-slate-900">Escolha o Plano</label>
          <div className="grid grid-cols-1 gap-3">
            {plans.map(plan => (
              <label key={plan.id} className={`relative flex cursor-pointer rounded-[14px] border p-4 transition-all ${formData.planId === plan.id ? 'border-brand-500 bg-brand-50/30 ring-1 ring-brand-500' : 'border-slate-200 bg-slate-50/30 hover:border-brand-300'}`}>
                <input 
                  type="radio" 
                  name="planId" 
                  value={plan.id}
                  checked={formData.planId === plan.id}
                  onChange={(e) => setFormData(p => ({...p, planId: e.target.value}))}
                  className="sr-only"
                />
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className={`font-black ${formData.planId === plan.id ? 'text-brand-700' : 'text-slate-900'}`}>{plan.name}</span>
                    {plan.isRecommended && <span className="text-[10px] uppercase font-black tracking-wider text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">Recomendado</span>}
                  </div>
                  <span className="text-xs font-medium text-slate-500 mt-1">{plan.description}</span>
                  {plan.cycle !== 'CUSTOM' && (
                    <span className="text-sm font-black text-slate-900 mt-2">{Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-[10px] text-slate-500 font-medium">/{plan.cycle === 'YEARLY' ? 'ano' : 'mês'}</span></span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.planId}
          className="crystal-button group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-black text-white shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-500/30 disabled:pointer-events-none disabled:opacity-70"
        >
          {loading ? 'Criando conta...' : 'Cadastrar Empresa'}
          {!loading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </button>

        <p className="mt-4 text-center text-xs font-medium text-slate-500">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-bold text-brand-600 hover:text-brand-700">
            Fazer login
          </Link>
        </p>
      </form>
    </AuthSplitLayout>
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
