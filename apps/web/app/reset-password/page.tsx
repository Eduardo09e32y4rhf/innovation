'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import { AuthAlert, AuthShell, authButton, authInput, authLink } from '@/app/_components/auth/auth-shell';
import { PasswordField, isStrongPassword } from '@/app/_components/auth/password-field';
import { api } from '@/app/lib/api';
import { useI18n } from '@/app/contexts/I18nContext';

type Step = 'identify' | 'password' | 'done';

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
  identify: {
    title: 'Redefinir senha',
    subtitle: 'Use o código de 8 caracteres fornecido pelo seu gestor, RH ou administrador.',
  },
  password: {
    title: 'Crie a nova senha',
    subtitle: 'Escolha uma senha forte e diferente das anteriores.',
  },
  done: {
    title: 'Senha redefinida',
    subtitle: 'Sua conta já está desbloqueada.',
  },
};

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const directToken = params.get('token')?.trim() ?? '';

  const [step, setStep] = useState<Step>(directToken ? 'password' : 'identify');
  const [email, setEmail] = useState(params.get('email')?.trim() ?? '');
  const [code, setCode] = useState('');
  const [cpf, setCpf] = useState('');
  const [registration, setRegistration] = useState('');
  const [token, setToken] = useState(directToken);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pending = useRef(false);

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');

    try {
      await action();
    } catch (cause) {
      setError(t(cause instanceof Error ? cause.message : 'Não foi possível concluir. Tente novamente.'));
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  const handleValidateCode = (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanEmail || cleanCode.length !== 8) {
      setError(t('Informe um e-mail válido e o código de 8 caracteres.'));
      return;
    }

    return run(async () => {
      const result = await api.auth.validateResetCode(cleanEmail, cleanCode, cpf, registration.trim());
      if (!result.valid || !result.resetToken) {
        throw new Error(t('Não foi possível validar os dados. Confira o código recebido por e-mail.'));
      }
      setToken(result.resetToken);
      setStep('password');
    });
  };

  const handleResetPassword = (event: FormEvent) => {
    event.preventDefault();

    if (password !== confirm) {
      setError(t('As senhas não conferem.'));
      return;
    }
    if (!isStrongPassword(password)) {
      setError(t('A senha não atende a todos os requisitos de segurança.'));
      return;
    }

    return run(async () => {
      const result = await api.auth.resetPassword(token, password);
      if (!result.changed) {
        throw new Error(t('A alteração da senha não foi confirmada. O token pode ter expirado.'));
      }
      setPassword('');
      setConfirm('');
      setToken('');
      setStep('done');
    });
  };

  const handleRestartFlow = () => {
    setToken('');
    setPassword('');
    setConfirm('');
    setError('');
    setStep('identify');
  };

  const { title, subtitle } = STEP_COPY[step];
  const passwordsMismatch = confirm.length > 0 && confirm !== password;

  return (
    <AuthShell
      title={t(title)}
      subtitle={t(subtitle)}
      footer={
        <Link href="/login" className="font-semibold text-white underline">
          {t('Voltar ao login')}
        </Link>
      }
    >
      {step === 'done' && (
        <div className="space-y-4">
          <AuthAlert kind="success">{t('Senha alterada com sucesso. Entre com a nova senha.')}</AuthAlert>
          <Link href="/login" className={authButton}>
            {t('Ir para o login')}
          </Link>
        </div>
      )}

      {step === 'identify' && (
        <form onSubmit={handleValidateCode} className="space-y-4">
          <div>
            <label htmlFor="rp-email" className="mb-1.5 block text-sm font-medium text-zinc-700">
              {t('E-mail')}
            </label>
            <input
              id="rp-email"
              required
              type="email"
              autoComplete="email"
              disabled={loading}
              className={authInput}
              placeholder={t('seu.email@empresa.com.br')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="rp-code" className="mb-1.5 block text-sm font-medium text-zinc-700">
              {t('Código de recuperação')}
            </label>
            <input
              id="rp-code"
              required
              minLength={8}
              maxLength={8}
              autoComplete="one-time-code"
              disabled={loading}
              className={`${authInput} font-mono uppercase tracking-[0.3em]`}
              placeholder="A1B2C3D4"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
            />
          </div>

          <details className="rounded-lg border border-zinc-200 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-zinc-700">
              {t('Sou funcionário (confirmar identidade)')}
            </summary>
            <p className="mt-2 text-xs text-zinc-500">
              {t('Preencha se você tem ficha de funcionário. Administradores e contas sem ficha podem pular.')}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="rp-cpf" className="mb-1.5 block text-xs font-medium text-zinc-700">
                  {t('3 primeiros dígitos do CPF')}
                </label>
                <input
                  id="rp-cpf"
                  inputMode="numeric"
                  maxLength={3}
                  autoComplete="off"
                  disabled={loading}
                  className={authInput}
                  placeholder="000"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 3))}
                />
              </div>
              <div>
                <label htmlFor="rp-reg" className="mb-1.5 block text-xs font-medium text-zinc-700">
                  {t('Matrícula')}
                </label>
                <input
                  id="rp-reg"
                  autoComplete="off"
                  disabled={loading}
                  className={authInput}
                  placeholder={t('Ex: 1024')}
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                />
              </div>
            </div>
          </details>

          {error && <AuthAlert kind="error">{error}</AuthAlert>}

          <button
            type="submit"
            disabled={loading || !email.trim() || code.length !== 8}
            className={authButton}
          >
            {loading ? t('Validando…') : t('Continuar')}
          </button>

          <p className="text-center text-sm text-zinc-600">
            {t('Não tem o código?')}{' '}
            <Link href="/esqueci-senha" className={authLink}>
              {t('Solicitar agora')}
            </Link>
          </p>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <PasswordField
            label={t('Nova senha')}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            disabled={loading}
            showRules
          />
          <PasswordField
            label={t('Confirmar nova senha')}
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            disabled={loading}
          />

          {passwordsMismatch && (
            <p role="alert" className="text-xs text-rose-600">
              {t('As senhas não conferem.')}
            </p>
          )}

          {error && <AuthAlert kind="error">{error}</AuthAlert>}

          <button
            type="submit"
            disabled={loading || !isStrongPassword(password) || password !== confirm}
            className={authButton}
          >
            {loading ? t('Salvando…') : t('Salvar nova senha')}
          </button>

          <div className="flex items-center justify-between pt-1 text-xs text-zinc-600">
            <button
              type="button"
              onClick={handleRestartFlow}
              disabled={loading}
              className="underline hover:text-zinc-900 disabled:opacity-50"
            >
              {t('Inserir outro código')}
            </button>
            <Link href="/esqueci-senha" className={authLink}>
              {t('Solicitar novo link/código')}
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}

function ResetPasswordFallback() {
  const { t } = useI18n();
  return (
    <AuthShell title={t('Redefinir senha')} subtitle={t('Preparando validação de segurança.')}>
      <AuthAlert kind="info">{t('Carregando formulário…')}</AuthAlert>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetForm />
    </Suspense>
  );
}
