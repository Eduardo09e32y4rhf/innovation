export type PlatformNavItem = { label: string; href: string };
export type PlatformNavGroup = { key: string; label: string; items: PlatformNavItem[] };

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  {
    key: 'overview',
    label: 'Visão Geral',
    items: [{ label: 'Central', href: '' }],
  },
  {
    key: 'operations',
    label: 'Operações',
    items: [
      { label: 'Empresas', href: '/companies' },
      { label: 'Acessos', href: '/access' },
      { label: 'Auditoria', href: '/audit' },
    ],
  },
  {
    key: 'finance',
    label: 'Financeiro',
    items: [
      { label: 'Faturamento', href: '/finance' },
      { label: 'Propostas', href: '/proposals' },
      { label: 'Contratos', href: '/contracts' },
      { label: 'Assinaturas', href: '/subscriptions' },
    ],
  },
  {
    key: 'products',
    label: 'Produtos',
    items: [
      { label: 'Planos', href: '/plans' },
      { label: 'Cupons', href: '/coupons' },
    ],
  },
  {
    key: 'communication',
    label: 'Comunicação',
    items: [
      { label: 'WhatsApp', href: '/whatsapp' },
    ],
  },
];

// Regra herdada do layout.tsx antigo: usuários COMERCIAL só enxergam Central, Empresas e Propostas.
const COMERCIAL_ALLOWED_LABELS = new Set(['Central', 'Empresas', 'Propostas']);

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
