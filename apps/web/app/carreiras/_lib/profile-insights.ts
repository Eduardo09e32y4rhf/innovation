import { candidateProfileStrength } from '../../../../api/src/modules/jobs/candidate-profile-strength';
export type { StrengthItem } from '../../../../api/src/modules/jobs/candidate-profile-strength';
export const profileStrength = candidateProfileStrength;

export function monthLabel(value: string | null, locale = 'pt-BR') {
  if (!value) return '';
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' }).replace('.', '');
}
