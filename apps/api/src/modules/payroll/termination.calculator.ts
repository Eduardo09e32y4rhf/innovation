import { PayrollCalculationService, PayrollTaxContext } from '../time-track/payroll-calculation.service';
import {
  addDays,
  currentVacationPeriodStart,
  fullYearsBetween,
  inclusiveDays,
  parseDay,
  salaryBalanceDays,
  thirteenthTwelfths,
  vacationTwelfths,
} from './labor-dates';
import { thirteenthTaxes, toCents, toReais } from './thirteenth.calculator';
import { deriveVestedVacations, EntitlementRecord } from './vested-vacations';

export const TERMINATION_TYPES = [
  'SEM_JUSTA_CAUSA',
  'JUSTA_CAUSA',
  'PEDIDO_DEMISSAO',
  'ACORDO',
  'TERMINO_CONTRATO',
  'ANTECIPADA_EMPREGADOR',
  'ANTECIPADA_EMPREGADO',
] as const;
export type TerminationType = (typeof TERMINATION_TYPES)[number];

export const NOTICE_MODES = ['INDENIZADO', 'TRABALHADO', 'NAO_CUMPRIDO', 'DISPENSADO'] as const;
export type NoticeMode = (typeof NOTICE_MODES)[number];

export interface TerminationInput {
  type: TerminationType;
  salary: number;
  admissionDate: string | Date;
  terminationDate: string | Date;
  noticeMode?: NoticeMode;
  contractEndDate?: string | Date;
  vestedVacationPeriods?: number;
  thirteenthAdvancePaid?: number;
  fgtsBalance?: number;
  dependents?: number;
  taxContext?: PayrollTaxContext;
  /** Média mensal das verbas variáveis (R$) — integra aviso, férias e 13º (CLT art. 142 §§3º/5º, 487 §3º; Súmula 45 TST). */
  variableMonthly?: number;
  /** Histórico de direitos de férias do módulo de férias. Se informado, substitui vestedVacationPeriods (derivação automática + dobra). */
  vacationHistory?: EntitlementRecord[];
}

type Line = { code: string; label: string; amount: number; legalBasis: string };

const engine = new PayrollCalculationService();
const FGTS_RATE = PayrollCalculationService.DEFAULT_FGTS_RATE;

/** Lei 12.506/2011: 30 dias + 3 por ano completo, até 90. O acréscimo só beneficia o empregado (Nota Técnica MTE 184/2012). */
export function noticeDays(admission: Date, termination: Date): number {
  return Math.min(90, 30 + 3 * fullYearsBetween(admission, termination));
}

