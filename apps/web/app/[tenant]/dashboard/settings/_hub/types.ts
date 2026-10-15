import { Building2, CalendarDays, Database, Landmark, Shield, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';

export type SettingsSection = 'conta' | 'seguranca' | 'empresa' | 'feriados' | 'horaextra' | 'descontos' | 'acessos' | 'dados';

export const SECTION_META: Record<SettingsSection, { label: string; hint: string; icon: LucideIcon }> = {
  conta: { label: 'Meu perfil', hint: 'Seus dados e senha', icon: UserRound },
  seguranca: { label: 'Segurança', hint: 'Verificação em duas etapas e sessões', icon: Shield },
  empresa: { label: 'Dados da empresa', hint: 'Cadastro, endereço e logo', icon: Building2 },
  feriados: { label: 'Feriados', hint: 'Calendário usado no ponto e na folha', icon: CalendarDays },
  horaextra: { label: 'Hora extra e banco', hint: 'Pagar na folha ou usar banco de horas', icon: Landmark },
  descontos: { label: 'Descontos e benefícios', hint: 'Vale-transporte, plano de saúde e outros descontos da folha', icon: Wallet },
  acessos: { label: 'Usuários e acessos', hint: 'Quem entra no sistema', icon: Users },
  dados: { label: 'Importar e exportar', hint: 'Planilhas de funcionários e férias', icon: Database },
};

export const SECTION_GROUPS: Array<{ title: string; items: SettingsSection[] }> = [
  { title: 'Pessoal', items: ['conta', 'seguranca'] },
  { title: 'Empresa', items: ['empresa', 'feriados', 'horaextra', 'descontos', 'acessos', 'dados'] },
];

/** Seções visíveis por perfil. O servidor continua sendo a autoridade (RolesGuard). */
export const SECTION_POLICY: Record<string, SettingsSection[]> = {
  DEV: ['conta', 'seguranca', 'empresa', 'feriados', 'horaextra', 'descontos', 'acessos', 'dados'],
  ADMIN: ['conta', 'seguranca', 'empresa', 'feriados', 'horaextra', 'descontos', 'acessos', 'dados'],
  RH: ['conta', 'seguranca', 'empresa', 'feriados', 'horaextra', 'descontos', 'acessos', 'dados'],
  CEO: ['conta', 'seguranca'],
  CONTABIL: ['conta', 'seguranca'],
  COMERCIAL: ['conta', 'seguranca'],
  GESTOR: ['conta', 'seguranca'],
  FUNCIONARIO: ['conta', 'seguranca'],
  CONSULTA: ['conta', 'seguranca'],
  RH_RS: ['conta', 'seguranca'],
};

/** Conta autonoma de R&S (so Recrutamento): sem ferias, ponto, folha nem planilhas de funcionarios. */
const RECRUITER_ONLY_POLICY: Record<string, SettingsSection[]> = {
  DEV: ['conta', 'seguranca', 'empresa', 'acessos'],
  ADMIN: ['conta', 'seguranca', 'empresa', 'acessos'],
  RH: ['conta', 'seguranca', 'empresa', 'acessos'],
  // Recrutador autonomo administra o proprio cadastro: CNPJ/CPF, endereco e logo.
  RH_RS: ['conta', 'seguranca', 'empresa'],
};

/** Toda pessoa logada ve pelo menos Meu perfil (trocar senha) e Seguranca. */
export function sectionsFor(role: string, recruiterOnly: boolean): SettingsSection[] {
  if (recruiterOnly && RECRUITER_ONLY_POLICY[role]) return RECRUITER_ONLY_POLICY[role];
  return SECTION_POLICY[role] ?? ['conta', 'seguranca'];
}

export function canEditCompanyFor(role: string, recruiterOnly: boolean): boolean {
  return ['DEV', 'ADMIN', 'RH'].includes(role) || (role === 'RH_RS' && recruiterOnly);
}

export const ROLE_LABELS: Record<string, string> = {
  DEV: 'Desenvolvedor', CEO: 'CEO', CONTABIL: 'Contabilidade', COMERCIAL: 'Comercial', ADMIN: 'Administrador',
  RH: 'RH', RH_RS: 'RH - R&S', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta',
};

export const inputClass = 'input-v2 mt-1 w-full text-sm';
export const cardClass = 'rounded-2xl border border-border bg-bg p-5 shadow-sm';

export function errorText(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
