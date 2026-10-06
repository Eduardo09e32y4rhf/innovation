import type { AppUser, UserRole } from '@/app/lib/api';

export const ROLE_INFO: Record<UserRole, { label: string; vision: string }> = {
  DEV: { label: 'Desenvolvedor', vision: 'Plataforma completa, todas as empresas.' },
  CEO: { label: 'CEO', vision: 'Indicadores e visão executiva da plataforma.' },
  CONTABIL: { label: 'Contábil', vision: 'Financeiro, planos, cupons, contratos e fechamentos.' },
  COMERCIAL: { label: 'Comercial', vision: 'Carteira de clientes, propostas e contratos.' },
  ADMIN: { label: 'Administrador', vision: 'Administra toda a empresa: usuários, configurações e cobrança.' },
  RH: { label: 'RH - Empresas', vision: 'Pessoas: funcionários, escalas, férias, vagas e fechamento.' },
  RH_RS: { label: 'RH - R&S', vision: 'Recrutamento e seleção: acesso somente às vagas e candidaturas.' },
  GESTOR: { label: 'Gestor', vision: 'Sua equipe: aprova pedidos e ajusta escalas.' },
  FUNCIONARIO: { label: 'Funcionário', vision: 'Seus próprios dados, ponto, escala e solicitações.' },
  CONSULTA: { label: 'Consulta', vision: 'Acompanha informações em modo somente leitura.' },
};

/** Espelha ROLE_MANAGEMENT do servidor (a decisão final é sempre do servidor). */
const MANAGES: Record<string, UserRole[]> = {
  DEV: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  CEO: ['ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  ADMIN: ['ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
  RH: ['RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'],
};

export const rolesFor = (actorRole: string): UserRole[] => MANAGES[actorRole] ?? [];
export const canManage = (actorRole: string, targetRole: UserRole) => rolesFor(actorRole).includes(targetRole);
export const canOpenPage = (role: string) => ['DEV', 'CEO', 'ADMIN', 'RH'].includes(role);

export type AccessStatus = 'ATIVO' | 'BLOQUEADO' | 'CANCELADO';
export const accessStatus = (user: Pick<AppUser, 'isActive' | 'blockedAt' | 'canceledAt'>): AccessStatus =>
  user.canceledAt ? 'CANCELADO' : user.isActive === false || user.blockedAt ? 'BLOQUEADO' : 'ATIVO';

export const STATUS_STYLE: Record<AccessStatus, string> = {
  ATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BLOQUEADO: 'bg-amber-50 text-amber-800 border-amber-200',
  CANCELADO: 'bg-rose-50 text-rose-700 border-rose-200',
};
export const STATUS_LABEL: Record<AccessStatus, string> = { ATIVO: 'Ativo', BLOQUEADO: 'Bloqueado', CANCELADO: 'Cancelado' };

export const dateTime = (value?: string | null) => (value ? new Date(value).toLocaleString('pt-BR') : '—');
