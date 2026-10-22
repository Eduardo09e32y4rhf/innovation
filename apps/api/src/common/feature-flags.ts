/**
 * Modulos fora do MVP (v1.0) ficam CONGELADOS: o codigo continua no repositorio,
 * mas as rotas respondem 404 e as tarefas agendadas nao rodam, ate a flag ser ligada.
 * Cada flag e `FEATURE_<NOME>` (maiusculas, "-" vira "_"); o padrao e DESLIGADO.
 */
export const FROZEN_FEATURES = [
  'ai',
  'partners',
  'commercial-sales',
  'proposals',
  'manual-contracts',
  'ceo-onboarding',
  'communication',
  'promotions',
] as const;

export type FeatureName = (typeof FROZEN_FEATURES)[number];

const TRUE_VALUES = new Set(['true', '1', 'on', 'yes']);
const FALSE_VALUES = new Set(['', 'false', '0', 'off', 'no']);

export function featureEnvName(name: string): string {
  return `FEATURE_${name.toUpperCase().replace(/-/g, '_')}`;
}

export function parseFlag(value: unknown): boolean | undefined {
  const text = String(value ?? '').trim().toLowerCase();
  if (TRUE_VALUES.has(text)) return true;
  if (FALSE_VALUES.has(text)) return false;
  return undefined;
}

/** Le o ambiente a cada chamada (sem cache) para que testes e reinicios respeitem a configuracao atual. */
export function isFeatureEnabled(name: FeatureName | string, env: Record<string, string | undefined> = process.env): boolean {
  return parseFlag(env[featureEnvName(name)]) === true;
}

/** Problemas de configuracao: valor que nao e booleano reconhecivel. Lista vazia = ok. */
export function featureFlagProblems(config: Record<string, unknown>): string[] {
  return FROZEN_FEATURES.flatMap((name) => {
    const key = featureEnvName(name);
    const raw = config[key];
    return raw === undefined || parseFlag(raw) !== undefined ? [] : [`${key} must be true or false (got "${String(raw)}").`];
  });
}
