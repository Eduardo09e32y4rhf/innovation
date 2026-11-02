/**
 * RS-D-06: textos de consentimento mostrados ao candidato. Devem ser IGUAIS a apps/api/src/modules/jobs/recruitment-consent.ts
 * (o servidor grava o hash deles como prova; tests/contract/consent-texts.spec.ts compara os dois arquivos).
 */
export const CONSENT_TEXTS = {
  APPLICATION: 'Autorizo o tratamento dos dados enviados para avaliação da minha candidatura. Li a Política de Privacidade. Meus dados serão guardados pelo prazo do processo seletivo e eu posso pedir acesso, correção ou exclusão a qualquer momento em Meus dados.',
  TALENT_POOL: 'Autorizo que meu perfil (nome, profissão, cidade, formação) fique disponível no banco de talentos para outras vagas por 12 meses. Posso revogar quando quiser, sem prejuízo da minha candidatura atual.',
  SENSITIVE_DATA: 'Autorizo o uso das informações voluntárias de gênero, cor ou raça e deficiência apenas para relatórios anônimos de diversidade. Posso revogar quando quiser.',
} as const;
