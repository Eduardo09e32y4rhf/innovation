/**
 * Modulos fora do MVP (v1.0) ficam CONGELADOS no site: sem menu, sem busca (Ctrl+K), sem pagina.
 * Cada flag e `NEXT_PUBLIC_FEATURE_<NOME>`; o padrao e DESLIGADO. Como todo NEXT_PUBLIC_*, e variavel de
 * BUILD: o valor entra no codigo na hora do `next build` e deve ser o mesmo da API (`FEATURE_<NOME>`).
 */
export type WebFeature =
  | 'ai'
  | 'partners'
  | 'commercial-sales'
  | 'proposals'
  | 'manual-contracts'
  | 'ceo-onboarding'
  | 'communication'
  | 'promotions';

/**
 * O Next so troca `process.env.NEXT_PUBLIC_X` por seu valor quando a variavel e escrita por extenso;
 * a leitura dinamica por chave (indice entre colchetes) NAO funciona no navegador. Por isso cada leitura e literal, uma funcao por flag
 * (lida a cada chamada, o que tambem deixa os testes ligarem e desligarem a flag).
 */
const READERS: Record<WebFeature, () => string | undefined> = {
  ai: () => process.env.NEXT_PUBLIC_FEATURE_AI,
  partners: () => process.env.NEXT_PUBLIC_FEATURE_PARTNERS,
  'commercial-sales': () => process.env.NEXT_PUBLIC_FEATURE_COMMERCIAL_SALES,
  proposals: () => process.env.NEXT_PUBLIC_FEATURE_PROPOSALS,
  'manual-contracts': () => process.env.NEXT_PUBLIC_FEATURE_MANUAL_CONTRACTS,
  'ceo-onboarding': () => process.env.NEXT_PUBLIC_FEATURE_CEO_ONBOARDING,
  communication: () => process.env.NEXT_PUBLIC_FEATURE_COMMUNICATION,
  promotions: () => process.env.NEXT_PUBLIC_FEATURE_PROMOTIONS,
};

const TRUE_VALUES = new Set(['true', '1', 'on', 'yes']);

export function isFeatureEnabled(feature: WebFeature): boolean {
  return TRUE_VALUES.has(String(READERS[feature]() ?? '').trim().toLowerCase());
}

/** Itens com `feature` so aparecem quando a flag esta ligada; sem `feature` sempre aparecem. */
export function featureAllowed(feature: WebFeature | undefined): boolean {
  return !feature || isFeatureEnabled(feature);
}
