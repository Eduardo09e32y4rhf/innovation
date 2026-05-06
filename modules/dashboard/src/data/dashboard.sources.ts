import { DashboardMetricSource } from '../types/dashboard.types';

export interface DashboardSourceDescriptor {
  id: DashboardMetricSource;
  label: string;
  integrated: boolean;
  readOnly: boolean;
  notes: string;
}

export const dashboardSources: DashboardSourceDescriptor[] = [
  {
    id: 'rh',
    label: 'RH',
    integrated: true,
    readOnly: true,
    notes: 'Consume pipeline and analytics data only when available through existing RH modules.',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    integrated: true,
    readOnly: true,
    notes: 'Use financial module data only in read-only mode; avoid inventing production numbers.',
  },
  {
    id: 'ia',
    label: 'IA',
    integrated: true,
    readOnly: true,
    notes: 'Consume orchestration results or model metadata if the integration already exists.',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    integrated: false,
    readOnly: true,
    notes: 'Do not touch functional WhatsApp flows. Dashboard may only reference already exposed read-only state.',
  },
];
