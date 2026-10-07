// Quem deve ver o que. Espelha shell-v2/nav-config.ts de forma INDEPENDENTE (de proposito: se usasse o proprio
// nav-config, o robo nunca discordaria dele). Se o menu mudar la, atualize aqui.
// "incerto" = depende de permissao individual: o robo so passeia se aparecer.

export const PERFIS = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] as const;

export interface ItemMenu { id: string; nome: string; caminho: string; perfis: readonly string[]; incerto?: boolean }

export const MENU: ItemMenu[] = [
  { id: 'dashboard', nome: 'Dashboard', caminho: '/dashboard', perfis: PERFIS },
  { id: 'employees', nome: 'Funcionários', caminho: '/dashboard/employees', perfis: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CONSULTA'] },
  { id: 'escalas', nome: 'Escalas', caminho: '/dashboard/escalas', perfis: ['DEV', 'CEO', 'CONTABIL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { id: 'vacations', nome: 'Férias', caminho: '/dashboard/vacations', perfis: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { id: 'management', nome: 'Gestão', caminho: '/dashboard/management', perfis: ['DEV', 'ADMIN', 'RH', 'GESTOR'], incerto: true },
  { id: 'jobs', nome: 'Vagas', caminho: '/dashboard/jobs', perfis: ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'] },
  { id: 'users', nome: 'Usuários', caminho: '/dashboard/users', perfis: ['DEV', 'ADMIN', 'RH'], incerto: true },
  { id: 'faturas', nome: 'Faturas', caminho: '/dashboard/faturas', perfis: PERFIS, incerto: true },
  { id: 'settings', nome: 'Configurações', caminho: '/dashboard/settings', perfis: PERFIS },
  { id: 'support', nome: 'Suporte', caminho: '/dashboard/support', perfis: PERFIS },
  { id: 'platform', nome: 'Plataforma', caminho: '/dashboard/platform', perfis: ['DEV', 'CEO', 'COMERCIAL', 'CONTABIL'], incerto: true },
];

// RH - R&S: so o painel inicial e Vagas (regra de rota do front: shell-v2/rs-route-access.ts).
const SO_RS = new Set(['dashboard', 'jobs']);

export function podeAcessar(perfil: string, item: ItemMenu): boolean {
  if (perfil === 'RH_RS') return SO_RS.has(item.id);
  return item.perfis.includes(perfil);
}

/** Itens que o perfil DEVE abrir e os que DEVEM estar bloqueados (incertos ficam fora das duas listas). */
export function esperadoPara(perfil: string): { permitidos: ItemMenu[]; negados: ItemMenu[]; incertos: ItemMenu[] } {
  const permitidos: ItemMenu[] = [];
  const negados: ItemMenu[] = [];
  const incertos: ItemMenu[] = [];
  for (const item of MENU) {
    if (item.incerto) { incertos.push(item); continue; }
    (podeAcessar(perfil, item) ? permitidos : negados).push(item);
  }
  return { permitidos, negados, incertos };
}

/** Abas da Plataforma por perfil (espelha platform/_hub/types.ts TAB_POLICY). */
export const PLATAFORMA_ABAS: Record<string, string[]> = {
  DEV: ['Resumo', 'Empresas', 'Comercial', 'Suporte', 'Auditoria', 'Configurações'],
  CEO: ['Resumo', 'Empresas', 'Suporte', 'Auditoria', 'Configurações'],
  COMERCIAL: ['Resumo', 'Empresas', 'Comercial', 'Configurações'],
  CONTABIL: ['Resumo'],
};

/** Abas de Faturas na visao da plataforma (espelha faturas/_tabs.ts). */
export const FATURAS_ABAS: Record<string, string[]> = {
  DEV: ['Faturas', 'Assinaturas', 'Planos', 'Cupons'],
  CEO: ['Faturas', 'Assinaturas', 'Planos', 'Cupons'],
  CONTABIL: ['Faturas', 'Assinaturas', 'Planos', 'Cupons'],
  COMERCIAL: ['Faturas', 'Assinaturas', 'Planos'],
};

/** Perfis que o robo cria para testar (CEO fica de fora: exige contrato e assinatura gov.br no primeiro acesso). */
export const PERFIS_DE_TESTE = ['ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA', 'COMERCIAL', 'CONTABIL'] as const;