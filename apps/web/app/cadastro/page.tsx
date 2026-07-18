"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function CadastroPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    companyName: '',
    document: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    planId: '',
  });

  const [plans, setPlans] = useState<PublicPlatformPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.auth.publicPlans()
      .then((items) => {
        setPlans(items);
        const recommended = items.find((item) => !item.isFree) ?? items[0];
        if (recommended) setFormData((current) => ({ ...current, planId: recommended.id }));
      })
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

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
        document: formData.document.replace(/\D/g, ''), // Send only numbers
        name: formData.name,
        email: formData.email,
        phone: formData.phone.replace(/\D/g, ''),
        password: formData.password,
        planId: formData.planId || undefined,
      });

      setSuccess(true);
      
      setTimeout(() => {
        if (response.paymentUrl) {
          window.location.href = response.paymentUrl;
        } else {
          router.push('/login?cadastro=concluido');
        }
      }, 2000);
      
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans selection:bg-teal-500/30">
        <div className="relative z-10 w-full max-w-[440px] px-6 text-center animate-in fade-in zoom-in duration-700">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={48} strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Conta Criada!</h1>
          <p className="text-slate-400">
            Sua empresa foi cadastrada com sucesso.
          </p>
          <p className="mt-4 text-sm font-bold text-teal-400">Redirecionando para o pagamento da ativação...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans selection:bg-teal-500/30 py-12">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-[100%] bg-teal-500/10 blur-[120px]" />
        <div className="absolute -bottom-[20%] left-0 h-[500px] w-full bg-slate-900/80 blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-[500px] px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-[0_0_40px_rgba(45,212,191,0.3)] ring-1 ring-white/10">
            <ShieldCheck size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Innovation RH</h1>
          <p className="mt-1 text-sm font-medium text-slate-400">Crie sua conta e comece agora (7 dias grátis)</p>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-backwards">
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <AlertCircle size={18} className="text-rose-400 shrink-0" />
                <p className="text-sm font-medium text-rose-200">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group relative col-span-1 md:col-span-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <Building2 size={18} />
                </div>
                <input
                  type="text" required name="companyName" value={formData.companyName} onChange={handleChange}
                  placeholder="Nome da Empresa (Razão Social ou Fantasia)"
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
                  <Phone size={18} />
                </div>
                <input
                  type="text" required name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="Telefone / WhatsApp"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <label className="col-span-1 md:col-span-2 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Plano</span>
                <select
                  name="planId"
                  value={formData.planId}
                  onChange={(event) => setFormData((current) => ({ ...current, planId: event.target.value }))}
                  disabled={plansLoading}
                  className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-semibold text-white outline-none focus:border-teal-500"
                >
                  {plansLoading && <option value="">Carregando planos...</option>}
                  {!plansLoading && plans.length === 0 && <option value="">Plano Base - R$ 49,90/mes</option>}
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {plan.isFree ? 'Gratis' : Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / {plan.cycle === 'YEARLY' ? 'ano' : plan.cycle === 'QUARTERLY' ? 'trimestre' : 'mes'}
                    </option>
                  ))}
                </select>
                {formData.planId && plans.find((plan) => plan.id === formData.planId) && (
                  <p className="text-xs text-slate-500">Ate {plans.find((plan) => plan.id === formData.planId)?.maxUsers} usuarios e {plans.find((plan) => plan.id === formData.planId)?.maxEmployees} colaboradores.</p>
                )}
              </label>

              <div className="group relative col-span-1 md:col-span-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <User size={18} />
                </div>
                <input
                  type="text" required name="name" value={formData.name} onChange={handleChange}
                  placeholder="Seu Nome (Administrador)"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="group relative col-span-1 md:col-span-2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 group-focus-within:text-teal-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email" required name="email" value={formData.email} onChange={handleChange}
                  placeholder="Seu melhor e-mail"
                  className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm font-medium text-white placeholder-slate-600 outline-none focus:border-teal-500 focus:bg-black/40 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div className="group relative col-span-1 md:col-span-2">
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
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
    </main>
  );
}
