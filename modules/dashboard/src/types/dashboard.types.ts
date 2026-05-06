export type DashboardEnvironment = 'development' | 'production' | 'test';

export type DashboardDataQuality = 'real' | 'mock-dev' | 'unavailable';

export type DashboardMetricSource = 'rh' | 'financeiro' | 'ia' | 'whatsapp';

export interface DashboardMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
  source: DashboardMetricSource;
  quality: DashboardDataQuality;
  description?: string;
}

export interface DashboardCard {
  id: string;
  title: string;
  subtitle?: string;
  value: string;
  trendLabel?: string;
  trendValue?: string;
  source: DashboardMetricSource;
  quality: DashboardDataQuality;
}

export interface DashboardChartPoint {
  label: string;
  value: number;
  source: DashboardMetricSource;
}

export interface DashboardSectionState {
  loading: boolean;
  error?: string;
  empty?: boolean;
}

export interface DashboardSnapshot {
  generatedAt: string;
  environment: DashboardEnvironment;
  cards: DashboardCard[];
  metrics: DashboardMetric[];
  charts: {
    candidatePipeline: DashboardChartPoint[];
    financeRevenue: DashboardChartPoint[];
    iaUsage: DashboardChartPoint[];
  };
  states: {
    cards: DashboardSectionState;
    charts: DashboardSectionState;
  };
}
