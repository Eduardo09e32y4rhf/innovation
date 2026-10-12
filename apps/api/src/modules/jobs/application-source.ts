/** Origem da candidatura (link rastreável por canal). Valor livre vindo da URL é reduzido a uma lista fixa para não poluir os relatórios. */
export const APPLICATION_SOURCES = ['CAREERS_PORTAL', 'LINKEDIN', 'INDEED', 'GUPY', 'VAGAS', 'CATHO', 'INFOJOBS', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'EMAIL', 'INDICACAO', 'SITE', 'OUTRO'] as const;
export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

const ALIASES: Record<string, ApplicationSource> = {
  LINKEDIN: 'LINKEDIN', LI: 'LINKEDIN', INDEED: 'INDEED', GUPY: 'GUPY', VAGAS: 'VAGAS', VAGASCOM: 'VAGAS', CATHO: 'CATHO', INFOJOBS: 'INFOJOBS',
  WHATSAPP: 'WHATSAPP', WA: 'WHATSAPP', ZAP: 'WHATSAPP', INSTAGRAM: 'INSTAGRAM', IG: 'INSTAGRAM', FACEBOOK: 'FACEBOOK', FB: 'FACEBOOK',
  EMAIL: 'EMAIL', INDICACAO: 'INDICACAO', REFERRAL: 'INDICACAO', SITE: 'SITE',
};

export function normalizeSource(value: unknown): ApplicationSource {
  const key = String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!key) return 'CAREERS_PORTAL';
  return ALIASES[key] ?? 'OUTRO';
}