'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Cpu,
  Loader2,
  MessageSquare,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { getApiBaseUrl, getAuthHeaders } from '../api';

type CommunicationSettings = {
  aiEngine: 'gemini' | 'gpt';
  geminiApiKey: string;
  openAiApiKey: string;
  aiEnabled: boolean;
  automaticSchedulingEnabled: boolean;
  customCalendarMessageEnabled: boolean;
  prompt: string;
  temperature: number;
};

type CalendarStatus = {
  isConnected?: boolean;
  authenticated?: boolean;
  requiresReauth?: boolean;
  userEmail?: string | null;
  details?: string | null;
  user?: {
    email?: string;
    name?: string;
  } | null;
};

const DEFAULT_SETTINGS: CommunicationSettings = {
  aiEngine: 'gemini',
  geminiApiKey: '',
  openAiApiKey: '',
  aiEnabled: true,
  automaticSchedulingEnabled: false,
  customCalendarMessageEnabled: true,
  prompt: '',
  temperature: 70,
};

export default function WhatsappBuilderPage() {
  const [settings, setSettings] = useState<CommunicationSettings>(DEFAULT_SETTINGS);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingCalendar, setRefreshingCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [settingsResponse, calendarResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/communication/settings`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${apiBaseUrl}/communication/calendar/status`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!settingsResponse.ok) throw new Error('Nao foi possivel carregar as configuracoes da automacao.');
      if (!calendarResponse.ok) throw new Error('Nao foi possivel carregar o status do Google Agenda.');

      const settingsPayload = await settingsResponse.json();
      const calendarPayload = await calendarResponse.json();

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(settingsPayload.data ?? settingsPayload),
      });
      setCalendarStatus(calendarPayload.data ?? calendarPayload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha inesperada ao carregar o builder oficial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = <K extends keyof CommunicationSettings>(field: K, value: CommunicationSettings[K]) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/communication/settings`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Nao foi possivel salvar a configuracao do Omnius.');

      const payload = await response.json();
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(payload.data ?? payload),
      });
      setSuccess('Configuracoes salvas com sucesso.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha inesperada ao salvar as configuracoes.');
    } finally {
      setSaving(false);
    }
  };

  const connectCalendar = async () => {
    setRefreshingCalendar(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/communication/calendar/auth-url`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Nao foi possivel iniciar a autenticacao do Google Agenda.');

      const payload = await response.json();
      const authUrl = (payload.data ?? payload)?.authUrl as string | undefined;
      if (!authUrl) throw new Error('A URL de autenticacao do Google Agenda nao foi retornada.');

      window.open(authUrl, '_blank', 'noopener,noreferrer');
      setSuccess('Janela de autorizacao aberta. Atualize o status apos concluir o login.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao iniciar a conexao com o Google Agenda.');
    } finally {
      setRefreshingCalendar(false);
    }
  };

  const refreshCalendar = async () => {
    setRefreshingCalendar(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/communication/calendar/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Nao foi possivel atualizar o status do Google Agenda.');

      const payload = await response.json();
      setCalendarStatus(payload.data ?? payload);
      setSuccess('Status da agenda atualizado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao atualizar o status do Google Agenda.');
    } finally {
      setRefreshingCalendar(false);
    }
  };

  const activeEngineLabel = settings.aiEngine === 'gemini' ? 'Gemini' : 'GPT';
  const calendarConnected = Boolean(calendarStatus?.isConnected || calendarStatus?.authenticated);
  const calendarUser = calendarStatus?.userEmail ?? calendarStatus?.user?.email ?? calendarStatus?.user?.name ?? null;

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
        <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando configuracao oficial do Omnius...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="overflow-hidden rounded-[22px] border border-slate-950 bg-slate-950 p-6 text-white shadow-[0_18px_42px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-300">Automacoes WhatsApp</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Omnius 6.0</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Configure IA, chaves, agenda e comportamento da instancia oficial.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void refreshCalendar()}
              disabled={refreshingCalendar}
              className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-white/15 bg-white/10 px-4 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingCalendar ? 'animate-spin' : ''}`} />
              Atualizar status
            </button>
            <button
              onClick={() => void saveSettings()}
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-teal-400 px-4 text-xs font-black text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar configuracao'}
            </button>
          </div>
        </div>
      </section>

      {error ? <Notice tone="error" text={error} /> : null}
      {success ? <Notice tone="success" text={success} /> : null}

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <main className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-950 text-white">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Configuracao centralizada</h2>
              <p className="text-xs font-semibold text-slate-500">Gemini, GPT e agenda usam a mesma fonte por empresa.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Engine principal">
              <select
                value={settings.aiEngine}
                onChange={(event) => updateField('aiEngine', event.target.value as 'gemini' | 'gpt')}
                className="h-11 rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950"
              >
                <option value="gemini">Gemini</option>
                <option value="gpt">GPT</option>
              </select>
            </Field>

            <Field label="Temperatura">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={settings.temperature}
                onChange={(event) => updateField('temperature', Number(event.target.value))}
                className="h-11 rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-slate-950"
              />
            </Field>

            <Field label="Chave Gemini do cliente" wide>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(event) => updateField('geminiApiKey', event.target.value)}
                placeholder="Cole a chave Gemini do cliente"
                className="h-11 rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-950"
              />
            </Field>

            <Field label="Chave OpenAI/GPT do cliente" wide>
              <input
                type="password"
                value={settings.openAiApiKey}
                onChange={(event) => updateField('openAiApiKey', event.target.value)}
                placeholder="Cole a chave OpenAI do cliente"
                className="h-11 rounded-[14px] border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-950"
              />
            </Field>

            <Field label="Prompt base do atendimento" wide>
              <textarea
                value={settings.prompt}
                onChange={(event) => updateField('prompt', event.target.value)}
                rows={7}
                placeholder="Defina aqui o comportamento da IA do WhatsApp."
                className="resize-none rounded-[16px] border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-950"
              />
            </Field>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ToggleCard
              icon={<Bot className="h-4 w-4" />}
              title="IA ativa"
              description="Permite resposta automatica no Omnius."
              checked={settings.aiEnabled}
              onChange={(checked) => updateField('aiEnabled', checked)}
            />
            <ToggleCard
              icon={<CalendarDays className="h-4 w-4" />}
              title="Agendamento automatico"
              description="Habilita roteamento para Google Agenda."
              checked={settings.automaticSchedulingEnabled}
              onChange={(checked) => updateField('automaticSchedulingEnabled', checked)}
            />
            <ToggleCard
              icon={<MessageSquare className="h-4 w-4" />}
              title="Mensagem de calendario"
              description="Usa confirmacao customizada apos agendar."
              checked={settings.customCalendarMessageEnabled}
              onChange={(checked) => updateField('customCalendarMessageEnabled', checked)}
            />
          </div>
        </main>

        <aside className="space-y-5">
          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <PanelHeader icon={<Sparkles className="h-5 w-5" />} title="Resumo ativo" />
            <div className="space-y-3">
              <StatusRow label="Engine selecionada" value={activeEngineLabel} />
              <StatusRow label="Chave Gemini" value={settings.geminiApiKey ? 'Configurada' : 'Nao configurada'} />
              <StatusRow label="Chave GPT" value={settings.openAiApiKey ? 'Configurada' : 'Nao configurada'} />
              <StatusRow label="IA" value={settings.aiEnabled ? 'Ativa' : 'Desativada'} />
              <StatusRow label="Agenda automatica" value={settings.automaticSchedulingEnabled ? 'Ativa' : 'Desativada'} />
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <PanelHeader icon={<CalendarDays className="h-5 w-5" />} title="Google Agenda" />
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-950">
                <CheckCircle2 className={`h-4 w-4 ${calendarConnected ? 'text-emerald-600' : 'text-slate-400'}`} />
                {calendarConnected ? 'Google Agenda conectado' : 'Google Agenda nao conectado'}
              </div>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                {calendarConnected
                  ? `Conta ativa: ${calendarUser ?? 'usuario autenticado'}`
                  : 'Conecte a conta do cliente para manter os fluxos de agendamento.'}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void connectCalendar()}
                disabled={refreshingCalendar}
                className="inline-flex h-10 items-center gap-2 rounded-[13px] bg-slate-950 px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarDays className="h-4 w-4" />
                Conectar Agenda
              </button>
              <button
                onClick={() => void refreshCalendar()}
                disabled={refreshingCalendar}
                className="inline-flex h-10 items-center gap-2 rounded-[13px] border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingCalendar ? 'animate-spin' : ''}`} />
                Revalidar
              </button>
            </div>
          </section>

          <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
            <PanelHeader icon={<Cpu className="h-5 w-5" />} title="Fonte unica" />
            <ul className="space-y-2 text-sm font-semibold text-slate-600">
              <li className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">communication/settings centraliza IA e toggles.</li>
              <li className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">communication/calendar preserva o OAuth.</li>
              <li className="rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">Chat usa somente a borda Nest atual.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}

function Notice({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`rounded-[16px] border px-4 py-3 text-sm font-bold ${
        tone === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
      }`}
    >
      {text}
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-2 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-[18px] border p-4 text-left transition ${
        checked ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-slate-50 hover:border-slate-950 hover:bg-white'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`rounded-[12px] p-2 ${checked ? 'bg-white text-teal-700' : 'bg-white text-slate-600'}`}>{icon}</div>
        <div className={`h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-teal-500' : 'bg-slate-300'}`}>
          <div className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </div>
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </button>
  );
}

function PanelHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-slate-950 text-white">{icon}</div>
      <h2 className="text-base font-black text-slate-950">{title}</h2>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-xs font-black text-slate-950">{value}</span>
    </div>
  );
}
