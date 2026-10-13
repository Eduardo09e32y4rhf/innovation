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