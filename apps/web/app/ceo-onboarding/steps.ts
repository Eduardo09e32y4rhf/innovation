export type OnboardingState = 'INVITED' | 'PASSWORD_CHANGE' | 'FACE_ENROLLMENT' | 'PROFILE_REQUIRED' | 'CONTRACT_PENDING' | 'ACTIVE' | null | undefined;

const PENDING = new Set(['INVITED', 'PASSWORD_CHANGE', 'FACE_ENROLLMENT', 'PROFILE_REQUIRED', 'CONTRACT_PENDING']);

/** CEO que ainda nao concluiu o onboarding nao abre o dashboard (a API tambem barra). */
export function ceoOnboardingPending(user: { role?: string; profile?: string; onboardingState?: OnboardingState } | null | undefined): boolean {
  const role = String(user?.profile ?? user?.role ?? '').toUpperCase();
  return role === 'CEO' && Boolean(user?.onboardingState) && PENDING.has(String(user?.onboardingState));
}

export const STEPS = [
  { key: 'PASSWORD_CHANGE', label: 'Trocar a senha provisória' },
  { key: 'PROFILE_REQUIRED', label: 'Preencher seus dados' },
  { key: 'CONTRACT_PENDING', label: 'Ler e assinar o contrato' },
  { key: 'ACTIVE', label: 'Acesso liberado' },
] as const;

/** Posicao da etapa atual (0 a 3). Estados antigos de facial contam como "preencher seus dados". */
export function stepIndex(state: OnboardingState): number {
  if (state === 'ACTIVE') return 3;
  if (state === 'CONTRACT_PENDING') return 2;
  if (state === 'PROFILE_REQUIRED' || state === 'FACE_ENROLLMENT') return 1;
  return 0;
}

/** CPF com 11 digitos e digitos verificadores validos. */
export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]);
}