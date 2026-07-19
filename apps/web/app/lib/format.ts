export function formatDate(value?: string | null): string {
  if (!value) return '—';
  // Parse as local date (YYYY-MM-DD) to avoid timezone shift
  const str = typeof value === 'string' ? value : String(value);
  // If the string is just a date (no time part), parse it as local to avoid UTC offset shifting the day
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [year, month, day] = str.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}
export function formatTime(value?: string | null): string {
  if (!value) return 'â€”';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'â€”' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
export function formatPeriod(start?: string | null, end?: string | null): string {
  return `${formatDate(start)} a ${formatDate(end)}`;
}
export function formatCpf(cpf?: string | null): string {
  if (!cpf) return 'â€”';
  const d = cpf.replace(/\D/g, '');
  return d.length !== 11 ? cpf : d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
export function formatCurrency(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return 'â€”';
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) ? 'â€”' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
export function formatMinutes(minutes?: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}
export const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Férias', SUSPENDED: 'Afastado', TERMINATED: 'Desligado',
};
export const VACATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', CANCELLED: 'Cancelada', COMPLETED: 'Concluída',
};
export const ROLE_LABEL: Record<string, string> = {
  DEV: 'Dev', COMERCIAL: 'Venda', ADMIN: 'Administrador', RH: 'RH', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta',
};
