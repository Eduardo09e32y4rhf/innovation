export type PlatformNavItem = { label: string; href: string };
export type PlatformNavGroup = { key: string; label: string; items: PlatformNavItem[] };

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    key: 'overview',
    label: 'Visão Geral',
    items: [{ label: 'Console Operacional', href: '' }],
  },
  {
    key: 'clients',
    label: 'Clientes',
    items: [
      { label: 'Empresas Clientes', href: '/companies' },
      { label: 'Acessos DEV', href: '/access' },
    ],
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { label: 'Faturamento & Cobranças', href: '/finance' },
      { label: 'Assinaturas Asaas', href: '/subscriptions' },
    ],
  },
  {
    key: 'commercial',
    label: 'Comercial',
    items: [
      { label: 'Propostas Comerciais', href: '/proposals' },
      { label: 'Contratos Digitais', href: '/contracts' },
      { label: 'Planos & Preços', href: '/plans' },
      { label: 'Cupons de Desconto', href: '/coupons' },
    ],
  },
  {
    key: 'operations',
    label: 'Operações',
    items: [
      { label: 'Central de Suporte DEV', href: '/support' },
      { label: 'Log de Auditoria', href: '/audit' },
    ],
  },
  {
    key: 'intelligence',
    label: 'Inteligência',
    items: [
      { label: 'Análise de Risco IA', href: '/intelligence' },
    ],
  },
  {
    key: 'settings',
    label: 'Configurações',
    items: [
      { label: 'Comunicação WhatsApp', href: '/whatsapp' },
      { label: 'Permissões Globais', href: '/permissions' },
    ],
  },
];

// Usuários COMERCIAL enxergam apenas Visão Geral, Empresas, Financeiro (escopado) e Comercial.
const COMERCIAL_ALLOWED_LABELS = new Set([
  'Console Operacional', 
  'Empresas Clientes', 
  'Faturamento & Cobranças', 
  'Propostas Comerciais', 
  'Contratos Digitais', 
  'Planos & Preços'
]);

export function getPlatformNavGroups(role: string): PlatformNavGroup[] {
  if (role === 'DEV') return PLATFORM_NAV_GROUPS;
  return PLATFORM_NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => COMERCIAL_ALLOWED_LABELS.has(item.label)),
    }))
    .filter((group) => group.items.length > 0);
}

export function resolvePlatformActive(base: string, pathname: string, groups: PlatformNavGroup[]) {
  for (const group of groups) {
    for (const item of group.items) {
      const full = `${base}${item.href}`;
      const isActive = item.href ? pathname.startsWith(full) : pathname === base || pathname === `${base}/`;
      if (isActive) return { group, item };
    }
  }
  return { group: null as PlatformNavGroup | null, item: null as PlatformNavItem | null };
}
