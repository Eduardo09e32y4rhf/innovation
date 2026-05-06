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
  authenticated: boolean;
  authUrl?: string | null;
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
  temperature: 0.7,
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

      if (!settingsResponse.ok) {
        throw new Error('Nao foi possivel carregar as configuracoes da automacao.');
      }

      if (!calendarResponse.ok) {
        throw new Error('Nao foi possivel carregar o status do Google Agenda.');
      }

      const settingsPayload = await settingsResponse.json();
      const calendarPayload = await calendarResponse.json();

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(settingsPayload.data ?? settingsPayload),
      });
      setCalendarStatus(calendarPayload.data ?? calendarPayload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha inesperada ao carregar o builder oficial.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = <K extends keyof CommunicationSettings>(
    field: K,
    value: CommunicationSettings[K],
  ) => {
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

      if (!response.ok) {
        throw new Error('Nao foi possivel salvar a configuracao do Omnius.');
      }

      const payload = await response.json();
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(payload.data ?? payload),
      });
      setSuccess('Configuracoes salvas com sucesso.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha inesperada ao salvar as configuracoes.',
      );
    } finally {
      setSaving(false);
    }
  };

  const connectCalendar = async () => {
    setRefreshingCalendar(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/communication/calendar/auth-url`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Nao foi possivel iniciar a autenticacao do Google Agenda.');
      }

      const payload = await response.json();
      const authUrl = (payload.data ?? payload)?.authUrl as string | undefined;

      if (!authUrl) {
        throw new Error('A URL de autenticacao do Google Agenda nao foi retornada.');
      }

      window.open(authUrl, '_blank', 'noopener,noreferrer');
      setSuccess('Janela de autorizacao aberta. Atualize o status apos concluir o login.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha ao iniciar a conexao com o Google Agenda.',
      );
    } finally {
      setRefreshingCalendar(false);
    }
  };

  const refreshCalendar = async () => {
    setRefreshingCalendar(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/communication/calendar/status`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Nao foi possivel atualizar o status do Google Agenda.');
      }

      const payload = await response.json();
      setCalendarStatus(payload.data ?? payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Falha ao atualizar o status do Google Agenda.',
      );
    } finally {
      setRefreshingCalendar(false);
    }
  };

  const activeEngineLabel = settings.aiEngine === 'gemini' ? 'Gemini' : 'GPT';

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-gray-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando configuracao oficial do Omnius...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
            Builder Oficial
          </p>
          <h1 className="text-3xl font-semibold text-white">Automacao Omnius 6.0</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Esta pagina agora usa a mesma configuracao central do CRM WhatsApp para IA,
            Google Agenda e roteamento da instancia oficial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void refreshCalendar()}
            disabled={refreshingCalendar}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingCalendar ? 'animate-spin' : ''}`} />
            Atualizar status
          </button>
          <button
            onClick={() => void saveSettings()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar configuracao'}
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-[#07111f] p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Configuracao centralizada</h2>
              <p className="text-sm text-gray-400">
                Gemini, GPT e agendamento usam a mesma fonte de verdade por empresa.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Engine principal</span>
              <select
                value={settings.aiEngine}
                onChange={(event) => updateField('aiEngine', event.target.value as 'gemini' | 'gpt')}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              >
                <option value="gemini">Gemini</option>
                <option value="gpt">GPT</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm text-gray-300">Temperatura</span>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(event) => updateField('temperature', Number(event.target.value))}
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm text-gray-300">Chave Gemini do cliente</span>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(event) => updateField('geminiApiKey', event.target.value)}
                placeholder="Cole a chave Gemini do cliente"
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm text-gray-300">Chave OpenAI/GPT do cliente</span>
              <input
                type="password"
                value={settings.openAiApiKey}
                onChange={(event) => updateField('openAiApiKey', event.target.value)}
                placeholder="Cole a chave OpenAI do cliente"
                className="rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm text-gray-300">Prompt base do atendimento</span>
              <textarea
                value={settings.prompt}
                onChange={(event) => updateField('prompt', event.target.value)}
                rows={7}
                placeholder="Defina aqui o comportamento da IA do WhatsApp."
                className="rounded-3xl border border-white/10 bg-slate-950 px-4 py-4 text-sm text-white outline-none transition focus:border-cyan-400"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#091423] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-white">Resumo ativo</h2>
                <p className="text-sm text-gray-400">Estado corrente da instancia oficial.</p>
              </div>
            </div>

            <div className="space-y-3">
              <StatusRow label="Engine selecionada" value={activeEngineLabel} />
              <StatusRow label="Chave Gemini" value={settings.geminiApiKey ? 'Configurada' : 'Nao configurada'} />
              <StatusRow label="Chave GPT" value={settings.openAiApiKey ? 'Configurada' : 'Nao configurada'} />
              <StatusRow label="IA" value={settings.aiEnabled ? 'Ativa' : 'Desativada'} />
              <StatusRow
                label="Agenda automatica"
                value={settings.automaticSchedulingEnabled ? 'Ativa' : 'Desativada'}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#091423] p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-300">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-white">Google Agenda</h2>
                <p className="text-sm text-gray-400">Fluxo preservado do Omnius para OAuth e agenda.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm text-white">
                <CheckCircle2
                  className={`h-4 w-4 ${
                    calendarStatus?.authenticated ? 'text-emerald-400' : 'text-gray-500'
                  }`}
                />
                {calendarStatus?.authenticated ? 'Google Agenda conectado' : 'Google Agenda nao conectado'}
              </div>

              <p className="text-sm text-gray-400">
                {calendarStatus?.authenticated
                  ? `Conta ativa: ${calendarStatus.user?.email ?? calendarStatus.user?.name ?? 'usuario autenticado'}`
                  : 'Conecte a conta do cliente para manter os fluxos de agendamento ja validados.'}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => void connectCalendar()}
                disabled={refreshingCalendar}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarDays className="h-4 w-4" />
                Conectar Agenda
              </button>
              <button
                onClick={() => void refreshCalendar()}
                disabled={refreshingCalendar}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingCalendar ? 'animate-spin' : ''}`} />
                Revalidar
              </button>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-[#091423] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-500/15 p-3 text-cyan-300">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-white">Fonte unica</h2>
                <p className="text-sm text-gray-400">
                  Accounts, chat e builder agora compartilham a mesma borda Nest.
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-gray-300">
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                `communication/settings` centraliza IA, chaves e toggles.
              </li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                `communication/calendar/*` preserva o fluxo OAuth do Omnius.
              </li>
              <li className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                O chat consome somente `communication/chats` e `communication/messages/send`.
              </li>
            </ul>
          </section>
        </div>
      </section>
    </div>
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
      className={`rounded-3xl border p-4 text-left transition ${
        checked
          ? 'border-cyan-400/50 bg-cyan-500/10'
          : 'border-white/10 bg-slate-950/60 hover:bg-white/5'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded-2xl bg-white/5 p-2 text-cyan-300">{icon}</div>
        <div
          className={`h-6 w-11 rounded-full p-1 transition ${
            checked ? 'bg-cyan-400' : 'bg-white/10'
          }`}
        >
          <div
            className={`h-4 w-4 rounded-full bg-slate-950 transition ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
