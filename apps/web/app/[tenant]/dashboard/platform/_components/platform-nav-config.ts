import { Activity, Eye, Building2, Calculator, ClipboardSignature, CreditCard, FileKey2, Headset, LayoutDashboard, Megaphone, ScrollText, ShieldCheck, UsersRound, type LucideIcon } from 'lucide-react';
import { featureAllowed, type WebFeature } from '../../../../lib/feature-flags';

export type PlatformNavGroup = {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Modulo congelado: o item so aparece com a flag ligada. */
  feature?: WebFeature;
};

export const PLATFORM_NAV_GROUPS: PlatformNavGroup[] = [
  { key: 'overview', label: 'Visão geral', description: 'Saúde do ecossistema', href: '', icon: LayoutDashboard },
  { key: 'intelligence', label: 'Inteligência', description: 'Riscos e sinais da base', href: '?tab=resumo&sub=alertas', icon: Activity, feature: 'ai' },
  { key: 'companies', label: 'Empresas', description: 'Clientes e operação', href: '?tab=empresas', icon: Building2 },
  { key: 'finance', label: 'Financeiro', description: 'Receita, cobrança e caixa', href: '/finance', icon: CreditCard },
  { key: 'accounting', label: 'Contabilidade', description: 'Revisão por empresa e competência', href: '/accounting', icon: Calculator },
  { key: 'contracts', label: 'Contratos', description: 'Ciclo contratual', href: '?tab=comercial&sub=contratos', icon: ClipboardSignature, feature: 'manual-contracts' },
  { key: 'proposals', label: 'Propostas', description: 'Pipeline comercial', href: '?tab=comercial&sub=propostas', icon: ScrollText, feature: 'proposals' },
  { key: 'configuration', label: 'Configuração global', description: 'Hub administrativo', href: '?tab=configuracoes&sub=global', icon: FileKey2 },
  { key: 'permissions', label: 'Permissões', description: 'Perfis e políticas', href: '?tab=configuracoes&sub=permissoes', icon: ShieldCheck },
  { key: 'access', label: 'Acessos', description: 'Sessões técnicas', href: '?tab=configuracoes&sub=acessos', icon: UsersRound },
  { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp e canais', href: '/whatsapp', icon: Megaphone, feature: 'communication' },
  { key: 'audit', label: 'Auditoria', description: 'Logs e rastreabilidade', href: '?tab=auditoria', icon: ShieldCheck },
  { key: 'visitas', label: 'Visitas do site', description: 'Acessos à landing page', href: '/visitas', icon: Eye },
  { key: 'support', label: 'Suporte operacional', description: 'Fila, SLA e atendimento', href: '?tab=suporte', icon: Headset },
];

export function getPlatformNavGroups(role: string): PlatformNavGroup[] {
  const policies: Record<string, string[]> = {
    DEV: PLATFORM_NAV_GROUPS.map(group => group.key),
    CEO: ['overview', 'companies', 'finance', 'accounting', 'configuration', 'access', 'audit'],
    COMERCIAL: ['overview', 'companies', 'finance', 'contracts', 'proposals', 'intelligence', 'access'],
  };
  return PLATFORM_NAV_GROUPS.filter(group => featureAllowed(group.feature) && (policies[role] || []).includes(group.key));
}
