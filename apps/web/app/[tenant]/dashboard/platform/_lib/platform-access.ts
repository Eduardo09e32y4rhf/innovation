import { featureAllowed, type WebFeature } from '../../../../lib/feature-flags';

/**
 * FONTE ÚNICA de quem vê e quem altera cada área da Plataforma.
 * Menu lateral, proteção das páginas (layout) e abas leem daqui; `tests/unit/web/platform-access.spec.ts`
 * compara estes perfis com os `@Roles` dos controllers e falha se a tela oferecer algo que a API recusa.
 * O servidor continua sendo quem autoriza de verdade.
 */
export type Access = 'none' | 'read' | 'write';
export type AreaKey = 'visao-geral' | 'clientes' | 'financeiro' | 'contabilidade' | 'suporte' | 'sistema';

type Roles = readonly string[];
const roles = (...list: string[]): Roles => list;

export interface PlatformTab {
  key: string;
  label: string;
  /** Perfis que abrem a aba (leitura). */
  read: Roles;
  /** Perfis que alteram dados nela; vazio = aba só de consulta. */
  write: Roles;
  feature?: WebFeature;
}

export interface PlatformArea {
  key: AreaKey;
  label: string;
  description: string;
  /** Trecho da URL depois de /dashboard/platform ('' = Visão geral). */
  segment: string;
  /** Área que vive fora da Plataforma: o menu aponta para este caminho (depois de /[tenant]). */
  external?: string;
  read: Roles;
  write: Roles;
  tabs?: PlatformTab[];
}

