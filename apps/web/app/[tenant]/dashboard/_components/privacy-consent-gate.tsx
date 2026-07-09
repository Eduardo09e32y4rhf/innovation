'use client';

import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, Camera } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import dynamic from 'next/dynamic';

const FaceIDOverlay = dynamic(() => import('@/app/components/FaceIDOverlay').then(mod => mod.FaceIDOverlay), { ssr: false });

const TERMS_VERSION = 'lgpd-rh-innovation-v2.0.0';

const FALLBACK_PURPOSE = 'Uso do sistema SaaS para gestão de RH, departamento pessoal, colaboradores, ponto, jornada, férias, comunicação operacional e registros administrativos, com integração às ferramentas de Inteligência Artificial da Innovation System e consultoria, conforme bases legais aplicáveis da LGPD e normas de proteção avançada de dados.';

type ConsentStatus = {
  required: boolean;
  accepted: boolean;
  termVersion: string;
  acceptedAt?: string | null;
  purpose: string;
};

const TERM_SECTIONS = [
  {
    title: '1. Finalidade do sistema e Segurança',
    text: 'O Innovation RH System é utilizado para apoiar rotinas de RH, controle de ponto, férias, jornada e cadastro de colaboradores da empresa cliente. O sistema adota padrões rigorosos de segurança e criptografia de ponta a ponta para garantir a proteção avançada dos dados dos colaboradores contra acessos indevidos e vazamentos.',
  },
  {
    title: '2. Ferramentas de IA da Innovation System e consultoria',
    text: 'A plataforma emprega Ferramentas de Inteligência Artificial da Innovation System e consultoria para análise de jornadas, recomendações de alocação, alertas de absenteísmo e predição de eventos de RH. A Innovation atua de forma ética, não utilizando os dados sensíveis dos colaboradores para treinamento de modelos públicos e garantindo a anonimização de métricas coletivas.',
  },
  {
    title: '3. Papéis na LGPD',
    text: 'A empresa cliente atua como Controladora dos dados pessoais de seus colaboradores e dita as regras e finalidades do tratamento. O Innovation RH System atua apenas como Operador, processando dados exclusivamente conforme instruções contratuais da Controladora.',
  },
  {
    title: '4. Dados tratados e Dados Sensíveis',
    text: 'Tratamos dados como nome, CPF, e-mail, ponto, férias, histórico funcional e documentos admissionais. Quando houver tratamento de dados sensíveis (saúde/ASO, biometria), o uso respeita a finalidade estrita de cumprimento de obrigação legal ou trabalhista, com camadas extras de controle de acesso.',
  },
  {
    title: '5. Bases legais e Prazos de Retenção',
    text: 'O tratamento baseia-se prioritariamente em "Cumprimento de obrigação legal ou regulatória" e "Execução de contrato". A retenção segue os prazos exigidos pela legislação trabalhista, previdenciária e fiscal. Após o término legal, os dados são anonimizados ou devidamente eliminados.',
  },
  {
    title: '6. Responsabilidades do usuário do Painel',
    text: 'Você, enquanto usuário autenticado (Gestor/RH/Admin), deve acessar exclusivamente os dados inerentes à sua função, manter o sigilo absoluto das informações da tela, não compartilhar suas senhas e aderir estritamente às políticas internas da sua empresa.',
  },
  {
    title: '7. Direitos dos titulares dos dados',
    text: 'Os colaboradores podem, a qualquer momento, solicitar a confirmação, o acesso, a correção ou a explicação sobre o tratamento de seus dados pessoais. Tais pedidos devem ser encaminhados pela Controladora e facilitados pelo sistema Operador.',
  },
];

