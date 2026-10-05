/**
 * Enquanto o CEO nao conclui o onboarding (troca de senha, facial, dados, contrato), a sessao
 * so alcanca as rotas do proprio onboarding e de autenticacao. Qualquer outra rota e negada no guard.
 */
const CEO_RESTRICTED_STATES = new Set(['INVITED', 'PASSWORD_CHANGE', 'FACE_ENROLLMENT', 'PROFILE_REQUIRED', 'CONTRACT_PENDING']);
const ALLOWED_PREFIXES = ['auth', 'me', 'ceo-onboarding', 'legal'];

/** CEO_ONBOARDING_ENFORCEMENT=off desliga a restricao (saida temporaria enquanto a facial real nao existe). Padrao: ativa. */
export function isCeoOnboardingRestricted(role?: string | null, onboardingState?: string | null): boolean {
  if ((process.env.CEO_ONBOARDING_ENFORCEMENT ?? '').toLowerCase() === 'off') return false;
  return role === 'CEO' && Boolean(onboardingState) && CEO_RESTRICTED_STATES.has(String(onboardingState));
}

export function isRouteAllowedDuringCeoOnboarding(rawPath: string): boolean {
  const path = String(rawPath ?? '').split('?')[0];
  if (path.includes('..') || path.includes('//') || path.includes('%')) return false;
  const first = path.replace(/^\/+/, '').replace(/^api\//, '').split('/')[0];
  return ALLOWED_PREFIXES.includes(first);
}