export function calculateTermination(input: TerminationInput) {
  const admission = parseDay(input.admissionDate);
  const termination = parseDay(input.terminationDate);
  if (termination.getTime() < admission.getTime()) throw new Error('Data de desligamento anterior à admissão.');
  if (!(input.salary > 0)) throw new Error('Salário inválido.');

  const type = input.type;
  const salaryCents = toCents(input.salary);
  const variableCents = Math.max(0, toCents(input.variableMonthly ?? 0));
  // Remuneração = salário + média das variáveis; é a base do aviso, das férias, do 13º e do teto do art. 477 §5º.
  const baseCents = salaryCents + variableCents;
  const dailyCents = baseCents / 30;
  const salaryDailyCents = salaryCents / 30;
  const dependents = Math.max(0, input.dependents ?? 0);
  const earnings: Line[] = [];
  const discounts: Line[] = [];
  const warnings: string[] = [];
  const push = (list: Line[], code: string, label: string, cents: number, legalBasis: string) => {
    const amount = Math.round(cents);
    if (amount > 0) list.push({ code, label, amount: toReais(amount), legalBasis });
    return amount;
  };

  // Aviso prévio
  const proportionalNotice = noticeDays(admission, termination);
  const defaultMode: NoticeMode = type === 'PEDIDO_DEMISSAO' ? 'TRABALHADO' : 'INDENIZADO';
  const mode = input.noticeMode ?? defaultMode;
  let indemnifiedNoticeDays = 0;
  let noticeFactor = 1;
  let projectionDays = 0;
  if (type === 'SEM_JUSTA_CAUSA' || type === 'ACORDO') {
    noticeFactor = type === 'ACORDO' ? 0.5 : 1;
    // Trabalhado: no máximo 30 dias são cumpridos; o excedente proporcional é indenizado (art. 484-A I "a" no acordo).
    indemnifiedNoticeDays = mode === 'TRABALHADO' ? proportionalNotice - 30 : proportionalNotice;
    projectionDays = indemnifiedNoticeDays;
  } else if (input.noticeMode && type !== 'PEDIDO_DEMISSAO') {
    warnings.push(`Aviso prévio não se aplica ao tipo ${type}; modo ignorado.`);
  }
  const noticeCents = push(
    earnings,
    'AVISO_INDENIZADO',
    `Aviso prévio indenizado (${indemnifiedNoticeDays} dia(s)${noticeFactor < 1 ? ', metade — acordo' : ''})`,
    dailyCents * indemnifiedNoticeDays * noticeFactor,
    type === 'ACORDO' ? 'CLT art. 484-A, I, "a"' : 'CLT art. 487 §1º; Lei 12.506/2011',
  );
  // CLT art. 487 §1º: o aviso indenizado integra o tempo de serviço (projeção para 13º e férias).
  const projectedEnd = addDays(termination, projectionDays);

  // Saldo de salário
  const balanceDays = salaryBalanceDays(admission, termination);
  const balanceCents = push(earnings, 'SALDO_SALARIO', `Saldo de salário (${balanceDays}/30)`, salaryDailyCents * balanceDays, 'CLT art. 462/477');

  // 13º proporcional: indevido na justa causa (Decreto 57.155/1965 art. 7º).
  let thirteenthCents = 0;
  let thirteenthAvos = 0;
  if (type !== 'JUSTA_CAUSA') {
    for (let year = termination.getUTCFullYear(); year <= projectedEnd.getUTCFullYear(); year++) {
      const yearStart = new Date(Date.UTC(year, 0, 1));
      const yearEnd = new Date(Date.UTC(year, 11, 31));
      const from = admission.getTime() > yearStart.getTime() ? admission : yearStart;
      const to = projectedEnd.getTime() < yearEnd.getTime() ? projectedEnd : yearEnd;
      const avos = thirteenthTwelfths(year, from, to);
      thirteenthAvos += avos;
      thirteenthCents += Math.round((baseCents * avos) / 12);
    }
    push(earnings, '13_PROPORCIONAL', `13º salário proporcional (${thirteenthAvos}/12)`, thirteenthCents, 'Lei 4.090/1962 art. 3º');
  }

  // Férias
  const periodStart = currentVacationPeriodStart(admission, projectedEnd);
  let vestedCents = 0;
  let doubleCents = 0;
  if (input.vacationHistory) {
    const vestedList = deriveVestedVacations({ admission, termination, projectedEnd, entitlements: input.vacationHistory });
    const vestedDays = vestedList.reduce((sum, v) => sum + v.pendingDays, 0);
    const doubledDays = vestedList.filter((v) => v.doubled).reduce((sum, v) => sum + v.pendingDays, 0);
    vestedCents = push(
      earnings,
      'FERIAS_VENCIDAS',
      `Férias vencidas (${vestedDays} dia(s): ${vestedList.map((v) => v.label).join('; ')})`,
      dailyCents * vestedDays,
      'CLT art. 146 caput',
    );
    doubleCents = push(
      earnings,
      'FERIAS_DOBRA',
      `Dobra das férias com período concessivo vencido (${doubledDays} dia(s))`,
      dailyCents * doubledDays,
      'CLT art. 137',
    );
    if (doubledDays > 0) warnings.push('Há férias vencidas com período concessivo expirado: pagas em dobro (CLT art. 137), com 1/3 sobre a dobra.');
  } else {
    const vested = Math.max(0, Math.floor(input.vestedVacationPeriods ?? 0));
    vestedCents = push(earnings, 'FERIAS_VENCIDAS', `Férias vencidas (${vested} período(s))`, baseCents * vested, 'CLT art. 146 caput');
  }
  const vacationAvos = type === 'JUSTA_CAUSA' ? 0 : vacationTwelfths(periodStart, projectedEnd);
  const proportionalVacationCents = push(
    earnings,
    'FERIAS_PROPORCIONAIS',
    `Férias proporcionais (${vacationAvos}/12)`,
    (baseCents * vacationAvos) / 12,
    'CLT arts. 146 parágrafo único e 147; Súmulas 171 e 261 TST',
  );
  push(
    earnings,
    'TERCO_FERIAS',
    '1/3 constitucional sobre férias',
    (vestedCents + doubleCents + proportionalVacationCents) / 3,
    'CF art. 7º XVII; Súmula 328 TST',
  );

  // Contrato a termo rompido antes do fim (arts. 479/480): metade da remuneração dos dias restantes.
  let fixedTermIndemnityCents = 0;
  if (type === 'ANTECIPADA_EMPREGADOR' || type === 'ANTECIPADA_EMPREGADO') {
    if (!input.contractEndDate) throw new Error('Informe contractEndDate para rescisão antecipada de contrato a termo.');
    const remaining = Math.max(0, inclusiveDays(addDays(termination, 1), parseDay(input.contractEndDate)));
    fixedTermIndemnityCents = (dailyCents * remaining) / 2;
    if (type === 'ANTECIPADA_EMPREGADOR') {
      push(earnings, 'INDENIZACAO_479', `Indenização art. 479 (${remaining} dia(s) restantes ÷ 2)`, fixedTermIndemnityCents, 'CLT art. 479');
    }
  }

  // Descontos rescisórios (compensações). CLT art. 477 §5º: a compensação não pode exceder um mês de remuneração.
  let noticeDiscountCents = type === 'PEDIDO_DEMISSAO' && mode === 'NAO_CUMPRIDO' ? salaryCents : 0;
  let indemnity480Cents = type === 'ANTECIPADA_EMPREGADO' ? Math.round(fixedTermIndemnityCents) : 0;
  const compensationRequested = noticeDiscountCents + indemnity480Cents;
  if (compensationRequested > baseCents) {
    noticeDiscountCents = Math.min(noticeDiscountCents, baseCents);
    indemnity480Cents = Math.min(indemnity480Cents, baseCents - noticeDiscountCents);
    warnings.push(
      `Compensação de ${toReais(compensationRequested).toFixed(2)} limitada a ${toReais(noticeDiscountCents + indemnity480Cents).toFixed(2)} (um mês de remuneração — CLT art. 477 §5º).`,
    );
  }
  push(discounts, 'AVISO_NAO_CUMPRIDO', 'Aviso prévio não cumprido (30 dias)', noticeDiscountCents, 'CLT art. 487 §2º; art. 477 §5º');
  push(discounts, 'INDENIZACAO_480', 'Indenização art. 480 (limitada ao valor do art. 479)', indemnity480Cents, 'CLT art. 480 §1º; art. 477 §5º');

  // Tributos. Saldo de salário: INSS e IRRF mensais. Aviso indenizado, férias indenizadas + 1/3 e art. 479:
  // sem INSS (Lei 8.212 art. 28 §9º "d"/"e"; STJ Tema 478) e isentos de IRRF (Lei 7.713 art. 6º V; Súmula 386 STJ).
  const monthly = engine.applyTaxes(toReais(balanceCents), dependents, input.taxContext);
  push(discounts, 'INSS', 'INSS sobre saldo de salário', toCents(monthly.inssDiscount), 'Lei 8.212/1991 art. 28 I');
  push(discounts, 'IRRF', 'IRRF sobre saldo de salário', toCents(monthly.irrfDiscount), 'Lei 7.713/1988; Lei 15.270/2025');
  // 13º (inclusive o reflexo do aviso): INSS em separado e IRRF exclusivo (Solução de Consulta Cosit 249/2017).
  const t13 = thirteenthTaxes(thirteenthCents, dependents, input.taxContext);
  push(discounts, 'INSS_13', 'INSS sobre 13º', t13.inssCents, 'Lei 8.212/1991 art. 28 §7º');
  push(discounts, 'IRRF_13', 'IRRF sobre 13º (tributação exclusiva)', t13.irrfCents, 'Lei 7.713/1988 art. 26; Lei 15.270/2025');
  if (type !== 'JUSTA_CAUSA' && input.thirteenthAdvancePaid) {
    push(discounts, 'ADIANTAMENTO_13', '1ª parcela do 13º já paga', toCents(input.thirteenthAdvancePaid), 'Lei 4.749/1965 art. 2º');
  }

  // FGTS do mês rescisório: incide sobre saldo, aviso indenizado (Súmula 305 TST) e 13º; não sobre férias indenizadas.
  const fgtsDepositCents = Math.round((balanceCents + noticeCents + thirteenthCents) * FGTS_RATE);
  let fgtsBalanceCents: number;
  if (input.fgtsBalance != null) {
    fgtsBalanceCents = toCents(input.fgtsBalance);
  } else {
    const months = Math.max(0, inclusiveDays(admission, termination) / 30.4375);
    fgtsBalanceCents = Math.round(salaryCents * FGTS_RATE * months);
    warnings.push('Saldo do FGTS estimado (salário atual × 8% × meses). Informe fgtsBalance com o extrato da Caixa.');
  }
  const fineRate = type === 'SEM_JUSTA_CAUSA' || type === 'ANTECIPADA_EMPREGADOR' ? 0.4 : type === 'ACORDO' ? 0.2 : 0;
  const fineCents = Math.round((fgtsBalanceCents + fgtsDepositCents) * fineRate);
  const withdrawalRate =
    type === 'SEM_JUSTA_CAUSA' || type === 'ANTECIPADA_EMPREGADOR' || type === 'TERMINO_CONTRATO' ? 1 : type === 'ACORDO' ? 0.8 : 0;

  const totalEarnings = earnings.reduce((sum, l) => sum + toCents(l.amount), 0);
  const totalDiscounts = discounts.reduce((sum, l) => sum + toCents(l.amount), 0);
  if (totalDiscounts > totalEarnings) {
    warnings.push('Descontos superam os haveres (tributos e adiantamentos não são compensação); revise os valores antes de efetivar.');
  }

  return {
    type,
    noticeMode: type === 'SEM_JUSTA_CAUSA' || type === 'ACORDO' || type === 'PEDIDO_DEMISSAO' ? mode : null,
    proportionalNoticeDays: proportionalNotice,
    remuneration: toReais(baseCents),
    variableMonthly: toReais(variableCents),
    projectedEndDate: projectedEnd.toISOString().slice(0, 10),
    earnings,
    discounts,
    totalEarnings: toReais(totalEarnings),
    totalDiscounts: toReais(totalDiscounts),
    netAmount: toReais(totalEarnings - totalDiscounts),
    fgts: {
      rescissionDeposit: toReais(fgtsDepositCents),
      balanceBase: toReais(fgtsBalanceCents),
      fineRate,
      fine: toReais(fineCents),
      withdrawalPercent: withdrawalRate * 100,
      legalBasis: 'Lei 8.036/1990 art. 18 §§1º-2º e art. 20; CLT art. 484-A §1º',
    },
    unemploymentInsuranceEligible: type === 'SEM_JUSTA_CAUSA' || type === 'ANTECIPADA_EMPREGADOR',
    paymentDeadline: addDays(termination, 10).toISOString().slice(0, 10),
    warnings,
  };
}
