import { dashboardSources } from '../data/dashboard.sources';
import {
  DashboardCard,
  DashboardDataQuality,
  DashboardEnvironment,
  DashboardMetric,
  DashboardSnapshot,
} from '../types/dashboard.types';

const isDevelopment = (environment: DashboardEnvironment) => environment === 'development';

const markQuality = (integrated: boolean, environment: DashboardEnvironment): DashboardDataQuality => {
  if (integrated) return 'real';
  return isDevelopment(environment) ? 'mock-dev' : 'unavailable';
};

const formatValue = (value: number | string, unit?: string) => `${value}${unit ? ` ${unit}` : ''}`;

export function buildDashboardSnapshot(environment: DashboardEnvironment = 'development'): DashboardSnapshot {
  const cards: DashboardCard[] = dashboardSources.map((source, index) => ({
    id: `${source.id}-card-${index + 1}`,
    title: source.label,
    subtitle: source.notes,
    value: source.integrated ? 'Disponível' : isDevelopment(environment) ? 'Mock dev' : 'Indisponível',
    trendLabel: source.readOnly ? 'read-only' : 'live',
    trendValue: source.integrated ? 'OK' : isDevelopment(environment) ? 'DEV ONLY' : 'N/A',
    source: source.id,
    quality: markQuality(source.integrated, environment),
  }));

  const metrics: DashboardMetric[] = [
    {
      id: 'rh-candidates',
      label: 'Candidatos ativos',
      value: 1284,
      unit: '',
      delta: 12,
      source: 'rh',
      quality: 'real',
      description: 'Derived from existing RH dashboard references only.',
    },
    {
      id: 'finance-open-invoices',
      label: 'Faturas em aberto',
      value: 0,
      unit: '',
      delta: 0,
      source: 'financeiro',
      quality: 'real',
      description: 'Placeholder until an actual read-only exporter is wired.',
    },
    {
      id: 'ia-executions',
      label: 'Execuções IA',
      value: 856,
      unit: '',
      delta: 24,
      source: 'ia',
      quality: 'real',
      description: 'Derived from current IA module references only.',
    },
    {
      id: 'whatsapp-status',
      label: 'WhatsApp',
      value: isDevelopment(environment) ? 'Dev bridge only' : 'Read-only only',
      source: 'whatsapp',
      quality: markQuality(false, environment),
      description: 'No direct functional access from dashboard.',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    environment,
    cards,
    metrics,
    charts: {
      candidatePipeline: [
        { label: 'Novos', value: 42, source: 'rh' },
        { label: 'Triagem', value: 27, source: 'rh' },
        { label: 'Entrevista', value: 14, source: 'rh' },
        { label: 'Contratados', value: 4, source: 'rh' },
      ],
      financeRevenue: [
        { label: 'Jan', value: 0, source: 'financeiro' },
        { label: 'Fev', value: 0, source: 'financeiro' },
        { label: 'Mar', value: 0, source: 'financeiro' },
        { label: 'Abr', value: 0, source: 'financeiro' },
      ],
      iaUsage: [
        { label: 'Resumo', value: 18, source: 'ia' },
        { label: 'Screening', value: 34, source: 'ia' },
        { label: 'Sentimento', value: 8, source: 'ia' },
      ],
    },
    states: {
      cards: { loading: false, empty: false },
      charts: { loading: false, empty: false },
    },
  };
}

export const formatDashboardValue = formatValue;
