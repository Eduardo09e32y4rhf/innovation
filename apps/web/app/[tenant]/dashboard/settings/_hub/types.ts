export type SettingsSection = 'conta' | 'empresa' | 'feriados' | 'acessos' | 'financeiro' | 'planos' | 'dados';

export const SECTION_LABEL: Record<SettingsSection, string> = {
  conta: 'Minha conta',
  empresa: 'Empresa',
  feriados: 'Feriados',
  acessos: 'Acessos',
  financeiro: 'Plano e cobrança',
  planos: 'Planos (plataforma)',
  dados: 'Importar e exportar',
};

/** Seções visíveis por perfil. O servidor continua sendo a autoridade (RolesGuard). */
export const SECTION_POLICY: Record<string, SettingsSection[]> = {
  DEV: ['conta', 'empresa', 'feriados', 'acessos', 'financeiro', 'planos', 'dados'],
  ADMIN: ['conta', 'empresa', 'feriados', 'acessos', 'financeiro', 'dados'],
  RH: ['conta', 'empresa', 'feriados', 'acessos', 'dados'],
  CEO: ['conta'],
  CONTABIL: ['conta'],
  COMERCIAL: ['conta'],
  GESTOR: ['conta'],
  FUNCIONARIO: ['conta'],
  CONSULTA: ['conta'],
};

export const ROLE_LABELS: Record<string, string> = {
  DEV: 'Desenvolvedor', CEO: 'CEO', CONTABIL: 'Contabilidade', COMERCIAL: 'Comercial', ADMIN: 'Administrador',
  RH: 'RH', GESTOR: 'Gestor', FUNCIONARIO: 'Funcionário', CONSULTA: 'Consulta',
};
