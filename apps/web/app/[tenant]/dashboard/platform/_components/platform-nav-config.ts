export type PlatformNavGroup = {
  key: string;
  label: string;
  href: string;
  matchPrefixes: string[];
};

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  { key: 'finance', label: 'Financeiro', href: '/finance', matchPrefixes: ['/finance'] },
  { key: 'contracts', label: 'Contratos', href: '/contracts', matchPrefixes: ['/contracts', '/proposals'] },
  {
    key: 'configuration',
    label: 'Configuração',
    href: '/configuration',
    matchPrefixes: ['/configuration', '/companies', '/plans', '/permissions', '/access', '/coupons', '/subscriptions', '/whatsapp'],
  },
  {
    key: 'audit',
    label: 'Auditoria',
    href: '/audit',
    matchPrefixes: ['/audit'],
  },
];

export function getPlatformNavGroups(role: string): PlatformNavGroup[] {
  if (role === 'DEV') return PLATFORM_NAV_GROUPS;
  // ADMIN e COMERCIAL não acessam Configuração nem Auditoria
  return PLATFORM_NAV_GROUPS.filter((group) => group.key !== 'configuration' && group.key !== 'audit');
}

export function resolvePlatformActive(base: string, pathname: string, groups: PlatformNavGroup[]) {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPathname = pathname.replace(/\/+$/, '');

  for (const group of groups) {
    const full = `${normalizedBase}${group.href}`;
    if (normalizedPathname === full) {
      return { group, item: group };
    }
    if (group.matchPrefixes.some((prefix) => normalizedPathname.startsWith(`${normalizedBase}${prefix}`))) {
      return { group, item: group };
    }
  }

  return { group: null as PlatformNavGroup | null, item: null as PlatformNavGroup | null };
}
