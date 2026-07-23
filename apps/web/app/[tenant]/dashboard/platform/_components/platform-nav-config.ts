export type PlatformNavItem = { label: string; href: string };
export type PlatformNavGroup = { key: string; label: string; items: PlatformNavItem[] };

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    key: 'overview',
    label: 'Visão Geral',
    items: [{ label: 'Visão Geral', href: '' }],
  },
  {
    key: 'companies',
    label: 'Empresas',
    items: [
      { label: 'Empresas', href: '/companies' },
      { label: 'WhatsApp', href: '/whatsapp' },
    ],
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { label: 'Financeiro', href: '/finance' },
      { label: 'Propostas', href: '/proposals' },
      { label: 'Contratos', href: '/contracts' },
      { label: 'Assinaturas', href: '/subscriptions' },
    ],
  },
  {
    key: 'products',
    label: 'Produtos & Segurança',
    items: [
      { label: 'Planos', href: '/plans' },
      { label: 'Cupons e testes', href: '/coupons' },
      { label: 'Acessos', href: '/access' },
      { label: 'Auditoria', href: '/audit' },
    ],
  },
];

// Regra herdada do layout.tsx antigo: usuários COMERCIAL só enxergam Visão Geral, Empresas e Propostas.
const COMERCIAL_ALLOWED_LABELS = new Set(['Visão Geral', 'Empresas', 'Propostas']);

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
