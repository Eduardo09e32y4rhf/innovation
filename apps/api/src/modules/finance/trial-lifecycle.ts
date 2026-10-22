/**
 * Teste grátis por cupom (ex.: BEMVINDOS, 10 dias): aviso no 9º dia, decisão do administrador e o que acontece no fim.
 * - Dia 9: o administrador recebe uma notificação para continuar (a cobrança sai sozinha no Asaas) ou recusar.
 * - Fim do teste: recusou = conta cancelada e nada é cobrado; sem recusa = o pagamento é solicitado (fatura automática).
 * - O CPF/CNPJ nunca pode usar o cupom de novo (a trava fica no resgate, por hash do documento).
 */
const DAY = 86_400_000;
/** Avisa quando faltam 2 dias ou menos (9º dia de um teste de 10 dias). */
export const NOTICE_WINDOW_DAYS = 2;

export function shouldSendTrialNotice(input: { trialEndsAt: Date | null; trialNoticeAt: Date | null; now?: Date }): boolean {
  const now = input.now ?? new Date();
  if (!input.trialEndsAt || input.trialNoticeAt) return false;
  const left = input.trialEndsAt.getTime() - now.getTime();
  return left > 0 && left <= NOTICE_WINDOW_DAYS * DAY;
}

export type TrialOutcome = 'CANCEL' | 'CHARGE';
export function trialOutcome(input: { trialDeclinedAt: Date | null }): TrialOutcome {
  return input.trialDeclinedAt ? 'CANCEL' : 'CHARGE';
}

const brDate = (date: Date) => date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function trialNoticeContent(input: { trialEndsAt: Date; planName: string; amount: number }) {
  const end = brDate(input.trialEndsAt);
  return {
    title: 'Seu teste grátis termina em breve',
    message:
      `Seu acesso grátis ao plano ${input.planName} termina em ${end}.\n\n` +
      `• Para continuar: toque em "Aceitar". No dia ${end} a cobrança de ${brl(input.amount)} por mês é gerada automaticamente e você paga pela aba Faturas.\n` +
      `• Para não continuar: toque em "Recusar assinatura". No dia ${end} o acesso é bloqueado e nada é cobrado.\n\n` +
      `Se você não responder, a assinatura continua. O teste grátis é único por CPF/CNPJ e não pode ser usado de novo.`,
  };
}
/** Avisos de contagem regressiva do fim do teste: 7, 3 e 1 dia antes (dias de calendário em America/Sao_Paulo). */
export const TRIAL_COUNTDOWN_STAGES = [7, 3, 1] as const;
export type TrialCountdownStage = (typeof TRIAL_COUNTDOWN_STAGES)[number];

const spDayNumber = (date: Date) => {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** Dias de calendário que faltam para o fim do teste (0 = termina hoje, negativo = já terminou). */
export function trialDaysLeft(trialEndsAt: Date, now: Date = new Date()): number {
  return spDayNumber(trialEndsAt) - spDayNumber(now);
}

/** Qual aviso (7, 3 ou 1 dia) vale hoje; null nos demais dias. */
export function trialCountdownStage(trialEndsAt: Date | null | undefined, now: Date = new Date()): TrialCountdownStage | null {
  if (!trialEndsAt) return null;
  const left = trialDaysLeft(trialEndsAt, now);
  return (TRIAL_COUNTDOWN_STAGES as readonly number[]).includes(left) ? (left as TrialCountdownStage) : null;
}

export function trialCountdownKey(input: { companyId: string; trialEndsAt: Date; stage: TrialCountdownStage; channel: 'INTERNAL' | 'EMAIL'; recipient?: string }): string {
  const end = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(input.trialEndsAt);
  return `trial-countdown:${input.companyId}:${end}:D${input.stage}:${input.channel}${input.recipient ? `:${input.recipient.toLowerCase()}` : ''}`;
}

export function trialCountdownContent(input: { stage: TrialCountdownStage; trialEndsAt: Date; planName: string; amount: number }) {
  const end = brDate(input.trialEndsAt);
  const when = input.stage === 1 ? 'amanhã' : `em ${input.stage} dias`;
  return {
    title: input.stage === 1 ? 'Seu teste grátis termina amanhã' : `Seu teste grátis termina em ${input.stage} dias`,
    message:
      `Seu teste grátis do plano ${input.planName} termina ${when} (${end}).\n\n` +
      `Ao fim do teste geramos a primeira fatura de ${brl(input.amount)}, que você paga pela aba Faturas. ` +
      `Se não pagar, o acesso fica bloqueado até a regularização. Para não continuar, recuse a assinatura na aba Faturas antes de ${end}.`,
  };
}
