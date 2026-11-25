'use client';

import { Laptop, Loader2, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { api, request, type SessionInfo } from '@/app/lib/api';
import { cardClass, errorText, inputClass } from './types';
import { useConfirm } from '@/app/components/ui/confirm-provider';
import { useI18n } from '@/app/contexts/I18nContext';

type Mfa = { enabled: boolean; enabledAt?: string; required: boolean; recoveryCodesLeft: number };
type Setup = { secret: string; otpauthUrl: string; qrDataUrl?: string };

/** "Windows NT 10.0; Win64; x64" vira "Windows" etc. */
function deviceName(userAgent?: string | null) {
  const ua = userAgent ?? '';
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iPhone/iPad' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Dispositivo';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${os} · ${browser}` : os;
}
const isMobile = (userAgent?: string | null) => /Android|iPhone|iPad|Mobile/i.test(userAgent ?? '');

function TwoFactor() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Mfa | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setStatus(await api.auth.mfaStatus()); } catch (cause) { setError(errorText(cause, t('Não foi possível carregar a verificação em duas etapas.'))); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  async function start() {
    setBusy(true); setError(null);
    try { setSetup(await api.auth.mfaSetup() as Setup); } catch (cause) { setError(errorText(cause, t('Não foi possível iniciar a configuração.'))); }
    finally { setBusy(false); }
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const result = await api.auth.mfaEnable(code.trim());
      setCodes(result.recoveryCodes); setSetup(null); setCode(''); await load();
      toast.success(t('Verificação em duas etapas ativada.'));
    } catch (cause) { setError(errorText(cause, t('Código inválido. Confira o horário do celular e tente de novo.'))); }
    finally { setBusy(false); }
  }
  const askConfirm = useConfirm();
  async function disable() {
    if (!(await askConfirm({ title: t('Desativar verificação em duas etapas'), description: t('Sua conta fica menos protegida.'), confirmText: t('Desativar verificação') }))) return;
    const code = window.prompt(t('Para confirmar, digite o código de 6 dígitos do app autenticador:'))?.trim();
    if (!code) return;
    setBusy(true); setError(null);
    try { await request('/auth/mfa/disable', { method: 'POST', body: { code } }); toast.success(t('Verificação em duas etapas desativada.')); await load(); }
    catch (cause) { setError(errorText(cause, t('Não foi possível desativar.'))); }
    finally { setBusy(false); }
  }

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${status?.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {status?.enabled ? <ShieldCheck size={22} aria-hidden="true" /> : <ShieldOff size={22} aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-fg">{t('Verificação em duas etapas')}</h3>
          <p className="text-sm text-fg-sub">{t('Além da senha, o login pede um código do aplicativo autenticador (Google Authenticator, Microsoft Authenticator...).')}</p>
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
      {!status ? <p className="text-sm text-fg-sub"><Loader2 size={14} className="mr-1 inline animate-spin" /> {t('Carregando…')}</p> : (
        <>
          <p className="text-sm">{t('Situação')}: <strong className={status.enabled ? 'text-emerald-700' : 'text-amber-700'}>{status.enabled ? `${t('Ativada')}${status.enabledAt ? ` ${t('em')} ${new Date(status.enabledAt).toLocaleDateString()}` : ''}` : t('Desativada')}</strong>
            {status.required && <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">{t('Obrigatória para o seu perfil')}</span>}</p>
          {status.enabled && <p className="text-xs text-fg-sub">Códigos de recuperação restantes: {status.recoveryCodesLeft}</p>}

          {!status.enabled && !setup && <Button onClick={start} isLoading={busy}>{t('Ativar agora')}</Button>}
          {status.enabled && !status.required && <Button variant="outline" onClick={disable} isLoading={busy}>{t('Desativar')}</Button>}

          {setup && (
            <form onSubmit={confirm} className="grid gap-4 rounded-xl border border-border bg-bg-sub/50 p-4 sm:grid-cols-[auto_1fr]">
              {setup.qrDataUrl && <img src={setup.qrDataUrl} alt={t('QR Code para o aplicativo autenticador')} width={160} height={160} className="rounded-lg bg-white p-1" />}
              <div className="space-y-3 text-sm">
                <p><strong>1.</strong> {t('Abra o aplicativo autenticador e leia o QR Code (ou digite a chave abaixo).')}</p>
                <p className="break-all rounded-lg bg-bg px-3 py-2 font-mono text-xs">{setup.secret}</p>
                <label className="block font-medium text-fg-sub"><strong>2.</strong> {t('Digite o código de 6 números que aparece no aplicativo')}
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${inputClass} max-w-[180px] tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                </label>
                <div className="flex gap-2"><Button type="submit" isLoading={busy} disabled={code.length !== 6}>{t('Confirmar e ativar')}</Button><Button type="button" variant="outline" onClick={() => { setSetup(null); setCode(''); }}>{t('Cancelar')}</Button></div>
              </div>
            </form>
          )}

          {codes && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">{t('Guarde estes códigos de recuperação agora. Eles não aparecem de novo.')}</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-4">{codes.map((c) => <li key={c} className="rounded bg-white px-2 py-1 text-center">{c}</li>)}</ul>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(codes.join('\n')).then(() => toast.success(t('Códigos copiados.')))}>{t('Copiar')}</Button>
                <Button size="sm" onClick={() => setCodes(null)}>{t('Já guardei')}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Sessions() {
  const { t } = useI18n();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSessions(await api.auth.sessions()); setError(null); }
    catch (cause) { setError(errorText(cause, t('Não foi possível carregar as sessões.'))); }
    finally { setLoading(false); }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  async function act(key: string, action: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try { await action(); toast.success(ok); await load(); }
    catch (cause) { toast.error(errorText(cause, t('Não foi possível encerrar.'))); }
    finally { setBusy(null); }
  }

  return (
    <section className={`${cardClass} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-base font-bold text-fg">{t('Onde sua conta está conectada')}</h3><p className="text-sm text-fg-sub">{t('Um aparelho por linha. Encerre os que você não reconhece.')}</p></div>
        <Button variant="outline" disabled={loading || sessions.length < 2} isLoading={busy === 'others'} onClick={() => act('others', () => api.auth.revokeOtherSessions(), t('Outras sessões encerradas.'))}>{t('Encerrar todas as outras')}</Button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {loading ? <p className="text-sm text-fg-sub">{t('Carregando…')}</p> : (
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const Icon = isMobile(s.userAgent) ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-sub text-fg-sub"><Icon size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{t(deviceName(s.userAgent))} {s.current && <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">{t('Este aparelho')}</span>}</p>
                  <p className="text-xs text-fg-sub">IP {s.ip || t('não informado')} · {t('último uso')} {new Date(s.lastUsedAt || s.createdAt).toLocaleString()}</p>
                </div>
                {!s.current && <Button variant="outline" size="sm" isLoading={busy === s.id} onClick={() => act(s.id, () => api.auth.revokeSession(s.id), t('Sessão encerrada.'))}>{t('Encerrar')}</Button>}
              </li>
            );
          })}
          {!sessions.length && <li className="py-4 text-sm text-fg-sub">{t('Nenhuma sessão ativa encontrada.')}</li>}
        </ul>
      )}
    </section>
  );
}

export function SecuritySection() {
  return <div className="space-y-5"><TwoFactor /><Sessions /></div>;
}
