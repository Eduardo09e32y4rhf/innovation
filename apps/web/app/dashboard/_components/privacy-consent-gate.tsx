'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

const TERMS_VERSION = 'lgpd-rh-v1.1.0';

const FALLBACK_PURPOSE = 'Uso do sistema SaaS para gestão de RH, departamento pessoal, colaboradores, ponto, jornada, férias, comunicação operacional e registros administrativos, conforme bases legais aplicáveis da LGPD.';

type ConsentStatus = {
  required: boolean;
  accepted: boolean;
  termVersion: string;
  acceptedAt?: string | null;
  purpose: string;
};

const TERM_SECTIONS = [
  {
    title: '1. Finalidade do sistema',
    text: 'O Innovation RH Connect é utilizado para apoiar rotinas de RH, departamento pessoal, controle de ponto, férias, jornada, comunicação operacional, cadastro de colaboradores, relatórios e registros administrativos da empresa cliente.',
  },
  {
    title: '2. Papéis na LGPD',
    text: 'A empresa cliente é a controladora dos dados pessoais de seus colaboradores e define as finalidades do tratamento. O Innovation RH Connect atua como operador, processando dados conforme instruções da empresa cliente e medidas de segurança aplicáveis.',
  },
  {
    title: '3. Dados tratados',
    text: 'Podem ser tratados dados como nome, CPF, e-mail, telefone, cargo, departamento, matrícula, vínculo, jornada, ponto, férias, histórico funcional, registros administrativos e informações necessárias para cumprimento de obrigações legais, contratuais e trabalhistas.',
  },
  {
    title: '4. Dados sensíveis',
    text: 'Quando houver tratamento de dados sensíveis, como dados de saúde em atestados, informações biométricas ou dados exigidos por obrigações trabalhistas, o uso deve respeitar finalidade específica, necessidade, segurança reforçada e base legal adequada.',
  },
  {
    title: '5. Bases legais',
    text: 'O tratamento pode ocorrer para cumprimento de obrigação legal ou regulatória, execução de contrato, exercício regular de direitos, tutela da saúde quando aplicável, legítimo interesse em situações compatíveis e consentimento quando a lei exigir.',
  },
  {
    title: '6. Responsabilidades do usuário',
    text: 'O usuário deve acessar apenas dados necessários à sua função, manter sigilo, não compartilhar credenciais, registrar informações corretas e respeitar as permissões internas definidas pela empresa.',
  },
  {
    title: '7. Segurança e retenção',
    text: 'A plataforma adota controles técnicos e administrativos compatíveis com o uso do sistema. A retenção dos dados deve observar prazos legais, fiscais, trabalhistas, contratuais e o exercício regular de direitos.',
  },
  {
    title: '8. Direitos dos titulares',
    text: 'Colaboradores e demais titulares podem solicitar, conforme a LGPD, confirmação de tratamento, acesso, correção, informação sobre compartilhamento, oposição, revogação quando aplicável e eliminação após prazos legais.',
  },
];

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
        setStatus({ required: false, accepted: true, termVersion: TERMS_VERSION, purpose: FALLBACK_PURPOSE });
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
          setStatus({ required: !localAccepted, accepted: localAccepted, termVersion: TERMS_VERSION, purpose: FALLBACK_PURPOSE });
          setError('Não foi possível confirmar o aceite na API. O aceite será mantido neste navegador para continuar a avaliação do painel.');
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
        ...(current ?? { purpose: FALLBACK_PURPOSE, termVersion: TERMS_VERSION }),
        required: false,
        accepted: true,
        acceptedAt: data.acceptedAt,
      }));
    } catch {
      localStorage.setItem(`privacy-consent:${TERMS_VERSION}`, 'accepted');
      setStatus((current) => ({
        ...(current ?? { purpose: FALLBACK_PURPOSE, termVersion: TERMS_VERSION }),
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-950/80 px-3 py-4 backdrop-blur-sm sm:px-5">
      <section className="flex max-h-[calc(100vh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl">
        <header className="border-b border-slate-200 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-slate-950 text-white">
              <ShieldCheck size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-teal-700">LGPD e privacidade</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">Termos de Uso e Política de Privacidade</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Para acessar o sistema, confirme que leu e compreendeu as regras de uso e tratamento de dados pessoais no contexto de RH.
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <InfoLine label="Controlador" value="Empresa cliente responsável pelos dados pessoais de seus colaboradores, prestadores e usuários." />
            <InfoLine label="Operador" value="Innovation RH Connect, que processa dados no SaaS conforme instruções da empresa cliente." />
            <InfoLine label="Finalidade" value={status.purpose || FALLBACK_PURPOSE} />
            <InfoLine label="Versão do termo" value={status.termVersion || TERMS_VERSION} />
          </div>

          <div className="mt-5 space-y-3">
            {TERM_SECTIONS.map((section) => (
              <article key={section.title} className="rounded-[12px] border border-slate-200 p-4">
                <h3 className="text-sm font-black text-slate-950">{section.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{section.text}</p>
              </article>
            ))}
          </div>

          {error ? <p className="mt-4 rounded-[12px] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{error}</p> : null}
        </div>

        <footer className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
          <label className="flex items-start gap-3 rounded-[12px] border border-slate-200 bg-white p-3 text-sm font-semibold leading-5 text-slate-700">
            <input className="mt-1 shrink-0" type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
            <span>Li e aceito os Termos de Uso e a Política de Privacidade desta versão, ciente das responsabilidades de uso do sistema e tratamento de dados pessoais.</span>
          </label>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-500">O aceite fica registrado com versão do termo, data, hora, IP e agente do navegador quando a API estiver disponível.</p>
            <button
              onClick={acceptTerms}
              disabled={!checked || saving}
              className="h-11 rounded-[12px] bg-slate-950 px-5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Registrando...' : 'Aceitar e continuar'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 leading-5">{value}</p>
    </div>
  );
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}