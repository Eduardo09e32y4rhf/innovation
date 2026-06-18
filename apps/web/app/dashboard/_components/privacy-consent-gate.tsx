'use client';

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

const TERMS_VERSION = 'lgpd-rh-v1.0.0';

type ConsentStatus = {
  required: boolean;
  accepted: boolean;
  termVersion: string;
  acceptedAt?: string | null;
  purpose: string;
};

export function PrivacyConsentGate({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [status, setStatus] = React.useState<ConsentStatus | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let active = true;

    async function loadStatus() {
      if (!token) return;
      if (token === 'innovation-rh-connect-local-session') {
        setStatus({
          required: false,
          accepted: true,
          termVersion: TERMS_VERSION,
          purpose: 'Uso do sistema para gestao de RH, departamento pessoal, colaboradores, ponto e registros administrativos.',
        });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`${getApiBaseUrl()}/privacy/terms/status`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('status unavailable');
        const payload = await response.json();
        const data = payload.data ?? payload;
        if (active) setStatus(data);
      } catch {
        const localAccepted = localStorage.getItem(`privacy-consent:${TERMS_VERSION}`) === 'accepted';
        if (active) {
          setStatus({
            required: !localAccepted,
            accepted: localAccepted,
            termVersion: TERMS_VERSION,
            purpose: 'Uso do sistema para gestao de RH, departamento pessoal, colaboradores, ponto e registros administrativos.',
          });
          setError('Seu aceite sera mantido neste navegador para continuar a avaliacao do painel.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadStatus();
    return () => {
      active = false;
    };
  }, [token]);

  const acceptTerms = async () => {
    if (!token || !checked) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/privacy/terms/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('accept failed');
      const payload = await response.json();
      const data = payload.data ?? payload;
      setStatus((current) => ({
        ...(current ?? { purpose: '', termVersion: TERMS_VERSION }),
        required: false,
        accepted: true,
        acceptedAt: data.acceptedAt,
      }));
    } catch {
      localStorage.setItem(`privacy-consent:${TERMS_VERSION}`, 'accepted');
      setStatus((current) => ({
        ...(current ?? { purpose: '', termVersion: TERMS_VERSION }),
        required: false,
        accepted: true,
      }));
      setError('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <>{children}</>;
  if (!status?.required) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-[18px] border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">LGPD e privacidade</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Termos de Uso e Politica de Privacidade</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Para acessar o sistema, confirme que leu e aceita o tratamento de dados necessario para operacao de RH,
          departamento pessoal, ponto, jornada, colaboradores e registros administrativos.
        </p>

        <div className="mt-5 grid gap-3 text-sm text-slate-700">
          <InfoLine label="Controlador" value="Empresa cliente responsavel pelos dados dos funcionarios." />
          <InfoLine label="Operador" value="Innovation RH Connect, que processa os dados no SaaS conforme instrucoes da empresa cliente." />
          <InfoLine label="Finalidade" value={status.purpose} />
          <InfoLine label="Versao do termo" value={status.termVersion} />
          <InfoLine label="Direitos" value="Acesso, correcao, informacao, oposicao, revogacao quando aplicavel e eliminacao apos prazos legais." />
        </div>

        {error ? <p className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{error}</p> : null}

        <label className="mt-5 flex items-start gap-3 rounded-[14px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
          <input className="mt-1" type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <span>Li e aceito os Termos de Uso e a Politica de Privacidade desta versao.</span>
        </label>

        <div className="mt-5 flex justify-end">
          <button
            onClick={acceptTerms}
            disabled={!checked || saving}
            className="h-11 rounded-[14px] bg-slate-950 px-5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Registrando...' : 'Aceitar e continuar'}
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-slate-200 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 leading-5">{value}</p>
    </div>
  );
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
}
