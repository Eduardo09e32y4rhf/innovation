import type { PlatformBillingAuditLog } from '@/app/lib/api';

const ACTION_LABELS: Record<string, string> = {
  LOGIN_FAILED: 'Login negado',
  PASSWORD_CHANGED: 'Senha alterada',
  PASSWORD_RESET_REQUESTED: 'Solicitou reset de senha',
  PASSWORD_RESET_COMPLETED: 'Reset de senha concluído',
  EMPLOYEE_PASSWORD_RESET_BY_ADMIN: 'Senha redefinida pelo administrador',
  PRIVACY_TERMS_ACCEPTED: 'Aceitou os termos de uso',
  COMPANY_CREATED: 'Empresa criada',
  COMPANY_UPDATED: 'Empresa atualizada',
  COMPANY_ARCHIVED: 'Empresa arquivada',
  GHOST_MODE_STARTED: 'Acesso de suporte iniciado',
  BILLING_ONBOARDING_PENDING: 'Cobrança pendente',
  BILLING_ONBOARDING_PAYMENT_CREATED: 'Pagamento de onboarding criado',
};

export function describeLog(log: PlatformBillingAuditLog) {
  return (log as { summary?: string }).summary || translateAction(log.action);
}

export function translateAction(action: string) {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase();
}

export function formatActor(log: PlatformBillingAuditLog) {
  const metadataActor = (log.metadata as Record<string, unknown> | null | undefined)?.actorEmail;
  return log.user?.name || log.user?.email || (typeof metadataActor === 'string' ? metadataActor : null) || 'Sistema';
}

export function formatIp(ip?: string | null) {
  return ip || 'Localização indisponível';
}

export function isMobile(userAgent?: string | null) {
  return /Android|iPhone|iPad|Mobile/i.test(userAgent || '');
}

export function exportCsv(rows: PlatformBillingAuditLog[]) {
  const headers = ['Data', 'Ação', 'Ator', 'Entidade', 'IP', 'Dispositivo', 'Metadados'];
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((log) =>
      [
        new Date(log.createdAt).toLocaleString('pt-BR'),
        describeLog(log),
        formatActor(log),
        log.entity || '-',
        formatIp(log.ipAddress),
        isMobile(log.userAgent) ? 'Mobile' : 'Desktop',
        log.metadata ? JSON.stringify(log.metadata) : '-',
      ]
        .map(escape)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
