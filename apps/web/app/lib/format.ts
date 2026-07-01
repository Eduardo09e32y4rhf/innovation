export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export function formatTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function formatPeriod(start?: string | null, end?: string | null): string {
  return `${formatDate(start)} a ${formatDate(end)}`;
}
export function formatCpf(cpf?: string | null): string {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  return d.length !== 11 ? cpf : d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
export function formatCurrency(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function formatMinutes(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60), m = abs % 60;
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}
export const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Férias', SUSPENDED: 'Afastado', TERMINATED: 'Desligado',
};
export const VACATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', CANCELLED: 'Cancelada', COMPLETED: 'Concluída',
};
export const ROLE_LABEL: Record<string, string> = {
  DEV: 'Dev', COMERCIAL: 'Venda', ADMIN: 'Administrador', RH: 'RH', GESTOR: 'Gestor', FUNCIONÁRIO: 'Funcionário', CONSULTA: 'Consulta',
};
