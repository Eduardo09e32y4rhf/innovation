/** Tradução do log de auditoria para linhas legíveis do histórico do usuário. */
export type ActivityType = 'PAGE' | 'LOGIN' | 'CHANGE' | 'SECURITY' | 'ACCESS';

export interface ActivityChange {
  field: string;
  from: string | null;
  to: string | null;
}

export interface ActivityItem {
  id: string;
  at: string;
  ip: string | null;
  type: ActivityType;
  title: string;
  /** Página acessada ou recurso alterado. */
  target: string | null;
  changes: ActivityChange[];
  /** Quem fez a ação quando foi outra pessoa (ex.: RH alterou o usuário). */
  by: string | null;
}

export interface AuditRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
}

const FIELD_LABEL: Record<string, string> = {
  name: 'Nome', email: 'E-mail', role: 'Perfil', isActive: 'Acesso ativo', customPermissions: 'Permissões personalizadas',
  employeeId: 'Funcionário vinculado', department: 'Departamento', position: 'Cargo', status: 'Situação', salary: 'Salário',
  registration: 'Matrícula', phone: 'Telefone', startDate: 'Início', endDate: 'Fim', reason: 'Motivo',
};

const ROLE_LABEL: Record<string, string> = {
  DEV: 'Desenvolvedor', CEO: 'CEO', CONTABIL: 'Contábil', COMERCIAL: 'Comercial', ADMIN: 'Administrador', RH: 'RH', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta',
};

const ENTITY_LABEL: Record<string, string> = {
  Employees: 'Funcionários', Users: 'Usuários', Vacations: 'Férias', Companies: 'Empresa', 'Time-track': 'Ponto', Schedules: 'Escalas', Jobs: 'Vagas',
  Payroll: 'Folha', Management: 'Gestão', Settings: 'Configurações', Notifications: 'Notificações', Support: 'Suporte', Platform: 'Plataforma', Finance: 'Financeiro',
};

const ACTION_LABEL: Record<string, { title: string; type: ActivityType }> = {
  PAGE_VIEW: { title: 'Acessou a página', type: 'PAGE' },
  LOGIN_SUCCESS: { title: 'Entrou no sistema', type: 'LOGIN' },
  LOGIN_FAILED: { title: 'Tentativa de login recusada', type: 'LOGIN' },
  USER_CREATED: { title: 'Acesso criado', type: 'ACCESS' },
  USER_UPDATED: { title: 'Dados do usuário alterados', type: 'CHANGE' },
  USER_BLOCKED: { title: 'Acesso bloqueado', type: 'ACCESS' },
  USER_UNBLOCKED: { title: 'Acesso desbloqueado', type: 'ACCESS' },
  USER_CANCELED: { title: 'Acesso cancelado', type: 'ACCESS' },
  USER_DEACTIVATED: { title: 'Acesso desativado', type: 'ACCESS' },
  USER_EMPLOYEE_LINKED: { title: 'Vinculado a um funcionário', type: 'ACCESS' },
  USER_EMPLOYEE_UNLINKED: { title: 'Vínculo com funcionário removido', type: 'ACCESS' },
  PASSWORD_CHANGED: { title: 'Trocou a senha', type: 'SECURITY' },
  PASSWORD_RESET_REQUESTED: { title: 'Pediu recuperação de senha', type: 'SECURITY' },
  PASSWORD_RESET_COMPLETED: { title: 'Senha redefinida', type: 'SECURITY' },
  TEMPORARY_PASSWORD_REVEALED: { title: 'Senha provisória visualizada', type: 'SECURITY' },
  TEMPORARY_PASSWORD_REISSUED: { title: 'Nova senha provisória gerada', type: 'SECURITY' },
  EMPLOYEE_PASSWORD_RESET_BY_ADMIN: { title: 'Senha redefinida pelo RH', type: 'SECURITY' },
};

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});

