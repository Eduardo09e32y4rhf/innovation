export type PlatformNavItem = { label: string; href: string };
export type PlatformNavGroup = { key: string; label: string; items: PlatformNavItem[] };

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { label: 'Faturamento & Cobranças', href: '/finance' },
      { label: 'Assinaturas Asaas', href: '/subscriptions' },
    ],
  },
  {
    key: 'contracts',
    label: 'Contratos',
    items: [
      { label: 'Contratos Digitais', href: '/contracts' },
      { label: 'Propostas Comerciais', href: '/proposals' },
    ],
  },
  {
    key: 'settings',
    label: 'Configuração',
    items: [
      { label: 'Empresas Clientes', href: '/companies' },
      { label: 'Planos & Preços', href: '/plans' },
      { label: 'Acessos & Perfis DEV', href: '/access' },
      { label: 'Permissões Globais', href: '/permissions' },
      { label: 'Cupons de Desconto', href: '/coupons' },
      { label: 'WhatsApp', href: '/whatsapp' },
      { label: 'Log de Auditoria', href: '/audit' },
      { label: 'Análise de Risco IA', href: '/intelligence' },
    ],
  },
];

const COMERCIAL_ALLOWED_LABELS = new Set([
  'Faturamento & Cobranças',
  'Assinaturas Asaas',
  'Contratos Digitais',
  'Propostas Comerciais',
  'Empresas Clientes',
  'Planos & Preços',
  'Cupons de Desconto',
]);

export function getPlatformNavGroups(role: string): PlatformNavGroup[] {
  if (role === 'DEV' || role === 'ADMIN') return PLATFORM_NAV_GROUPS;
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
  // Se não encontrar (ex: na raiz /dashboard/platform), seleciona o primeiro grupo por padrão
  const defaultGroup = groups[0] ?? null;
  const defaultItem = defaultGroup?.items[0] ?? null;
  return { group: defaultGroup, item: defaultItem };
}
