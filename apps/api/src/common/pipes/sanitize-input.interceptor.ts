import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { sanitizeString } from '../utils/sanitize-string';

// Segredos, credenciais, assinaturas e binários nunca podem ser alterados.
const PROTECTED_KEY = /(password|senha|token|secret|hash|signature|assinatura|authorization|base64|dataurl|photo|foto|selfie|biometr|descriptor|embedding)/i;
// Campos que carregam HTML/markup de propósito (renderizados no servidor, nunca no DOM do front).
const RICH_TEXT_KEY = /^(contentHtml|html|htmlContent|bodyHtml)$/i;
const DATA_URI = /^data:(image|application|audio|video)\//i;
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 20;
// Rotas isentas: webhooks (assinatura calculada sobre o payload original) e templates de documento (HTML legítimo).
const EXCLUDED_PATH = /(^|\/)(webhooks?|document-templates)(\/|$)/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function sanitizeDeep(value: unknown, key = '', depth = 0): unknown {
  if (depth > MAX_DEPTH) return value;
  if (typeof value === 'string') {
    if (PROTECTED_KEY.test(key) || RICH_TEXT_KEY.test(key) || DATA_URI.test(value)) return value;
    return sanitizeString(value, { trim: false });
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeDeep(item, key, depth + 1));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (UNSAFE_KEYS.has(k)) continue;
      out[k] = sanitizeDeep(v, k, depth + 1);
    }
    return out;
  }
  return value;
}

export function isSanitizeExcluded(path: string, contentType: unknown): boolean {
  if (EXCLUDED_PATH.test(path)) return true;
  return typeof contentType === 'string' && contentType.toLowerCase().startsWith('multipart/');
}

/**
 * Roda depois dos guards e antes do ValidationPipe, com acesso à rota e aos headers
 * (um Pipe não enxerga nenhum dos dois, e precisamos isentar webhooks e multipart).
 */
@Injectable()
export class SanitizeInputInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const path = String(req.raw?.url ?? req.url ?? '').split('?')[0];
    // Byte nulo (%00) em parametro de URL: o Postgres recusa e a rota respondia 500 (inclusive nas publicas).
    if (req.params && typeof req.params === 'object' && Object.values(req.params).some((value) => typeof value === 'string' && value.includes('\u0000'))) {
      throw new BadRequestException('Parâmetro inválido.');
    }
    if (isSanitizeExcluded(path, req.headers?.['content-type'])) return next.handle();

    if (req.body && typeof req.body === 'object') req.body = sanitizeDeep(req.body);
    if (req.query && typeof req.query === 'object') req.query = sanitizeDeep(req.query);
    return next.handle();
  }
}
