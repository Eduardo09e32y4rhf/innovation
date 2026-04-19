'use client';

'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';
import { signInWithPassword } from '@/utils/auth-helpers/server';
import { handleRequest } from '@/utils/auth-helpers/client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

interface PasswordSignInProps {
  allowEmail: boolean;
  redirectMethod: string;
}

export default function PasswordSignIn({
  allowEmail,
  redirectMethod
}: PasswordSignInProps) {
  const router = redirectMethod === 'client' ? useRouter() : null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setIsSubmitting(true);
    await handleRequest(e, signInWithPassword, router);
    setIsSubmitting(false);
  };

  return (
    <div className="my-8 space-y-4">
      <form
        noValidate={true}
        className="mb-4"
        onSubmit={(e) => handleSubmit(e)}
      >
        <div className="space-y-3">
          <div className="grid gap-1">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Corporativo</label>
            <input
              id="email"
              placeholder="usuario@empresa.com"
              type="email"
              name="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold"
              required
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Senha Corporativa</label>
            <div className="relative">
              <input
                id="password"
                placeholder="••••••••"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                className="w-full p-4 pr-12 rounded-xl border border-slate-200 bg-slate-50 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm font-semibold"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500"
              >
                {showPassword ? 'Esconder' : 'Mostrar'}
              </button>
            </div>
          </div>
          <Button
            variant="slim"
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-wider text-sm"
            loading={isSubmitting}
          >
            Acessar Dashboard
          </Button>
        </div>
      </form>
      <div className="space-y-2 text-xs text-slate-500">
        <p>
          <Link href="/signin/forgot_password" className="font-semibold hover:text-indigo-500">
            Esqueceu a senha?
          </Link>
        </p>
        {allowEmail && (
          <p>
            <Link href="/signin/email_signin" className="font-semibold hover:text-indigo-500">
              Entrar por link mágico
            </Link>
          </p>
        )}
        <p>
          <Link href="/signin/signup" className="font-semibold hover:text-indigo-500">
            Criar nova conta
          </Link>
        </p>
      </div>
    </div>
  );
}
