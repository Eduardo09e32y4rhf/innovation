import { SetMetadata } from '@nestjs/common';
import type { FeatureName } from '../feature-flags';

export const REQUIRES_FEATURE_KEY = 'requiresFeature';

/** Marca o controller (ou a rota) como parte de um modulo congelado: 404 enquanto FEATURE_<NOME> nao for ligada. */
export const RequiresFeature = (feature: FeatureName) => SetMetadata(REQUIRES_FEATURE_KEY, feature);