export function formatValue(field: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (field === 'role') return ROLE_LABEL[String(value)] ?? String(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (Array.isArray(value)) return value.length ? value.join(', ') : null;
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 200);
  return String(value).slice(0, 200);
}

/** "tinha → ficou": só campos que realmente mudaram; listas mostram o que entrou e o que saiu. */
export function diffRecords(previous: Record<string, unknown>, next: Record<string, unknown>): ActivityChange[] {
  const changes: ActivityChange[] = [];
  for (const key of Object.keys({ ...previous, ...next })) {
    const a = previous[key];
    const b = next[key];
    if (JSON.stringify(a ?? null) === JSON.stringify(b ?? null)) continue;
    const label = FIELD_LABEL[key] ?? key;
    if (Array.isArray(a) || Array.isArray(b)) {
      const before = new Set(((a as unknown[]) ?? []).map(String));
      const after = new Set(((b as unknown[]) ?? []).map(String));
      const added = [...after].filter((item) => !before.has(item));
      const removed = [...before].filter((item) => !after.has(item));
      if (added.length) changes.push({ field: `${label} (adicionado)`, from: null, to: added.join(', ') });
      if (removed.length) changes.push({ field: `${label} (retirado)`, from: removed.join(', '), to: null });
      continue;
    }
    changes.push({ field: label, from: formatValue(key, a), to: formatValue(key, b) });
  }
  return changes;
}

function humanizePath(path: string) {
  return path.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '/…').replace(/^\/api/, '').slice(0, 120);
}

export function describeAudit(row: AuditRow, subjectUserId: string): ActivityItem {
  const meta = asRecord(row.metadata);
  const known = ACTION_LABEL[row.action];
  const base = { id: row.id, at: row.createdAt.toISOString(), ip: row.ipAddress ?? null };
  const by = typeof meta.requestedBy === 'string' ? meta.requestedBy : typeof meta.actorEmail === 'string' ? meta.actorEmail : null;

  if (row.action === 'PAGE_VIEW') {
    return { ...base, type: 'PAGE', title: known.title, target: typeof meta.path === 'string' ? meta.path : null, changes: [], by: null };
  }

  if (known) {
    const previous = asRecord(meta.previous);
    const next = asRecord(meta.next);
    const changes = diffRecords(previous, next);
    if (row.action === 'USER_CREATED') {
      for (const key of ['name', 'email', 'role']) if (meta[key] !== undefined) changes.push({ field: FIELD_LABEL[key] ?? key, from: null, to: formatValue(key, meta[key]) });
    }
    if (typeof meta.reason === 'string' && meta.reason) changes.push({ field: 'Motivo', from: null, to: meta.reason });
    return { ...base, type: known.type, title: known.title, target: null, changes, by };
  }

  // Ação genérica registrada pelo interceptor: "POST /employees/:id".
  const [method, ...rest] = row.action.split(' ');
  const path = rest.join(' ') || String(meta.path ?? '');
  const verb = method === 'POST' ? 'Criou / enviou' : method === 'DELETE' ? 'Removeu' : 'Alterou';
  const entity = ENTITY_LABEL[row.entity] ?? row.entity;
  const body = asRecord(meta.body);
  const changes: ActivityChange[] = Object.entries(body)
    .filter(([, value]) => value !== undefined && typeof value !== 'object')
    .slice(0, 12)
    .map(([key, value]) => ({ field: FIELD_LABEL[key] ?? key, from: null, to: formatValue(key, value) }));
  const afterUser = row.entity === 'Users' && row.entityId && row.entityId !== subjectUserId;
  return { ...base, type: 'CHANGE', title: `${verb} em ${entity}${afterUser ? ' (outro usuário)' : ''}`, target: humanizePath(path), changes, by: null };
}

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = { PAGE: 'Página', LOGIN: 'Login', CHANGE: 'Alteração', SECURITY: 'Segurança', ACCESS: 'Acesso' };