export const FINANCEIRO_TABS: PlatformTab[] = [
  { key: 'faturas', label: 'Faturas', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO') },
  { key: 'assinaturas', label: 'Assinaturas', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO') },
  { key: 'planos', label: 'Planos', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO') },
  { key: 'cupons', label: 'Cupons', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO') },
  { key: 'reembolsos', label: 'Reembolsos', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO') },
  { key: 'ajustes-fiscais', label: 'Ajustes fiscais', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO') },
  { key: 'relatorio', label: 'Relatório', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles() },
];

/** Abas fixas da ficha do cliente. Suporte segue a API: a fila da plataforma não aceita CEO. */
export const FICHA_TABS: PlatformTab[] = [
  { key: 'geral', label: 'Geral', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles('DEV', 'CEO', 'COMERCIAL') },
  { key: 'assinatura', label: 'Assinatura', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles('DEV', 'CEO') },
  { key: 'faturas', label: 'Faturas', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles('DEV', 'CEO') },
  { key: 'usuarios', label: 'Usuários', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles('DEV', 'CEO', 'COMERCIAL') },
  { key: 'documentos', label: 'Documentos', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles() },
  { key: 'suporte', label: 'Suporte', read: roles('DEV', 'COMERCIAL'), write: roles() },
  { key: 'auditoria', label: 'Auditoria', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles() },
];

export const SISTEMA_TABS: PlatformTab[] = [
  { key: 'configuracao', label: 'Configuração', read: roles('DEV', 'CEO'), write: roles() },
  { key: 'permissoes', label: 'Permissões', read: roles('DEV'), write: roles('DEV') },
  { key: 'acessos', label: 'Acessos', read: roles('DEV', 'CEO'), write: roles() },
  { key: 'auditoria', label: 'Auditoria', read: roles('DEV', 'CEO'), write: roles() },
  { key: 'visitas', label: 'Visitas do site', read: roles('DEV'), write: roles() },
];

export const PLATFORM_AREAS: PlatformArea[] = [
  { key: 'visao-geral', label: 'Visão geral', description: 'Saúde da plataforma hoje', segment: '', read: roles('DEV', 'CEO'), write: roles() },
  { key: 'clientes', label: 'Clientes', description: 'Empresas e ficha de cada uma', segment: 'clientes', read: roles('DEV', 'CEO', 'COMERCIAL'), write: roles('DEV', 'CEO', 'COMERCIAL'), tabs: FICHA_TABS },
  { key: 'financeiro', label: 'Financeiro', description: 'Cobrança, planos e receita', segment: 'financeiro', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO'), tabs: FINANCEIRO_TABS },
  { key: 'contabilidade', label: 'Contabilidade', description: 'Folha e fechamentos por empresa', segment: '', external: '/dashboard/contabilidade', read: roles('DEV', 'CEO', 'CONTABIL'), write: roles('DEV', 'CEO', 'CONTABIL') },
  { key: 'suporte', label: 'Suporte', description: 'Fila de atendimento', segment: 'suporte', read: roles('DEV'), write: roles('DEV') },
  { key: 'sistema', label: 'Sistema', description: 'Configuração, acessos e auditoria', segment: 'sistema', read: roles('DEV', 'CEO'), write: roles('DEV'), tabs: SISTEMA_TABS },
];

/**
 * Módulos congelados por flag (`feature-flags.ts`): só existem com a flag ligada e ficam dentro de uma das áreas
 * (Inteligência na Visão geral, Contratos e Propostas em Clientes, WhatsApp em Sistema).
 */
export interface PlatformExtra { key: 'inteligencia' | 'contratos' | 'propostas' | 'whatsapp'; label: string; area: AreaKey; segment: string; feature: WebFeature; read: Roles }

export const PLATFORM_EXTRAS: PlatformExtra[] = [
  { key: 'inteligencia', label: 'Alertas e riscos', area: 'visao-geral', segment: '', feature: 'ai', read: roles('DEV') },
  { key: 'contratos', label: 'Contratos', area: 'clientes', segment: 'clientes/contratos', feature: 'manual-contracts', read: roles('DEV', 'COMERCIAL') },
  { key: 'propostas', label: 'Propostas', area: 'clientes', segment: 'clientes/propostas', feature: 'proposals', read: roles('DEV', 'COMERCIAL') },
  { key: 'whatsapp', label: 'WhatsApp', area: 'sistema', segment: 'whatsapp', feature: 'communication', read: roles('DEV', 'CEO') },
];

export function visibleExtras(role: string | null | undefined, area?: AreaKey): PlatformExtra[] {
  const r = String(role ?? '').trim().toUpperCase();
  return PLATFORM_EXTRAS.filter((extra) => featureAllowed(extra.feature) && extra.read.includes(r) && (!area || extra.area === area));
}

const normalize = (role: string | null | undefined) => String(role ?? '').trim().toUpperCase();

function accessOf(rule: { read: Roles; write: Roles }, role: string | null | undefined): Access {
  const r = normalize(role);
  if (rule.write.includes(r)) return 'write';
  return rule.read.includes(r) ? 'read' : 'none';
}

export function areaByKey(key: AreaKey): PlatformArea {
  return PLATFORM_AREAS.find((area) => area.key === key) as PlatformArea;
}

export function areaAccess(key: AreaKey, role: string | null | undefined): Access {
  return accessOf(areaByKey(key), role);
}

export function visibleAreas(role: string | null | undefined): PlatformArea[] {
  return PLATFORM_AREAS.filter((area) => areaAccess(area.key, role) !== 'none');
}

/** Área em que o perfil cai quando abre /platform sem ter a Visão geral. */
export function landingArea(role: string | null | undefined): PlatformArea | undefined {
  return visibleAreas(role)[0];
}

/** Área dona de um caminho depois de /dashboard/platform (ex.: 'financeiro', 'proposals/new'). */
export function areaForSegment(segment: string): PlatformArea | undefined {
  const first = segment.split('/').filter(Boolean)[0] ?? '';
  if (first === 'proposals') return areaByKey('clientes');
  if (first === 'whatsapp') return areaByKey('sistema');
  return PLATFORM_AREAS.find((area) => !area.external && area.segment === first);
}

export function tabsFor(tabs: PlatformTab[], role: string | null | undefined): PlatformTab[] {
  return tabs.filter((tab) => featureAllowed(tab.feature) && accessOf(tab, role) !== 'none');
}

/** Aba pedida na URL quando o perfil a enxerga; senão a primeira disponível. */
export function resolveTab(tabs: PlatformTab[], requested: string | null | undefined, role: string | null | undefined): PlatformTab | undefined {
  const allowed = tabsFor(tabs, role);
  return allowed.find((tab) => tab.key === requested) ?? allowed[0];
}

export function tabAccess(tab: PlatformTab, role: string | null | undefined): Access {
  return accessOf(tab, role);
}

/** Endereço do menu para a área. */
export function areaHref(tenant: string, area: PlatformArea): string {
  if (area.external) return `/${tenant}${area.external}`;
  return `/${tenant}/dashboard/platform${area.segment ? `/${area.segment}` : ''}`;
}
