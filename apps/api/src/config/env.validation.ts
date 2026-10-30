import { Logger } from '@nestjs/common';
import { FROZEN_FEATURES, featureEnvName, featureFlagProblems } from '../common/feature-flags';

/**
 * Variaveis OPCIONAIS (nunca exigidas, nem em producao) do Cloudflare Turnstile (captcha gratuito; ver docs/TURNSTILE.md):
 *  - TURNSTILE_SECRET_KEY: segredo do widget (API). Sem ela o captcha fica DESLIGADO e nada muda.
 *  - NEXT_PUBLIC_TURNSTILE_SITE_KEY: chave publica do widget (web, definida no build). Sem ela os formularios nao exibem o widget.
 */
export const OPTIONAL_TURNSTILE_ENV = ['TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY'] as const;

/**
 * Variaveis que a API le (process.env/ConfigService) e que docker-compose.prod.yml DEVE repassar ao container.
 * O valor e o padrao usado no compose (`${VAR:-padrao}`): '' quando o codigo ja trata vazio como "nao definida"
 * (`||`, trim, parse com fallback); nos demais e o proprio padrao do codigo, para que repassar nao mude o comportamento.
 * Nada aqui e obrigatorio (ver productionEnvProblems). Guardado por tests/contract/compose-env.spec.ts.
 */
export const COMPOSE_API_PASSTHROUGH_ENV: Readonly<Record<string, string>> = {
  TRUST_PROXY: 'loopback,uniquelocal', // main.ts usa `??`: vazio desligaria o proxy confiavel
  ANALYTICS_SALT: '',
  PRIVACY_RSA_PRIVATE_KEY: '',
  TRIAL_DOCUMENT_HASH_SECRET: '',
  WHATSAPP_SESSION_PATH: '',
  TURNSTILE_SECRET_KEY: '',
  TURNSTILE_FAIL_MODE: '', // open|closed; vazio = padrao do codigo (closed so em producao com chave e TURNSTILE_ENFORCE=true)
  TURNSTILE_ENFORCE: '', // 'true' liga o modo estrito
  TURNSTILE_PUBLIC_SUPPORT_REQUIRED: '', // 'true' exige o token do Turnstile em /support/public/* (so depois do formulario enviar o token)
  PASSWORD_RESET_CODE_SECRET: '', // vazio = usa JWT_SECRET
  OPENAI_API_KEY: '',
  OPENAI_AI_ENABLED: '',
  OPENAI_MODEL_FAST: '',
  OPENAI_MODEL_REASONING: '',
  OPENAI_MONTHLY_BUDGET: '',
  REFRESH_TTL_DAYS: '',
  SESSION_ABSOLUTE_DAYS: '',
  BILLING_GRACE_DAYS: '15', // subscription.guard usa `?? 15` e Number('') = 0: vazio tiraria a carencia
  DUNNING_WARN_DAY: '',
  DUNNING_BLOCK_DAY: '',
  DUNNING_CANCEL_DAY: '',
  GEOIP_DB_PATH: '',
  PLATFORM_WHATSAPP_SESSION_KEY: '',
  ASAAS_WEBHOOK_SECRET: '',
  MAIL_REQUIRED: '',
  MERCADOPAGO_WEBHOOK_TOLERANCE_SECONDS: '',
  ...Object.fromEntries(FROZEN_FEATURES.map((name) => [featureEnvName(name), 'false'])),
};

/** Build args do web (NEXT_PUBLIC_*: entram no bundle no `next build`) que o compose deve repassar. */
export const COMPOSE_WEB_BUILD_ARGS: Readonly<Record<string, string>> = {
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
  ...Object.fromEntries(FROZEN_FEATURES.map((name) => [`NEXT_PUBLIC_${featureEnvName(name)}`, 'false'])),
};

export type TurnstileBootStatus = {
  level: 'ok' | 'info' | 'warn' | 'alarm' | 'error';
  enabled: boolean;
  enforce: boolean;
  message: string;
};

/**
 * RS-C-02. Estado do anti-robo para o log de boot e para a tela do DEV (nunca devolve o segredo).
 * - ENFORCE=true sem chave em producao: erro (o boot falha, ver productionEnvProblems).
 * - Sem chave em producao e sem ENFORCE: alarme (formularios publicos ficam sem captcha).
 */
export function turnstileBootStatus(env: Record<string, unknown>): TurnstileBootStatus {
  const text = (key: string) => String(env[key] ?? '').trim();
  const enabled = Boolean(text('TURNSTILE_SECRET_KEY'));
  const enforce = text('TURNSTILE_ENFORCE').toLowerCase() === 'true';
  const production = text('NODE_ENV') === 'production';
  if (!production) return { level: 'info', enabled, enforce, message: enabled ? 'Turnstile ativo (ambiente nao produtivo).' : 'Turnstile desligado (ambiente nao produtivo).' };
  if (enforce && !enabled) return { level: 'error', enabled, enforce, message: 'TURNSTILE_ENFORCE=true mas TURNSTILE_SECRET_KEY nao esta definida.' };
  if (!enabled) return { level: 'alarm', enabled, enforce, message: 'ALARME: TURNSTILE_SECRET_KEY nao definida em producao. Candidatura, cadastro e pedidos LGPD ficam SEM captcha. Configure a chave e TURNSTILE_ENFORCE=true (docs/TURNSTILE.md).' };
  if (!enforce) return { level: 'warn', enabled, enforce, message: 'Turnstile ativo, mas TURNSTILE_ENFORCE nao e true: se a Cloudflare falhar, a verificacao passa sem validar (modo aberto).' };
  return { level: 'ok', enabled, enforce, message: 'Turnstile ativo em modo estrito.' };
}