export function PrivacyConsentGate({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [status, setStatus] = React.useState<ConsentStatus | null>(null);
  const [checked, setChecked] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  
  const [showFaceID, setShowFaceID] = useState(false);
  const [locationData, setLocationData] = useState<{lat: number; lon: number; address: string} | null>(null);

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
          setError('Não foi possível sincronizar o aceite na API. O seu consentimento será armazenado neste navegador temporariamente.');
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

  const handleInitiateAccept = async () => {
    if (!token || !checked) return;
    setSaving(true);
    setError('Obtendo localização...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const address = data.display_name || 'Endereço não identificado';
            setLocationData({ lat: latitude, lon: longitude, address });
            setError('');
            setSaving(false);
            setShowFaceID(true);
          } catch (e) {
            setLocationData({ lat: position.coords.latitude, lon: position.coords.longitude, address: 'Erro ao buscar endereço' });
            setError('');
            setSaving(false);
            setShowFaceID(true);
          }
        },
        (err) => {
          setError('É necessário permitir a localização para assinar eletronicamente.');
          setSaving(false);
        }
      );
    } else {
      setError('Seu navegador não suporta geolocalização.');
      setSaving(false);
    }
  };

  const acceptTerms = async (photoBase64: string, faceDescriptor?: number[]) => {
    setShowFaceID(false);
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/privacy/terms/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: locationData?.lat,
          longitude: locationData?.lon,
          address: locationData?.address,
          photoBase64,
          faceDescriptor
        })
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-slate-900/90 px-3 py-4 backdrop-blur-md sm:px-5">
      <section className="flex max-h-[calc(100vh-32px)] w-full max-w-4xl flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_24px_50px_rgba(0,0,0,0.3)]">
        <header className="border-b border-slate-100 bg-slate-50 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-teal-600 text-white shadow-lg shadow-teal-600/30">
              <ShieldCheck size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">Segurança de Dados e LGPD</p>
              <h2 className="mt-1 text-2xl font-black leading-tight text-slate-900">Termos de Uso e Política de Privacidade</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Para liberar o acesso ao painel de gestão, você precisa revisar e confirmar que compreendeu as diretrizes de tratamento de dados e o uso de inteligência artificial da plataforma.
              </p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
            <InfoLine label="Controladora" value="A empresa cliente detém o controle dos dados de seus colaboradores." />
            <InfoLine label="Operadora e IA" value="Innovation RH System operado sob tecnologia da Innovation System e consultoria." />
            <InfoLine label="Finalidade Base" value={status.purpose || FALLBACK_PURPOSE} />
            <InfoLine label="Versão Contratual" value={status.termVersion || TERMS_VERSION} />
          </div>

          <div className="mt-7 space-y-4">
            {TERM_SECTIONS.map((section) => (
              <article key={section.title} className="rounded-[14px] border border-slate-200 p-5 transition hover:shadow-md">
                <h3 className="text-sm font-black text-slate-900">{section.title}</h3>
                <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate-600">{section.text}</p>
              </article>
            ))}
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <ShieldCheck size={20} className="shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white p-5 sm:p-7">
          <label className="flex cursor-pointer items-start gap-4 rounded-[14px] border-2 border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-5 text-slate-800 transition hover:border-teal-200 hover:bg-teal-50/50">
            <input 
              className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-teal-600" 
              type="checkbox" 
              checked={checked} 
              onChange={(event) => setChecked(event.target.checked)} 
            />
            <span>Declaro que li, compreendi e aceito integralmente os Termos de Uso e a Política de Privacidade (incluindo cláusulas LGPD e ferramentas de IA da Innovation System). Estou ciente de que esta é uma assinatura eletrônica com validade legal e que descumprimentos das regras da empresa podem acarretar em medidas disciplinares como advertência e suspensão.</span>
          </label>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-400 max-w-sm">A assinatura requer acesso à câmera e à localização (GPS). O documento final estará disponível na sua área de notificações.</p>
            <button
              onClick={handleInitiateAccept}
              disabled={!checked || saving}
              className="flex h-12 items-center gap-2 rounded-[14px] bg-slate-900 px-6 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.15)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Processando...' : 'Assinar com Face ID'}
              {!saving && <Camera size={18} />}
            </button>
          </div>
        </footer>
      </section>

      {showFaceID && (
        <FaceIDOverlay 
          title="Assinatura Biométrica Facial"
          onCapture={acceptTerms} 
          onCancel={() => setShowFaceID(false)} 
        />
      )}
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-600">{label}</p>
      <p className="mt-1.5 text-[13px] font-semibold leading-tight text-slate-700">{value}</p>
    </div>
  );
}

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || '/api';
}