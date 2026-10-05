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
  DEV: 'Desenvolvedor', CEO: 'CEO', CONTABIL: 'Contábil', COMERCIAL: 'Comercial', ADMIN: 'Administrador', RH: 'RH', RH_RS: 'RH — R&S', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta',
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
  const sentence = describeAction(row.action, row.entity, row.metadata);
  const title = sentence.startsWith('Alterou dados em') || sentence.startsWith('Cadastrou ou enviou') ? `${verb} em ${entity}${afterUser ? ' (outro usuário)' : ''}` : `${sentence}${afterUser ? ' (outro usuário)' : ''}`;
  return { ...base, type: 'CHANGE', title, target: null, changes, by: null };
}

const EXTRA_ACTIONS: Record<string, string> = {
  PRIVACY_TERMS_ACCEPTED: 'Assinou o Termo de Uso e Política de Privacidade',
  COMPANY_CREATED: 'Cadastrou a empresa', COMPANY_UPDATED: 'Atualizou os dados da empresa', COMPANY_ARCHIVED: 'Arquivou a empresa',
  GHOST_MODE_STARTED: 'Entrou na conta da empresa em modo suporte',
  USER_DELETED: 'Excluiu um usuário definitivamente',
  USER_MFA_RESET: 'Removeu a verificação em duas etapas do usuário',
  FATURAS_CHARGE_CREATED: 'Gerou uma nova cobrança', FATURAS_INVOICE_CANCELED_REASON: 'Cancelou uma fatura',
  FATURAS_DISCOUNT: 'Deu desconto em uma fatura', FATURAS_RECURRING_DISCOUNT: 'Aplicou desconto recorrente na assinatura',
  FATURAS_FREE_DAYS: 'Concedeu dias grátis', FATURAS_PARTIAL_REFUND: 'Fez um reembolso parcial', FATURAS_PRORATION: 'Ajustou a assinatura (proporcional)',
  ONBOARDING_PAYMENT_READY: 'Gerou o pagamento da primeira mensalidade', ONBOARDING_FREE_ACTIVATED: 'Ativou o plano gratuito',
  FATURAS_ACCESS_RELEASED: 'Liberou o acesso da empresa manualmente',
  INVOICE_SYNCED: 'Atualizou a situação de uma fatura',
  BILLING_ONBOARDING_PENDING: 'Cobrança inicial pendente', BILLING_ONBOARDING_PAYMENT_CREATED: 'Pagamento inicial criado',
};

/** Rotas da API em frases que qualquer pessoa entende: [método, trecho do caminho, frase]. */
const ROUTE_SENTENCES: Array<[string, RegExp, string]> = [
  ['POST', /^\/notifications\/admin/, 'Enviou uma notificação'],
  ['PATCH', /^\/notifications\/[^/]+\/respond/, 'Respondeu a uma notificação'],
  ['POST', /^\/employees\/import/, 'Importou funcionários por planilha'],
  ['POST', /^\/employees\/[^/]+\/access/, 'Liberou acesso ao sistema para um funcionário'],
  ['DELETE', /^\/employees\/[^/]+\/permanent/, 'Excluiu um funcionário definitivamente'],
  ['DELETE', /^\/employees/, 'Desligou um funcionário'],
  ['POST', /^\/employees/, 'Cadastrou um funcionário'],
  ['PATCH', /^\/employees/, 'Alterou o cadastro de um funcionário'],
  ['POST', /^\/users/, 'Criou um usuário'],
  ['PATCH', /^\/users/, 'Alterou um usuário'],
  ['DELETE', /^\/users/, 'Removeu um usuário'],
  ['POST', /^\/time-track\/register/, 'Registrou o ponto'],
  ['POST', /^\/time-track\/manual/, 'Lançou um ajuste manual de ponto'],
  ['POST', /^\/time-track\/batch-approve/, 'Aprovou vários pontos de uma vez'],
  ['PATCH', /^\/time-track\/[^/]+\/approve/, 'Aprovou ou recusou um ponto'],
  ['PATCH', /^\/time-track\/[^/]+\/revoke/, 'Desfez a aprovação de um ponto'],
  ['PATCH', /^\/time-track/, 'Corrigiu um registro de ponto'],
  ['DELETE', /^\/time-track/, 'Apagou um registro de ponto'],
  ['POST', /^\/time-closing\/generate/, 'Gerou o fechamento do ponto'],
  ['POST', /^\/time-closing\/[^/]+\/approve/, 'Aprovou um fechamento de ponto'],
  ['POST', /^\/time-closing\/[^/]+\/close/, 'Encerrou um fechamento de ponto'],
  ['POST', /^\/time-closing\/[^/]+\/reopen/, 'Reabriu um fechamento de ponto'],
  ['PATCH', /^\/time-closing/, 'Ajustou um valor do fechamento'],
  ['POST', /^\/vacations/, 'Solicitou férias'],
  ['PATCH', /^\/vacations\/[^/]+\/status/, 'Decidiu sobre um pedido de férias'],
  ['POST', /^\/payroll/, 'Calculou uma folha de pagamento'],
  ['PATCH', /^\/payroll/, 'Atualizou uma folha de pagamento'],
  ['POST', /^\/jobs/, 'Criou uma vaga'],
  ['PATCH', /^\/jobs/, 'Alterou uma vaga'],
  ['PUT', /^\/jobs/, 'Alterou uma vaga'],
  ['DELETE', /^\/jobs/, 'Removeu uma vaga'],
  ['POST', /^\/management\/aso/, 'Registrou um ASO'],
  ['PATCH', /^\/management\/aso/, 'Atualizou um ASO'],
  ['POST', /^\/management\/events/, 'Criou um evento na agenda'],
  ['POST', /^\/schedule/, 'Alterou uma escala'],
  ['PUT', /^\/schedule/, 'Alterou uma escala'],
  ['POST', /^\/support/, 'Abriu ou respondeu um chamado de suporte'],
  ['PATCH', /^\/companies/, 'Atualizou os dados da empresa'],
  ['PUT', /^\/companies/, 'Atualizou os dados da empresa'],
  ['POST', /^\/faturas|^\/finance/, 'Fez uma ação financeira'],
];

/** Frase única e clara para qualquer linha do log (ação conhecida ou "POST /rota"). */
export function describeAction(action: string, entity?: string | null, metadata?: unknown): string {
  const meta = asRecord(metadata);
  if (ACTION_LABEL[action]) {
    if (action === 'PAGE_VIEW') return `Abriu a página ${humanizePath(String(meta.path ?? ''))}`.trim();
    return ACTION_LABEL[action].title;
  }
  if (EXTRA_ACTIONS[action]) return EXTRA_ACTIONS[action];
  const [method, ...rest] = action.split(' ');
  if (['POST', 'PUT', 'PATCH', 'DELETE', 'GET'].includes(method) && rest.length) {
    const path = humanizePath(rest.join(' ')).split('?')[0];
    const hit = ROUTE_SENTENCES.find(([m, re]) => m === method && re.test(path));
    if (hit) return hit[2];
    const area = ENTITY_LABEL[entity ?? ''] ?? entity ?? 'o sistema';
    return `${method === 'POST' ? 'Cadastrou ou enviou dados em' : method === 'DELETE' ? 'Removeu dados em' : 'Alterou dados em'} ${area}`;
  }
  return action.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = { PAGE: 'Página', LOGIN: 'Login', CHANGE: 'Alteração', SECURITY: 'Segurança', ACCESS: 'Acesso' };
