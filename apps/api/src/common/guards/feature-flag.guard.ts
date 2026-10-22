import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRES_FEATURE_KEY } from '../decorators/requires-feature.decorator';
import { isFeatureEnabled } from '../feature-flags';

/**
 * Guard global registrado ANTES dos demais: rota de modulo congelado responde 404
 * (como se nao existisse) sem consultar login, limite de requisicoes ou banco.
 * Rotas sem o decorator passam direto.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<string | undefined>(REQUIRES_FEATURE_KEY, [context.getHandler(), context.getClass()]);
    if (!feature || isFeatureEnabled(feature)) return true;
    throw new NotFoundException();
  }
}
