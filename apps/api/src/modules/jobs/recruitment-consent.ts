import { createHash } from 'node:crypto';
import { PRIVACY_VERSION } from './recruitment-privacy';

/**
 * RS-D-06: textos de consentimento EXATOS mostrados ao candidato (versao PRIVACY_VERSION). O hash do texto vai para o livro de
 * consentimentos como prova. Os mesmos textos ficam em apps/web/app/carreiras/_lib/consent-texts.ts
 * (tests/contract/consent-texts.spec.ts garante que sao iguais). Mudou o texto? Suba PRIVACY_VERSION.
 */
export const CONSENT_PURPOSES = ['APPLICATION', 'TALENT_POOL', 'SENSITIVE_DATA'] as const;
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export const CONSENT_TEXTS: Record<ConsentPurpose, string> = {
  APPLICATION: 'Autorizo o tratamento dos dados enviados para avaliação da minha candidatura. Li a Política de Privacidade. Meus dados serão guardados pelo prazo do processo seletivo e eu posso pedir acesso, correção ou exclusão a qualquer momento em Meus dados.',
  TALENT_POOL: 'Autorizo que meu perfil (nome, profissão, cidade, formação) fique disponível no banco de talentos para outras vagas por 12 meses. Posso revogar quando quiser, sem prejuízo da minha candidatura atual.',
  SENSITIVE_DATA: 'Autorizo o uso das informações voluntárias de gênero, cor ou raça e deficiência apenas para relatórios anônimos de diversidade. Posso revogar quando quiser.',
};

export const CONSENT_LABELS: Record<ConsentPurpose, string> = {
  APPLICATION: 'Tratamento de dados da candidatura',
  TALENT_POOL: 'Banco de talentos',
  SENSITIVE_DATA: 'Dados de diversidade (sensíveis)',
};

export const consentTextHash = (purpose: ConsentPurpose, version = PRIVACY_VERSION) =>
  createHash('sha256').update(`${version}\n${CONSENT_TEXTS[purpose]}`).digest('hex');
