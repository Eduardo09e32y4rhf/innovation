'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  Briefcase,
  CheckCircle2,
  Clock3,
  Filter,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sparkles,
  Star,
  Table2,
  User,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl, getAuthHeaders } from '../../whatsapp/api';

type ApplicationStatus = 'APPLIED' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';
type Sentiment = 'POSITIVE' | 'ATTENTION' | 'NEUTRAL' | 'NEGATIVE';
type Tab = 'pipeline' | 'list' | 'ai' | 'messages';
type ScoreFilter = 'all' | 'high' | 'medium' | 'low';
type ContactFilter = 'all' | 'with-phone' | 'without-phone';

type Job = {
  id: string;
  title: string;
};

type Candidate = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  coverLetter?: string | null;
  aiScore?: number | null;
  aiSummary?: string | null;
  aiNotes?: string | null;
  aiSkills?: string[];
  lastSentiment?: string | null;
  applications?: Array<{ id: string; status: string; job: Job }>;
};

type Application = {
  id: string;
  status: ApplicationStatus | string;
  candidate: Candidate;
  job: Job;
  createdAt?: string;
  updatedAt?: string;
  source?: string;
  lastAction?: string;
  isDemo?: boolean;
};

type TransitionReview = {
  applicationId: string;
  currentStatus: string;
  recommendedStatus: ApplicationStatus | string;
  isDemo?: boolean;
  ai: {
    score: number;
    confidence: number;
    reasons: string[];
    summary: string;
  };
  whatsapp: {
    enabled: boolean;
    phone: string | null;
    preview: string;
  };
  candidate: {
    id: string;
    name: string;
    phone?: string | null;
  };
  job: {
    id: string;
    title: string;
  };
};

type MessageEvent = {
  id: string;
  candidateName: string;
  status: string;
  message: string;
  sent: boolean;
  demo?: boolean;
  createdAt: string;
};

const COLUMNS: Array<{ id: ApplicationStatus; title: string; color: string; dot: string }> = [
  { id: 'APPLIED', title: 'Novos', color: 'border-blue-200 bg-blue-50', dot: 'bg-blue-500' },
  { id: 'SCREENING', title: 'Triagem IA', color: 'border-violet-200 bg-violet-50', dot: 'bg-violet-500' },
  { id: 'INTERVIEW', title: 'Entrevista', color: 'border-amber-200 bg-amber-50', dot: 'bg-amber-500' },
  { id: 'OFFER', title: 'Oferta', color: 'border-cyan-200 bg-cyan-50', dot: 'bg-cyan-500' },
  { id: 'HIRED', title: 'Contratado', color: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500' },
  { id: 'REJECTED', title: 'Rejeitado', color: 'border-rose-200 bg-rose-50', dot: 'bg-rose-500' },
];

const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
  { id: 'pipeline', label: 'Pipeline', icon: LayoutDashboard },
  { id: 'list', label: 'Lista', icon: Table2 },
  { id: 'ai', label: 'IA', icon: Sparkles },
  { id: 'messages', label: 'Mensagens', icon: MessageSquare },
];

const statusLabels = Object.fromEntries(COLUMNS.map((column) => [column.id, column.title])) as Record<string, string>;

