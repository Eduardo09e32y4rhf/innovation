'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AuthAlert, AuthShell, authButton, authInput, authLink } from '@/app/_components/auth/auth-shell';
import { PasswordField, isStrongPassword } from '@/app/_components/auth/password-field';
import type { Company, User as AuthUser } from '@/app/contexts/AuthContext';
import { api, type PublicPlatformPlan } from '@/app/lib/api';
import { persistAuthSession } from '@/app/lib/auth-session';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function maskDocument(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}

function validDocument(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (![11, 14].includes(d.length) || /^(\d)\1+$/.test(d)) return false;
  const digits = d.split('').map(Number);
  if (d.length === 11) {
    const calc = (len: number) => { let s = 0; for (let i = 0; i < len; i += 1) s += digits[i] * (len + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return calc(9) === digits[9] && calc(10) === digits[10];
  }
  const calc = (len: number) => {
    const w = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = w.reduce((t, weight, i) => t + digits[i] * weight, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === digits[12] && calc(13) === digits[13];
}

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length > 10) return d.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  if (d.length > 6) return d.replace(/^(\d{2})(\d{4})(\d{1,4}).*/, '($1) $2-$3');
  if (d.length > 2) return d.replace(/^(\d{2})(\d{1,4})/, '($1) $2');
  return d;
}

function CadastroForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ companyName: '', document: '', name: '', email: '', phone: '', password: '', couponCode: '' });
  const [seats, setSeats] = useState(() => Math.max(1, Math.min(10_000, Number(search.get('seats')) || 1)));
  const [planId, setPlanId] = useState(() => { const id = search.get('planId') ?? ''; return UUID.test(id) ? id : ''; });
  const [accepted, setAccepted] = useState(false);
  const [plans, setPlans] = useState<PublicPlatformPlan[] | null>(null);
  const [plansError, setPlansError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const loadPlans = useCallback(() => {
    setPlansError(''); setPlans(null);
    api.auth.publicPlans()
      .then((items) => {
        const list = Array.isArray(items) ? items : [];
        setPlans(list);
        setPlanId((current) => list.some((p) => p.id === current) ? current : (list.find((p) => p.isRecommended) ?? list.find((p) => !p.isFree) ?? list[0])?.id ?? '');
      })
      .catch((cause) => setPlansError(cause instanceof Error ? cause.message : 'Não foi possível carregar os planos.'));
  }, []);
  useEffect(loadPlans, [loadPlans]);

  const plan = plans?.find((item) => item.id === planId) ?? null;
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const stepOneError = useMemo(() => {
    if (form.companyName.trim().length < 2) return 'Informe o nome da empresa.';
    if (!validDocument(form.document)) return 'Informe um CPF ou CNPJ válido.';
    if (form.name.trim().length < 2) return 'Informe seu nome completo.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Informe um e-mail válido.';
    if (!isStrongPassword(form.password)) return 'A senha não atende a todos os requisitos.';
    return '';
  }, [form]);

  function next(event: FormEvent) {
    event.preventDefault();
    if (stepOneError) return setError(stepOneError);
    setError(''); setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!plan) return setError('Selecione um plano.');
    if (plan.maxUsers && seats > plan.maxUsers) return setError(`Este plano permite no máximo ${plan.maxUsers} usuários.`);
    if (!accepted) return setError('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
    pending.current = true; setLoading(true); setError('');
    try {
      const response = await api.auth.registerCompany({
        companyName: form.companyName.trim(), document: form.document.replace(/\D/g, ''), name: form.name.trim(), email: form.email.trim().toLowerCase(),
        phone: form.phone.replace(/\D/g, '') || undefined, password: form.password, planId: plan.id, seatQuantity: seats, couponCode: form.couponCode.trim() || undefined,
      });
      const sessionUser: AuthUser = {
        id: response.user.sub, name: response.user.name, email: response.user.email, profile: String(response.user.role).toLowerCase(), role: response.user.role,
        companyId: response.user.companyId, companyStatus: response.user.companyStatus, billingStatus: response.user.billingStatus,
      };
      persistAuthSession(response.access_token, sessionUser, response.company as Company, Boolean(response.passwordChangeRequired), false);
      const tenant = response.company.slug || response.company.id;
      router.replace(response.trial || plan.isFree ? `/${tenant}/dashboard` : `/${tenant}/fatura-pendente?autoCheckout=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a conta. Tente novamente.');
      pending.current = false; setLoading(false);
    }
  }

  const unitPrice = plan ? num(plan.baseMonthlyPrice) || num(plan.price) : 0;
  const seatPrice = plan ? num(plan.userMonthlyPrice) : 0;
  const estimate = unitPrice + Math.max(0, seats - (plan?.includedUnits ?? 0)) * seatPrice;

  return (
    <AuthShell wide title="Crie sua empresa" subtitle={step === 1 ? 'Etapa 1 de 2 · Dados da empresa e do administrador' : 'Etapa 2 de 2 · Plano e confirmação'}
      footer={<>Já tem conta? <Link href="/login" className="font-semibold text-white underline">Entrar</Link></>}>
      <div className="mb-5 flex gap-2" aria-hidden="true">
        {[1, 2].map((n) => <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-[var(--color-brand)]' : 'bg-zinc-200'}`} />)}
      </div>

      {step === 1 ? (
        <form onSubmit={next} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-company" label="Nome da empresa"><input id="c-company" required autoComplete="organization" className={authInput} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} /></Field>
            <Field id="c-doc" label="CNPJ ou CPF">
              <input id="c-doc" required inputMode="numeric" className={authInput} value={form.document} onChange={(e) => set('document', maskDocument(e.target.value))} aria-invalid={form.document.replace(/\D/g, '').length >= 11 && !validDocument(form.document)} />
            </Field>
            <Field id="c-name" label="Seu nome"><input id="c-name" required autoComplete="name" className={authInput} value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field id="c-phone" label="Telefone / WhatsApp (opcional)"><input id="c-phone" type="tel" autoComplete="tel" className={authInput} value={form.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} /></Field>
          </div>
          <Field id="c-email" label="E-mail de acesso"><input id="c-email" required type="email" autoComplete="email" className={authInput} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <PasswordField label="Senha" value={form.password} onChange={(v) => set('password', v)} autoComplete="new-password" showRules />
          {error && <AuthAlert>{error}</AuthAlert>}
          <button type="submit" className={authButton}>Continuar</button>
        </form>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {plansError && <AuthAlert>{plansError} <button type="button" className="font-semibold underline" onClick={loadPlans}>Tentar de novo</button></AuthAlert>}
          {!plansError && plans === null && <p role="status" className="text-sm text-zinc-500">Carregando planos…</p>}
          {plans && plans.length === 0 && <AuthAlert kind="info">Nenhum plano disponível no momento. <Link href="/suporte" className="font-semibold underline">Fale com o suporte</Link>.</AuthAlert>}

          {plans && plans.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium text-zinc-700">Plano</legend>
              {plans.map((item) => {
                const price = num(item.baseMonthlyPrice) || num(item.price);
                const selected = item.id === planId;
                return (
                  <label key={item.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selected ? 'border-[var(--color-brand)] bg-purple-50 ring-1 ring-[var(--color-brand)]' : 'border-zinc-200 hover:border-zinc-300'}`}>
                    <input type="radio" name="plan" className="mt-1" checked={selected} onChange={() => setPlanId(item.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-zinc-900">{item.name}</span>
                        <span className="text-sm font-semibold text-[var(--color-brand-700)]">{item.isFree ? 'Grátis' : `a partir de ${brl(price)}/mês`}</span></span>
                      {item.description && <span className="mt-0.5 block text-xs text-zinc-500">{item.description}</span>}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="c-seats" label="Usuários"><input id="c-seats" type="number" min={1} max={plan?.maxUsers || 10000} required className={authInput} value={seats} onChange={(e) => setSeats(Math.max(1, Math.floor(Number(e.target.value)) || 1))} /></Field>
            <Field id="c-coupon" label="Cupom (opcional)"><input id="c-coupon" autoComplete="off" className={authInput} value={form.couponCode} onChange={(e) => set('couponCode', e.target.value.trim())} /></Field>
          </div>

          {plan && !plan.isFree && estimate > 0 && (
            <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700">Estimativa mensal: <strong>{brl(estimate)}</strong> <span className="text-xs text-zinc-500">(base + {seats} usuário{seats > 1 ? 's' : ''}; o valor final com descontos aparece no checkout)</span></p>
          )}

          <label className="flex items-start gap-2 text-sm text-zinc-600">
            <input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>Li e aceito os <Link href="/termos" target="_blank" className={authLink}>Termos de Uso</Link> e a <Link href="/privacidade" target="_blank" className={authLink}>Política de Privacidade</Link>.</span>
          </label>

          {error && <AuthAlert>{error}</AuthAlert>}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setStep(1); setError(''); }} disabled={loading} className="min-h-11 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Voltar</button>
            <button type="submit" disabled={loading || !plan || !accepted} className={authButton}>{loading ? 'Criando conta…' : 'Criar minha empresa'}</button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</label>{children}</div>;
}

export default function CadastroPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-center">Carregando…</p>}><CadastroForm /></Suspense>;
}
