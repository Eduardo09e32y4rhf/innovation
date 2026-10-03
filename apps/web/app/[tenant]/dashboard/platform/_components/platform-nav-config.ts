import { Activity, BarChart3, Building2, Calculator, ClipboardSignature, CreditCard, FileKey2, Headset, LayoutDashboard, Megaphone, ReceiptText, ScrollText, ShieldCheck, TicketPercent, UsersRound, type LucideIcon } from 'lucide-react';

export type PlatformNavGroup = {
  key: string;
  label: string;
  description: string;
  href: string;
  matchPrefixes: string[];
  icon: LucideIcon;
};

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  { key: 'overview', label: 'Visão geral', description: 'Saúde do ecossistema', href: '', matchPrefixes: [], icon: LayoutDashboard },
  { key: 'intelligence', label: 'Inteligência', description: 'Riscos e sinais da base', href: '/intelligence', matchPrefixes: ['/intelligence'], icon: Activity },
  { key: 'companies', label: 'Empresas', description: 'Clientes e operação', href: '/companies', matchPrefixes: ['/companies'], icon: Building2 },
  { key: 'finance', label: 'Financeiro', description: 'Receita, cobrança e caixa', href: '/finance', matchPrefixes: ['/finance'], icon: CreditCard },
  { key: 'accounting', label: 'Contabilidade', description: 'Revisão por empresa e competência', href: '/accounting', matchPrefixes: ['/accounting'], icon: Calculator },
  { key: 'contracts', label: 'Contratos', description: 'Ciclo contratual', href: '/contracts', matchPrefixes: ['/contracts'], icon: ClipboardSignature },
  { key: 'proposals', label: 'Propostas', description: 'Pipeline comercial', href: '/proposals', matchPrefixes: ['/proposals'], icon: ScrollText },
  { key: 'subscriptions', label: 'Assinaturas', description: 'Recorrência e clientes', href: '/subscriptions', matchPrefixes: ['/subscriptions'], icon: ReceiptText },
  { key: 'plans', label: 'Planos', description: 'Produtos e limites', href: '/plans', matchPrefixes: ['/plans'], icon: BarChart3 },
  { key: 'configuration', label: 'Configuração global', description: 'Hub administrativo', href: '/configuration', matchPrefixes: ['/configuration'], icon: FileKey2 },
  { key: 'permissions', label: 'Permissões', description: 'Perfis e políticas', href: '/permissions', matchPrefixes: ['/permissions'], icon: ShieldCheck },
  { key: 'access', label: 'Acessos', description: 'Sessões técnicas', href: '/access', matchPrefixes: ['/access'], icon: UsersRound },
  { key: 'coupons', label: 'Cupons', description: 'Incentivos comerciais', href: '/coupons', matchPrefixes: ['/coupons'], icon: TicketPercent },
  { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp e canais', href: '/whatsapp', matchPrefixes: ['/whatsapp'], icon: Megaphone },
  { key: 'audit', label: 'Auditoria', description: 'Logs e rastreabilidade', href: '/audit', matchPrefixes: ['/audit'], icon: ShieldCheck },
  { key: 'support', label: 'Suporte operacional', description: 'Fila, SLA e atendimento', href: '/support', matchPrefixes: ['/support'], icon: Headset },
];

export function getPlatformNavGroups(role: string): PlatformNavGroup[] {
  const policies: Record<string, string[]> = {
    DEV: PLATFORM_NAV_GROUPS.map(group => group.key),
    CEO: ['overview', 'companies', 'finance', 'accounting', 'subscriptions', 'configuration', 'access', 'audit'],
    COMERCIAL: ['overview', 'companies', 'finance', 'contracts', 'proposals', 'subscriptions', 'plans', 'intelligence', 'access'],
  };
  return PLATFORM_NAV_GROUPS.filter(group => (policies[role] || []).includes(group.key));
}

export function resolvePlatformActive(base: string, pathname: string, groups: PlatformNavGroup[]) {
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPathname = pathname.replace(/\/+$/, '');

  for (const group of groups) {
    const full = `${normalizedBase}${group.href}`;
    if (normalizedPathname === full) {
      return { group, item: group };
    }
    if (group.matchPrefixes.some((prefix) => normalizedPathname.startsWith(`${normalizedBase}${prefix}/`))) {
      return { group, item: group };
    }
  }

  return { group: null as PlatformNavGroup | null, item: null as PlatformNavGroup | null };
}