const scoreBucket = (score: number) => (score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low');

const normalizeSentiment = (sentiment?: string | null): Sentiment => {
  if (sentiment === 'POSITIVE' || sentiment === 'ATTENTION' || sentiment === 'NEGATIVE') return sentiment;
  return 'NEUTRAL';
};

const buildStageMessage = (application: Application, status: string) => {
  const name = application.candidate.name.split(' ')[0] || application.candidate.name;
  const job = application.job.title;
  const templates: Record<string, string> = {
    APPLIED: `Ola, ${name}! Recebemos sua candidatura para ${job}. Nosso time de RH vai analisar seu perfil e retorna em breve.`,
    SCREENING: `Ola, ${name}! Sua candidatura para ${job} entrou na triagem com nosso time de RH. Obrigado por participar do processo.`,
    INTERVIEW: `Ola, ${name}! Boa noticia: voce avancou para a etapa de entrevista da vaga ${job}. Em breve enviaremos os proximos detalhes.`,
    OFFER: `Ola, ${name}! Voce avancou para a etapa de proposta da vaga ${job}. Nosso time vai compartilhar os detalhes com voce.`,
    HIRED: `Ola, ${name}! Parabens, sua contratacao para ${job} foi aprovada. Vamos seguir com os proximos passos de admissao.`,
    REJECTED: `Ola, ${name}. Agradecemos sua participacao no processo para ${job}. Neste momento seguiremos com outro perfil, mas manteremos seu contato para futuras oportunidades.`,
  };
  return templates[status] ?? templates.SCREENING;
};

const buildLocalReview = (application: Application, status: ApplicationStatus): TransitionReview => {
  const score = application.candidate.aiScore ?? 0;
  const reasons = [
    score >= 80 ? 'Score IA alto para a vaga selecionada.' : score >= 55 ? 'Score intermediario, vale revisar antes de avancar.' : 'Score baixo, avancar exige validacao humana.',
    application.candidate.phone ? 'Telefone disponivel para WhatsApp.' : 'Candidato sem telefone cadastrado.',
    application.candidate.aiSkills?.length ? `Skills detectadas: ${application.candidate.aiSkills.slice(0, 3).join(', ')}.` : 'Sem skills detectadas pela IA.',
  ];

  return {
    applicationId: application.id,
    currentStatus: application.status,
    recommendedStatus: status,
    isDemo: true,
    ai: {
      score,
      confidence: Math.min(97, Math.max(52, score + (status === 'REJECTED' ? 8 : 3))),
      reasons,
      summary: application.candidate.aiSummary ?? 'Analise IA simulada para dados de exemplo.',
    },
    whatsapp: {
      enabled: Boolean(application.candidate.phone),
      phone: application.candidate.phone ?? null,
      preview: buildStageMessage(application, status),
    },
    candidate: {
      id: application.candidate.id,
      name: application.candidate.name,
      phone: application.candidate.phone,
    },
    job: application.job,
  };
};

const normalizeApplications = (payload: unknown): Application[] => {
  const raw = payload as any;
  const items = raw?.data?.applications ?? raw?.applications ?? raw?.data ?? raw;
  return Array.isArray(items) ? (items as Application[]) : [];
};

export default function PipelinePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedingExamples, setSeedingExamples] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('pipeline');
  const [search, setSearch] = useState('');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | Sentiment>('all');
  const [stageFilter, setStageFilter] = useState<'all' | ApplicationStatus>('all');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');
  const [selected, setSelected] = useState<Application | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [transitionReview, setTransitionReview] = useState<TransitionReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [confirmingTransition, setConfirmingTransition] = useState(false);
  const [notifyCandidate, setNotifyCandidate] = useState(true);
  const [messagePreview, setMessagePreview] = useState('');
  const [messageEvents, setMessageEvents] = useState<MessageEvent[]>([]);

  const loadApplications = async () => {
    setLoading(true);
    setFeedback('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/applications`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('API indisponivel');
      const data = await response.json();
      const items = normalizeApplications(data);

      setApplications(items);
      setUsingDemo(false);
      setApiOffline(false);
      setSelected((current) => current ?? items[0] ?? null);
    } catch {
      setApplications([]);
      setUsingDemo(false);
      setApiOffline(true);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const createRealExamples = async () => {
    setSeedingExamples(true);
    setFeedback('');
    try {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/examples`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error('Entre no sistema para criar candidatos reais na API.');
        throw new Error('Nao foi possivel criar candidatos reais agora.');
      }

      const payload = await response.json();
      const items = normalizeApplications(payload);
      if (!items.length) throw new Error('A API nao retornou candidaturas apos criar os exemplos.');

      setApplications(items);
      setUsingDemo(false);
      setApiOffline(false);
      setSelected(items[0]);
      setFeedback(payload.created ? 'Candidatos reais criados no backend e carregados no pipeline.' : 'Candidatos reais existentes carregados no pipeline.');
    } catch (error) {
      setFeedback((error as Error).message || 'Nao foi possivel criar candidatos reais.');
    } finally {
      setSeedingExamples(false);
    }
  };

  const loadWhatsappStatus = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/communication/whatsapp/status`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('whatsapp offline');
      const payload = await response.json();
      const status = payload.data?.status ?? payload.status ?? payload.data?.state;
      setWhatsappConnected(String(status).toUpperCase().includes('CONNECTED') || Boolean(payload.data?.connected));
    } catch {
      setWhatsappConnected(false);
    }
  };

  useEffect(() => {
    void loadApplications();
    void loadWhatsappStatus();
  }, []);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((application) => {
      const score = application.candidate.aiScore ?? 0;
      const sentiment = normalizeSentiment(application.candidate.lastSentiment);
      const haystack = [
        application.candidate.name,
        application.candidate.email,
        application.candidate.phone,
        application.job.title,
        application.source,
        application.status,
        ...(application.candidate.aiSkills ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !haystack.includes(query)) return false;
      if (scoreFilter !== 'all' && scoreBucket(score) !== scoreFilter) return false;
      if (sentimentFilter !== 'all' && sentiment !== sentimentFilter) return false;
      if (stageFilter !== 'all' && application.status !== stageFilter) return false;
      if (contactFilter === 'with-phone' && !application.candidate.phone) return false;
      if (contactFilter === 'without-phone' && application.candidate.phone) return false;

      return true;
    });
  }, [applications, contactFilter, scoreFilter, search, sentimentFilter, stageFilter]);

  const applicationsByStatus = useMemo(() => {
    return COLUMNS.reduce<Record<string, Application[]>>((accumulator, column) => {
      accumulator[column.id] = filteredApplications.filter((application) => application.status === column.id);
      return accumulator;
    }, {});
  }, [filteredApplications]);

  const metrics = useMemo(() => {
    const highScore = applications.filter((application) => (application.candidate.aiScore ?? 0) >= 80).length;
    const withPhone = applications.filter((application) => application.candidate.phone).length;
    const needsReview = applications.filter((application) => {
      const score = application.candidate.aiScore ?? 0;
      const sentiment = normalizeSentiment(application.candidate.lastSentiment);
      return score < 65 || sentiment === 'ATTENTION' || !application.candidate.phone;
    }).length;

    return {
      total: applications.length,
      filtered: filteredApplications.length,
      highScore,
      withPhone,
      needsReview,
    };
  }, [applications, filteredApplications.length]);

  const rankedApplications = useMemo(() => {
    return [...filteredApplications].sort((left, right) => (right.candidate.aiScore ?? 0) - (left.candidate.aiScore ?? 0));
  }, [filteredApplications]);

  const recruiterNotes = selected?.candidate.aiNotes?.split('\n').filter(Boolean) ?? [];

  const selectApplication = (application: Application) => {
    setSelected(application);
    setFeedback('');
  };

  const resetFilters = () => {
    setSearch('');
    setScoreFilter('all');
    setSentimentFilter('all');
    setStageFilter('all');
    setContactFilter('all');
  };

  const requestTransitionReview = async (application: Application, status: ApplicationStatus) => {
    setSelected(application);
    setReviewLoading(true);
    setFeedback('');

    try {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/applications/${application.id}/transition/review`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Nao foi possivel revisar a transicao');
      const payload = await response.json();
      const review = (payload.data ?? payload) as TransitionReview;
      setTransitionReview(review);
      setNotifyCandidate(Boolean(review.whatsapp?.enabled));
      setMessagePreview(review.whatsapp?.preview ?? '');
    } catch {
      setFeedback('Nao foi possivel gerar a validacao IA agora. Tente novamente em instantes.');
    } finally {
      setReviewLoading(false);
    }
  };

  const confirmTransition = async () => {
    if (!transitionReview) return;
    setConfirmingTransition(true);
    setFeedback('');

    const addMessageEvent = (sent: boolean, demo?: boolean) => {
      setMessageEvents((current) => [
        {
          id: `${transitionReview.applicationId}-${Date.now()}`,
          candidateName: transitionReview.candidate.name,
          status: transitionReview.recommendedStatus,
          message: messagePreview,
          sent,
          demo,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
    };

    try {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/applications/${transitionReview.applicationId}/transition/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: transitionReview.recommendedStatus,
          confirmed: true,
          notifyCandidate,
          message: messagePreview,
        }),
      });
      if (!response.ok) throw new Error('Confirmacao falhou');
      const payload = await response.json();
      const updated = (payload.data?.application ?? payload.application) as Application | undefined;
      const whatsapp = payload.data?.whatsapp ?? payload.whatsapp;

      if (updated) {
        setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setSelected((current) => (current?.id === updated.id ? updated : current));
      }

      addMessageEvent(Boolean(whatsapp?.sent), false);
      setFeedback(
        whatsapp?.sent
          ? 'Etapa alterada e WhatsApp enviado com sucesso.'
          : 'Etapa alterada. WhatsApp nao foi enviado ou ficou pendente.',
      );
      setTransitionReview(null);
    } catch {
      setFeedback('Nao foi possivel confirmar a alteracao. Nenhuma mensagem foi enviada.');
    } finally {
      setConfirmingTransition(false);
    }
  };

  const saveNote = async () => {
    if (!selected || !noteInput.trim()) return;
    setSavingNote(true);
    const currentNotes = selected.candidate.aiNotes?.trim();
    const nextNotes = [currentNotes, noteInput.trim()].filter(Boolean).join('\n');

    try {
      const response = await fetch(`${getApiBaseUrl()}/recruitment/candidates/${selected.candidate.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ aiNotes: nextNotes }),
      });

      if (response.ok) {
        const payload = await response.json();
        const updatedCandidate = payload.data ?? payload;
        setApplications((current) =>
          current.map((item) =>
            item.candidate.id === updatedCandidate.id ? { ...item, candidate: { ...item.candidate, ...updatedCandidate } } : item,
          ),
        );
        setSelected((current) => (current ? { ...current, candidate: { ...current.candidate, ...updatedCandidate } } : current));
        setNoteInput('');
      }
    } finally {
      setSavingNote(false);
    }
  };

  const CandidateCard = ({ application }: { application: Application }) => {
    const score = application.candidate.aiScore ?? 0;
    const sentiment = normalizeSentiment(application.candidate.lastSentiment);
    return (
      <button
        onClick={() => selectApplication(application)}
        className={`w-full rounded-[18px] border bg-white p-4 text-left shadow-[0_14px_30px_rgba(15,23,42,0.09)] transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-[0_18px_34px_rgba(15,23,42,0.15)] ${
          selected?.id === application.id ? 'border-slate-950 ring-2 ring-slate-950/10' : 'border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#07111f] text-white shadow-[0_10px_20px_rgba(2,6,23,0.22)]">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{application.candidate.name}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{application.job.title}</p>
            </div>
          </div>
          {application.isDemo ? <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-500">demo</span> : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-950">
            <Star size={11} className="fill-amber-400 text-amber-400" /> {score}
          </span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${sentimentClass(sentiment)}`}>{sentimentLabel(sentiment)}</span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${application.candidate.phone ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
            {application.candidate.phone ? 'com telefone' : 'sem telefone'}
          </span>
        </div>

        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{application.candidate.aiSummary || 'Analise IA pendente.'}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(application.candidate.aiSkills ?? []).slice(0, 3).map((skill) => (
            <span key={skill} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
              {skill}
            </span>
          ))}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-[24px] border border-slate-950 bg-[#07111f] p-6 text-white shadow-[0_24px_60px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-200">Recursos Humanos</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white">Pipeline de Recrutamento</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Triagem com IA, confirmacao manual de etapa e envio seguro por WhatsApp para cada candidato.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone={usingDemo ? 'amber' : 'emerald'} label={usingDemo ? 'Usando exemplos' : 'Dados reais'} />
              <StatusPill tone={apiOffline ? 'rose' : 'slate'} label={apiOffline ? 'API offline' : 'API online'} />
              <StatusPill tone={whatsappConnected ? 'emerald' : 'amber'} label={whatsappConnected ? 'WhatsApp conectado' : 'WhatsApp pendente'} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:w-[520px]">
            <MetricCard label="Candidaturas" value={metrics.total} />
            <MetricCard label="Filtrados" value={metrics.filtered} />
            <MetricCard label="Score alto" value={metrics.highScore} />
            <MetricCard label="Revisao" value={metrics.needsReview} />
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-300 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail, telefone, vaga ou skill..."
              className="h-11 w-full rounded-[14px] border border-slate-300 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
            />
          </div>
          <FilterSelect value={scoreFilter} onChange={(value) => setScoreFilter(value as ScoreFilter)} options={[['all', 'Todos scores'], ['high', 'Alto'], ['medium', 'Medio'], ['low', 'Baixo']]} />
          <FilterSelect value={sentimentFilter} onChange={(value) => setSentimentFilter(value as 'all' | Sentiment)} options={[['all', 'Todo sentimento'], ['POSITIVE', 'Positivo'], ['ATTENTION', 'Atencao'], ['NEUTRAL', 'Neutro'], ['NEGATIVE', 'Negativo']]} />
          <FilterSelect value={stageFilter} onChange={(value) => setStageFilter(value as 'all' | ApplicationStatus)} options={[['all', 'Todas etapas'], ...COLUMNS.map((column) => [column.id, column.title] as [string, string])]} />
          <FilterSelect value={contactFilter} onChange={(value) => setContactFilter(value as ContactFilter)} options={[['all', 'Todos contatos'], ['with-phone', 'Com telefone'], ['without-phone', 'Sem telefone']]} />
          <button onClick={resetFilters} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:border-slate-950">
            Limpar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-10 items-center gap-2 rounded-[14px] border px-4 text-xs font-black transition ${
                  activeTab === tab.id
                    ? 'border-slate-950 bg-[#07111f] text-white shadow-[0_12px_24px_rgba(2,6,23,0.20)]'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-950'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {feedback ? (
        <div className="rounded-[18px] border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900 shadow-sm">{feedback}</div>
      ) : null}

      {usingDemo ? (
        <div className="flex flex-col gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm md:flex-row md:items-center md:justify-between">
          <span>
            Exemplos ativos: voce pode testar filtros, abas, notas e mudancas de etapa. Para aparecer candidato real aqui, crie os dados no backend.
          </span>
          <button
            onClick={() => void createRealExamples()}
            disabled={seedingExamples}
            className="h-10 shrink-0 rounded-[14px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(2,6,23,0.20)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {seedingExamples ? 'Criando...' : 'Criar candidatos reais'}
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <main className="min-w-0">
          {loading ? <LoadingState /> : null}
          {!loading && filteredApplications.length === 0 ? <EmptyState onReset={resetFilters} /> : null}
          {!loading && filteredApplications.length > 0 && activeTab === 'pipeline' ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map((column) => (
                <section key={column.id} className={`flex min-h-[560px] min-w-[286px] flex-col rounded-[22px] border p-3 shadow-[0_14px_32px_rgba(15,23,42,0.11)] ${column.color}`}>
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${column.dot} shadow-[0_0_0_4px_rgba(255,255,255,0.8)]`} />
                    <h2 className="flex-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700">{column.title}</h2>
                    <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-black text-slate-700">{applicationsByStatus[column.id]?.length ?? 0}</span>
                  </div>
                  <div className="space-y-3 overflow-y-auto pr-1">
                    {(applicationsByStatus[column.id] ?? []).map((application) => (
                      <CandidateCard key={application.id} application={application} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
          {!loading && filteredApplications.length > 0 && activeTab === 'list' ? (
            <ListTab applications={filteredApplications} selectedId={selected?.id} onSelect={selectApplication} onMove={requestTransitionReview} />
          ) : null}
          {!loading && filteredApplications.length > 0 && activeTab === 'ai' ? (
            <AiTab applications={rankedApplications} onSelect={selectApplication} onMove={requestTransitionReview} />
          ) : null}
          {!loading && filteredApplications.length > 0 && activeTab === 'messages' ? (
            <MessagesTab applications={filteredApplications} events={messageEvents} selected={selected} onMove={requestTransitionReview} />
          ) : null}
        </main>

        <CandidatePanel
          selected={selected}
          notes={recruiterNotes}
          noteInput={noteInput}
          savingNote={savingNote}
          reviewLoading={reviewLoading}
          onNoteInput={setNoteInput}
          onSaveNote={saveNote}
          onMove={requestTransitionReview}
        />
      </div>

      {transitionReview ? (
        <TransitionModal
          review={transitionReview}
          notifyCandidate={notifyCandidate}
          messagePreview={messagePreview}
          confirming={confirmingTransition}
          whatsappConnected={whatsappConnected}
          onNotifyChange={setNotifyCandidate}
          onMessageChange={setMessagePreview}
          onClose={() => setTransitionReview(null)}
          onConfirm={confirmTransition}
        />
      ) : null}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/8 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' }) {
  const classes = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
    rose: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
    slate: 'border-slate-300/20 bg-slate-300/10 text-slate-200',
  };
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${classes[tone]}`}>{label}</span>;
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-[14px] border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-64 animate-pulse rounded-[22px] border border-slate-200 bg-slate-100 shadow-sm" />
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-[22px] border border-slate-300 bg-white p-10 text-center shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <Filter className="mx-auto text-slate-400" size={28} />
      <h2 className="mt-4 text-lg font-black text-slate-950">Nenhum candidato encontrado</h2>
      <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou limpe a busca para ver o pipeline novamente.</p>
      <button onClick={onReset} className="mt-5 rounded-[14px] bg-[#07111f] px-4 py-2 text-xs font-black text-white shadow-lg">
        Limpar filtros
      </button>
    </div>
  );
}

function CandidatePanel({
  selected,
  notes,
  noteInput,
  savingNote,
  reviewLoading,
  onNoteInput,
  onSaveNote,
  onMove,
}: {
  selected: Application | null;
  notes: string[];
  noteInput: string;
  savingNote: boolean;
  reviewLoading: boolean;
  onNoteInput: (value: string) => void;
  onSaveNote: () => void;
  onMove: (application: Application, status: ApplicationStatus) => void;
}) {
  if (!selected) {
    return (
      <aside className="rounded-[22px] border border-slate-300 bg-white p-6 shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
        <Users className="text-slate-400" size={24} />
        <p className="mt-3 text-sm font-black text-slate-950">Selecione um candidato</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">O perfil, resumo IA, notas e acoes aparecem aqui.</p>
      </aside>
    );
  }

  const score = selected.candidate.aiScore ?? 0;
  const sentiment = normalizeSentiment(selected.candidate.lastSentiment);

  return (
    <aside className="h-fit overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.13)]">
      <div className="border-b border-slate-200 bg-[#07111f] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-200">Perfil selecionado</p>
            <h2 className="mt-2 text-xl font-black text-white">{selected.candidate.name}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">{selected.job.title}</p>
          </div>
          {selected.isDemo ? <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-black text-white">demo</span> : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid grid-cols-2 gap-3">
          <InfoTile icon={Star} label="Score IA" value={`${score}`} />
          <InfoTile icon={Phone} label="Contato" value={selected.candidate.phone ? 'WhatsApp ok' : 'Sem telefone'} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Aderencia</span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${sentimentClass(sentiment)}`}>{sentimentLabel(sentiment)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-slate-950" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{selected.candidate.aiSummary || 'Analise IA pendente.'}</p>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Skills</p>
          <div className="flex flex-wrap gap-2">
            {(selected.candidate.aiSkills ?? []).length ? (
              selected.candidate.aiSkills?.map((skill) => (
                <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs font-semibold text-slate-500">Sem skills detectadas.</span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Mover etapa</p>
          <div className="grid grid-cols-2 gap-2">
            {COLUMNS.map((column) => (
              <button
                key={column.id}
                onClick={() => onMove(selected, column.id)}
                disabled={reviewLoading}
                className={`rounded-[14px] border px-3 py-2 text-xs font-black transition disabled:opacity-60 ${
                  selected.status === column.id ? 'border-slate-950 bg-[#07111f] text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-950'
                }`}
              >
                {column.title}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            <MessageSquare size={12} /> Historico e notas
          </p>
          <div className="space-y-2">
            {selected.lastAction ? <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-700">{selected.lastAction}</div> : null}
            {notes.map((note, index) => (
              <div key={`${note}-${index}`} className="rounded-[14px] border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600 shadow-sm">
                {note}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={noteInput}
            onChange={(event) => onNoteInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSaveNote()}
            placeholder="Adicionar observacao..."
            className="h-10 min-w-0 flex-1 rounded-[14px] border border-slate-300 px-3 text-xs font-semibold outline-none focus:border-slate-950"
          />
          <button onClick={onSaveNote} disabled={savingNote} className="h-10 rounded-[14px] bg-[#07111f] px-3 text-white shadow-lg disabled:opacity-60">
            <Send size={15} />
          </button>
        </div>

        <Link href={`/dashboard/rh/candidate?id=${selected.candidate.id}`} className="block rounded-[14px] border border-slate-300 px-4 py-3 text-center text-xs font-black text-slate-700 hover:border-slate-950">
          Abrir perfil completo
        </Link>
      </div>
    </aside>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
      <Icon size={15} className="text-slate-500" />
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ListTab({
  applications,
  selectedId,
  onSelect,
  onMove,
}: {
  applications: Application[];
  selectedId?: string;
  onSelect: (application: Application) => void;
  onMove: (application: Application, status: ApplicationStatus) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-300 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
      <table className="w-full min-w-[780px] text-left text-sm">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-4 py-3">Candidato</th>
            <th className="px-4 py-3">Vaga</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Etapa</th>
            <th className="px-4 py-3">Contato</th>
            <th className="px-4 py-3 text-right">Acao</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {applications.map((application) => (
            <tr key={application.id} className={selectedId === application.id ? 'bg-slate-50' : 'bg-white'}>
              <td className="px-4 py-3">
                <button onClick={() => onSelect(application)} className="text-left">
                  <p className="font-black text-slate-950">{application.candidate.name}</p>
                  <p className="text-xs text-slate-500">{application.candidate.email || 'Sem e-mail'}</p>
                </button>
              </td>
              <td className="px-4 py-3 font-semibold text-slate-700">{application.job.title}</td>
              <td className="px-4 py-3 font-black text-slate-950">{application.candidate.aiScore ?? 0}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">{statusLabels[application.status] ?? application.status}</span>
              </td>
              <td className="px-4 py-3 text-xs font-semibold text-slate-600">{application.candidate.phone || 'Sem telefone'}</td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => onMove(application, 'INTERVIEW')} className="rounded-[12px] bg-[#07111f] px-3 py-2 text-xs font-black text-white shadow-sm">
                  Validar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AiTab({
  applications,
  onSelect,
  onMove,
}: {
  applications: Application[];
  onSelect: (application: Application) => void;
  onMove: (application: Application, status: ApplicationStatus) => void;
}) {
  const needsReview = applications.filter((application) => (application.candidate.aiScore ?? 0) < 65 || normalizeSentiment(application.candidate.lastSentiment) === 'ATTENTION' || !application.candidate.phone);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-[22px] border border-slate-300 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <Sparkles size={16} /> Ranking IA
        </h2>
        <div className="mt-4 space-y-3">
          {applications.slice(0, 8).map((application, index) => (
            <button key={application.id} onClick={() => onSelect(application)} className="flex w-full items-center gap-3 rounded-[16px] border border-slate-200 bg-slate-50 p-3 text-left hover:border-slate-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#07111f] text-xs font-black text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-950">{application.candidate.name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{application.job.title}</p>
              </div>
              <span className="text-lg font-black text-slate-950">{application.candidate.aiScore ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-300 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <AlertCircle size={16} /> Precisam de revisao
        </h2>
        <div className="mt-4 space-y-3">
          {needsReview.length ? (
            needsReview.map((application) => (
              <div key={application.id} className="rounded-[16px] border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-950">{application.candidate.name}</p>
                    <p className="mt-1 text-xs font-semibold text-amber-900">{application.candidate.phone ? 'Revisar score/sentimento antes de avancar.' : 'Sem telefone para WhatsApp.'}</p>
                  </div>
                  <button onClick={() => onMove(application, (application.candidate.aiScore ?? 0) >= 55 ? 'INTERVIEW' : 'REJECTED')} className="rounded-[12px] bg-[#07111f] px-3 py-2 text-xs font-black text-white">
                    IA revisar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Nenhum candidato critico nos filtros atuais.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MessagesTab({
  applications,
  events,
  selected,
  onMove,
}: {
  applications: Application[];
  events: MessageEvent[];
  selected: Application | null;
  onMove: (application: Application, status: ApplicationStatus) => void;
}) {
  const previewApplication = selected ?? applications[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <section className="rounded-[22px] border border-slate-300 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <MessageSquare size={16} /> Ultimos envios e pendencias
        </h2>
        <div className="mt-4 space-y-3">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="rounded-[16px] border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-950">{event.candidateName}</p>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${event.sent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                    {event.sent ? 'enviado' : 'pendente'}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{event.message}</p>
              </div>
            ))
          ) : (
            <p className="rounded-[16px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Nenhuma mensagem enviada nesta sessao. Ao confirmar uma etapa, o historico aparece aqui.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[22px] border border-slate-300 bg-white p-4 shadow-[0_16px_38px_rgba(15,23,42,0.10)]">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <Bot size={16} /> Previa inteligente
        </h2>
        {previewApplication ? (
          <div className="mt-4 space-y-3">
            {COLUMNS.filter((column) => column.id !== previewApplication.status).slice(0, 4).map((column) => (
              <button key={column.id} onClick={() => onMove(previewApplication, column.id)} className="w-full rounded-[16px] border border-slate-200 bg-slate-50 p-3 text-left hover:border-slate-950">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{column.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-700">{buildStageMessage(previewApplication, column.id)}</p>
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function TransitionModal({
  review,
  notifyCandidate,
  messagePreview,
  confirming,
  whatsappConnected,
  onNotifyChange,
  onMessageChange,
  onClose,
  onConfirm,
}: {
  review: TransitionReview;
  notifyCandidate: boolean;
  messagePreview: string;
  confirming: boolean;
  whatsappConnected: boolean;
  onNotifyChange: (value: boolean) => void;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <section className="w-full max-w-3xl overflow-hidden rounded-[24px] border border-slate-300 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#07111f] px-6 py-5 text-white">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-teal-200">
              <Bot size={14} /> IA + WhatsApp seguro
            </p>
            <h2 className="mt-2 text-xl font-black text-white">Tem certeza que deseja alterar a etapa?</h2>
            <p className="mt-1 text-sm text-slate-300">Nada sera enviado sem sua confirmacao manual.</p>
          </div>
          <button onClick={onClose} className="rounded-[14px] border border-white/15 bg-white/10 p-2 text-white hover:bg-white/20">
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-5 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-950">{review.candidate.name}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{review.job.title}</p>
              <div className="mt-4 flex items-center gap-2">
                <StageBox label="Atual" value={statusLabels[review.currentStatus] ?? review.currentStatus} />
                <ArrowRight size={18} className="text-slate-400" />
                <StageBox dark label="Proxima" value={statusLabels[review.recommendedStatus] ?? review.recommendedStatus} />
              </div>
            </div>

            <div className="rounded-[18px] border border-teal-200 bg-teal-50 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-teal-950">
                <CheckCircle2 size={16} /> Confianca IA: {review.ai.confidence}%
              </p>
              <p className="mt-2 text-xs leading-5 text-teal-900">{review.ai.summary}</p>
              <ul className="mt-3 space-y-1 text-xs font-semibold text-teal-950">
                {review.ai.reasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>

            {review.isDemo ? (
              <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-950">
                Modo exemplo: a alteracao sera simulada localmente e nao chamara o backend.
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">Mensagem editavel</p>
                  <p className="text-xs font-semibold text-slate-500">{review.whatsapp.enabled ? review.whatsapp.phone : 'Candidato sem telefone'}</p>
                </div>
                <label className="flex items-center gap-2 text-xs font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyCandidate}
                    disabled={!review.whatsapp.enabled}
                    onChange={(event) => onNotifyChange(event.target.checked)}
                  />
                  Enviar WhatsApp
                </label>
              </div>
              <textarea
                value={messagePreview}
                onChange={(event) => onMessageChange(event.target.value)}
                rows={7}
                className="w-full resize-none rounded-[16px] border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
              />
            </div>

            {!whatsappConnected && !review.isDemo ? (
              <WarningLine text="WhatsApp parece desconectado. A etapa pode ser alterada, mas o envio pode ficar pendente." />
            ) : null}
            {!review.whatsapp.enabled ? <WarningLine text="Sem telefone cadastrado. A etapa sera alterada, mas nenhuma mensagem sera enviada." /> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="h-11 rounded-[14px] border border-slate-300 bg-white px-4 text-xs font-black text-slate-700 hover:border-slate-950">
                Cancelar
              </button>
              <button onClick={onConfirm} disabled={confirming} className="h-11 rounded-[14px] bg-[#07111f] px-5 text-xs font-black text-white shadow-[0_14px_30px_rgba(2,6,23,0.25)] disabled:opacity-60">
                {confirming ? 'Confirmando...' : 'Confirmar e aplicar'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StageBox({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div className={`min-w-0 flex-1 rounded-[16px] border p-3 ${dark ? 'border-slate-950 bg-[#07111f] text-white' : 'border-slate-200 bg-white text-slate-950'}`}>
      <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${dark ? 'text-teal-200' : 'text-slate-400'}`}>{label}</p>
      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

function WarningLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-950">
      <AlertCircle size={15} />
      {text}
    </div>
  );
}

function sentimentClass(sentiment: Sentiment) {
  if (sentiment === 'POSITIVE') return 'bg-emerald-100 text-emerald-800';
  if (sentiment === 'ATTENTION') return 'bg-amber-100 text-amber-900';
  if (sentiment === 'NEGATIVE') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-700';
}

function sentimentLabel(sentiment: Sentiment) {
  if (sentiment === 'POSITIVE') return 'positivo';
  if (sentiment === 'ATTENTION') return 'atencao';
  if (sentiment === 'NEGATIVE') return 'negativo';
  return 'neutro';
}
