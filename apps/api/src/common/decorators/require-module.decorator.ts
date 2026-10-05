import { SetMetadata } from '@nestjs/common';

export const REQUIRED_MODULE_KEY = 'requiredModule';

/** Exige que o modulo esteja em Company.activeModules (DEV nao e limitado por plano). */
export const RequireModule = (moduleKey: string) => SetMetadata(REQUIRED_MODULE_KEY, moduleKey);