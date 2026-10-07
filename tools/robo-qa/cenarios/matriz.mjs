// Quem deve ver o que. Espelha apps/web/app/[tenant]/dashboard/_components/shell-v2/nav-config.ts
// (se o menu mudar la, atualize aqui). "incerto" = depende de permissao individual: o robo so passeia se aparecer.

const TODOS = ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'];

export const MENU = [
  { id: 'dashboard', nome: 'Dashboard', caminho: '/dashboard', exato: true, perfis: TODOS },
  { id: 'employees', nome: 'Funcionários', caminho: '/dashboard/employees', perfis: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'CONSULTA'] },
  { id: 'escalas', nome: 'Escalas', caminho: '/dashboard/escalas', perfis: ['DEV', 'CEO', 'CONTABIL', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { id: 'vacations', nome: 'Férias', caminho: '/dashboard/vacations', perfis: ['DEV', 'ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO', 'CONSULTA'] },
  { id: 'management', nome: 'Gestão', caminho: '/dashboard/management', perfis: ['DEV', 'ADMIN', 'RH', 'GESTOR'], incerto: true },
  { id: 'jobs', nome: 'Vagas', caminho: '/dashboard/jobs', perfis: ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR'] },
  { id: 'users', nome: 'Usuários', caminho: '/dashboard/users', perfis: ['DEV', 'ADMIN', 'RH'], incerto: true },
  { id: 'faturas', nome: 'Faturas', caminho: '/dashboard/faturas', perfis: TODOS, incerto: true },
  { id: 'settings', nome: 'Configurações', caminho: '/dashboard/settings', perfis: TODOS },
  { id: 'support', nome: 'Suporte', caminho: '/dashboard/support', perfis: TODOS },
  { id: 'platform', nome: 'Plataforma', caminho: '/dashboard/platform', perfis: ['DEV', 'CEO', 'COMERCIAL', 'CONTABIL'], incerto: true },
];

// RH - R&S: so o painel inicial e Vagas (regra de rota do front: shell-v2/rs-route-access.ts).
const SO_RS = new Set(['dashboard', 'jobs']);

export function podeAcessar(perfil, item) {
  if (perfil === 'RH_RS') return SO_RS.has(item.id);
  return item.perfis.includes(perfil);
}

/** Itens que o perfil DEVE abrir e itens que DEVEM estar bloqueados (os incertos ficam fora das duas listas). */
export function esperadoPara(perfil) {
  const permitidos = [];
  const negados = [];
  for (const item of MENU) {
    if (item.incerto) continue;
    (podeAcessar(perfil, item) ? permitidos : negados).push(item);
  }
  return { permitidos, negados };
}

/** Algumas abas da Plataforma por perfil (espelha platform/_hub/types.ts TAB_POLICY). */
export const PLATAFORMA_ABAS = {
  DEV: ['Resumo', 'Empresas', 'Comercial', 'Suporte', 'Auditoria', 'Configurações'],
  CEO: ['Resumo', 'Empresas', 'Suporte', 'Auditoria', 'Configurações'],
  COMERCIAL: ['Resumo', 'Empresas', 'Comercial', 'Configurações'],
  CONTABIL: ['Resumo'],
};

/** Abas de Faturas na visao da plataforma (espelha faturas/_tabs.ts). */
export const FATURAS_ABAS = {
  DEV: ['Faturas', 'Assinaturas', 'Planos', 'Cupons'],
  CEO: ['Faturas', 'Assinaturas', 'Planos', 'Cupons'],
  CONTABIL: ['Faturas', 'Assinaturas', 'Planos', 'Cupons'],
  COMERCIAL: ['Faturas', 'Assinaturas', 'Planos'],
};