const WEAK_JWT_MARKERS = ['TROQUE_', 'local-development', 'innovation-secret-key', 'changeme', 'secret'];

const PLACEHOLDER_MARKERS = ['troque_', 'token_seguro', 'sua_', 'your_', 'changeme', 'example'];

/** Retorna os problemas encontrados (lista vazia = ambiente seguro). Função pura, testável. */
export function productionEnvProblems(config: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const text = (key: string) => String(config[key] ?? '').trim();

  if (!text('ALLOWED_ORIGINS')) problems.push('ALLOWED_ORIGINS is required in production.');

  // RS-C-02: so quebra quem optou pelo modo estrito; quem ainda nao configurou recebe o alarme de boot (validateEnv).
  if (text('TURNSTILE_ENFORCE').toLowerCase() === 'true' && !text('TURNSTILE_SECRET_KEY')) {
    problems.push('TURNSTILE_SECRET_KEY is required when TURNSTILE_ENFORCE=true (anti-bot would be silently disabled).');
  }

  const jwt = text('JWT_SECRET');
  if (jwt.length < 32 || WEAK_JWT_MARKERS.some((marker) => jwt.toLowerCase().includes(marker.toLowerCase()))) {
    problems.push('JWT_SECRET must be a strong production secret with at least 32 characters (use openssl rand -hex 32).');
  }

  const kms = text('KMS_MASTER_KEY');
  if (!/^[0-9a-fA-F]{64}$/.test(kms)) problems.push('KMS_MASTER_KEY must be 64 hex characters (openssl rand -hex 32).');
  else if (kms === jwt) problems.push('KMS_MASTER_KEY must differ from JWT_SECRET.');

  const databaseUrl = text('DATABASE_URL');
  const isLocalDatabase = /@(localhost|127\.0\.0\.1|postgres|db|pgbouncer|innovation-postgres)(:|\/)/.test(databaseUrl);
  if (databaseUrl.startsWith('postgres')) {
    if (!isLocalDatabase && !/sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl)) {
      problems.push('Production DATABASE_URL for remote PostgreSQL must require SSL (sslmode=require or stronger).');
    }
    const password = /:\/\/[^:]+:([^@]*)@/.exec(databaseUrl)?.[1] ?? '';
    if (password.length < 16 || ['innovation', 'postgres', 'password', 'changeme'].includes(decodeURIComponent(password).toLowerCase())) {
      problems.push('DATABASE_URL uses a weak or default database password (minimum 16 characters).');
    }
  }

  const redisUrl = text('REDIS_URL');
  if (redisUrl && !/^rediss?:\/\/[^@/]*:[^@]+@/.test(redisUrl) && !text('REDIS_PASSWORD')) {
    problems.push('Redis must require a password in production (REDIS_URL=redis://:password@host:6379 or REDIS_PASSWORD).');
  }

  // Métricas sempre ficam protegidas. Webhook só é obrigatório quando o
  // respectivo provedor está ativo; um segredo aleatório local não corresponde
  // ao valor cadastrado no Asaas/Mercado Pago.
  const required = (key: string, minLength: number) => {
    const value = text(key);
    if (!value) problems.push(`${key} is required in production.`);
    else if (value.length < minLength || PLACEHOLDER_MARKERS.some((m) => value.toLowerCase().includes(m))) {
      problems.push(`${key} must be a real secret with at least ${minLength} characters (not an example value).`);
    }
  };
  required('METRICS_TOKEN', 16);
  if (text('ASAAS_API_KEY')) {
    if (!text('ASAAS_WEBHOOK_TOKEN') && text('ASAAS_WEBHOOK_SECRET')) required('ASAAS_WEBHOOK_SECRET', 32);
    else required('ASAAS_WEBHOOK_TOKEN', 32);
  }
  if (text('MERCADOPAGO_ACCESS_TOKEN')) required('MERCADOPAGO_WEBHOOK_SECRET', 16);
  return problems;
}

export function validateEnv(config: Record<string, unknown>) {
  if (!config.JWT_SECRET && config.SECRET_KEY) {
    config.JWT_SECRET = config.SECRET_KEY;
  }
  if (!config.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    config.JWT_SECRET = 'innovation-rh-connect-local-development-secret';
  }

  for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!config[key]) throw new Error(`Missing required environment variable: ${key}`);
  }

  const flagProblems = featureFlagProblems(config);
  if (flagProblems.length) throw new Error(`Invalid feature flags:\n - ${flagProblems.join('\n - ')}`);

  if (process.env.NODE_ENV === 'production') {
    const problems = productionEnvProblems(config);
    if (problems.length) {
      throw new Error(`Insecure production configuration:\n - ${problems.join('\n - ')}`);
    }
    const turnstile = turnstileBootStatus({ ...config, NODE_ENV: 'production' });
    if (turnstile.level === 'alarm' || turnstile.level === 'warn') new Logger('Config').error(turnstile.message);
  }

  return config;
}
