export type FaturasTab = 'faturas' | 'assinaturas' | 'planos' | 'cupons';

export const FATURAS_TAB_LABEL: Record<FaturasTab, string> = {
  faturas: 'Faturas',
  assinaturas: 'Assinaturas',
  planos: 'Planos',
  cupons: 'Cupons',
};

/**
 * Quem ve cada aba na visao da plataforma. Espelha os perfis aceitos pela API
 * (plans.controller: DEV/CEO/CONTABIL/COMERCIAL; coupons.controller: DEV/CEO/CONTABIL). A API continua sendo a autoridade.
 */
const POLICY: Record<FaturasTab, readonly string[]> = {
  faturas: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'],
  assinaturas: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'],
  planos: ['DEV', 'CEO', 'CONTABIL', 'COMERCIAL'],
  cupons: ['DEV', 'CEO', 'CONTABIL'],
};

const ORDER: FaturasTab[] = ['faturas', 'assinaturas', 'planos', 'cupons'];

export function visibleFaturasTabs(role: string | null | undefined): FaturasTab[] {
  const normalized = String(role ?? '').toUpperCase();
  return ORDER.filter((tab) => POLICY[tab].includes(normalized));
}

/** Aba pedida na URL (?aba=) quando permitida; senao a primeira disponivel. */
export function resolveFaturasTab(requested: string | null | undefined, role: string | null | undefined): FaturasTab {
  const tabs = visibleFaturasTabs(role);
  return (tabs.includes(requested as FaturasTab) ? (requested as FaturasTab) : tabs[0]) ?? 'faturas';
}