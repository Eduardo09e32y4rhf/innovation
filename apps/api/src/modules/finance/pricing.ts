/**
 * FONTE UNICA DE PRECO da plataforma (funcao pura, centavos inteiros, sem I/O).
 * Cadastro/checkout, cotacao publica, troca de plano/licencas, fatura do fim do teste e a lista publica de planos
 * chamam esta funcao (direto ou pelo PricingService, que e so um adaptador).
 *
 * Unidade cobrada: `seatQuantity` da assinatura. Nos planos "colaborador" (Basico/Completo) sao as licencas de
 * usuario/colaborador; no plano R&S (extraUnitLabel = "vaga") sao as vagas do mes. `maxUsers`/`maxEmployees` sao apenas
 * limites tecnicos, nao entram no preco.
 *
 * Regras (centavos):
 *   base bruta      = baseMensal x meses do ciclo
 *   desconto ciclo  = base bruta x % de desconto do ciclo (so a base; o excedente nao tem desconto)
 *   excedente       = max(0, unidades - incluidas) x valorUnidade x meses
 *   cupom           = PERCENT: % do (base liquida + excedente); FIXED: valor mensal x meses; limitado ao total; 0 se vencido
 *   total do ciclo  = base liquida + excedente - cupom
 *   proporcional    = (total novo - total atual) x dias restantes / dias do ciclo (so se for aumento; nunca credita)
 */

export type CommitmentMonths = 1 | 3 | 6 | 12;

export const PRICING_TIME_ZONE = 'America/Sao_Paulo';

/** Valores sem desconto de ciclo definido no plano (planos legados). */
export const LEGACY_CYCLE_DISCOUNT_BPS: Record<CommitmentMonths, number> = { 1: 0, 3: 500, 6: 800, 12: 1000 };
export const DEFAULT_BASE_MONTHLY_CENTS = 24_999;
export const DEFAULT_UNIT_MONTHLY_CENTS = 300;

export interface PricingPlanInput {
  commitmentMonths?: number | null;
  baseMonthlyPrice?: unknown;
  userMonthlyPrice?: unknown;
  /** Preco legado: usado quando baseMonthlyPrice nao esta preenchido. */
  price?: unknown;
  includedUnits?: unknown;
  /** % de desconto do ciclo definido no plano (ex.: 10 = 10%). Ausente/null/0 em ciclo > 1: usa a tabela legada. */
  discountPercent?: unknown;
}

export interface PricingCouponInput {
  type: 'PERCENT' | 'FIXED' | string;
  value: unknown;
  startsAt?: Date | null;
  expiresAt?: Date | null;
}

export interface PricingProrationInput {
  /** Plano/unidades/cupom em vigor ate agora. */
  previous: { plan: PricingPlanInput; units: number; coupon?: PricingCouponInput | null };
  periodStart?: Date | null;
  periodEnd: Date;
  /** Data da troca (padrao: now). */
  changeAt?: Date;
}

export interface PricingInput {
  plan: PricingPlanInput;
  units: number;
  coupon?: PricingCouponInput | null;
  now?: Date;
  proration?: PricingProrationInput;
}

export type CouponState = 'NONE' | 'APPLIED' | 'EXPIRED' | 'NOT_STARTED' | 'INVALID';

export interface PricingBreakdown {
  commitmentMonths: CommitmentMonths;
  units: number;
  includedUnits: number;
  extraUnits: number;
  baseMonthlyCents: number;
  unitMonthlyCents: number;
  cycleDiscountBps: number;
  baseGrossCents: number;
  cycleDiscountCents: number;
  baseNetCents: number;
  extraCents: number;
  subtotalCents: number;
  couponState: CouponState;
  couponCents: number;
  /** Total de um ciclo completo (o que a assinatura passa a custar). */
  cycleTotalCents: number;
  proration: null | {
    previousCycleTotalCents: number;
    differenceCents: number;
    remainingDays: number;
    cycleDays: number;
    amountCents: number;
  };
  /** O que cobrar agora: o proporcional (troca no meio do ciclo) ou o total do ciclo. */
  totalCents: number;
}

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PricingError';
  }
}

export function toCents(value: unknown): number {
  const n = Number(value);
  // toPrecision(15) remove o ruido binario (10.005 * 100 = 1000.4999999999999) antes de arredondar.
  return Number.isFinite(n) ? Math.round(Number((n * 100).toPrecision(15))) : 0;
}

function normalizeMonths(value: unknown): CommitmentMonths {
  if (value === null || value === undefined || value === '' || Number(value) === 0) return 1;
  const n = Number(value);
  if (![1, 3, 6, 12].includes(n)) throw new PricingError('Período de contratação inválido.');
  return n as CommitmentMonths;
}

function cycleDiscountBps(plan: PricingPlanInput, months: CommitmentMonths): number {
  const pct = Number(plan.discountPercent);
  if (Number.isFinite(pct) && pct > 0) return Math.min(10_000, Math.round(pct * 100));
  return LEGACY_CYCLE_DISCOUNT_BPS[months] ?? 0;
}

function couponCents(subtotal: number, months: number, coupon: PricingCouponInput | null | undefined, now: Date): { state: CouponState; cents: number } {
  if (!coupon) return { state: 'NONE', cents: 0 };
  const value = Number(coupon.value);
  if ((coupon.type !== 'PERCENT' && coupon.type !== 'FIXED') || !Number.isFinite(value) || value <= 0) return { state: 'INVALID', cents: 0 };
  if (coupon.startsAt && coupon.startsAt.getTime() > now.getTime()) return { state: 'NOT_STARTED', cents: 0 };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now.getTime()) return { state: 'EXPIRED', cents: 0 };
  const raw = coupon.type === 'PERCENT' ? Math.round((subtotal * Math.min(value, 100)) / 100) : toCents(value) * months;
  return { state: 'APPLIED', cents: Math.max(0, Math.min(subtotal, raw)) };
}

/** Dia de calendario em America/Sao_Paulo, como numero de dias desde 1970 (comparavel entre datas). */
export function saoPauloDayNumber(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: PRICING_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const [y, m, d] = parts.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Dias restantes e dias do ciclo, contados por dia de calendario de Sao Paulo (hora do dia nao altera a conta). */
export function prorationDays(input: { periodStart?: Date | null; periodEnd: Date; changeAt: Date; fallbackCycleDays?: number }) {
  const end = saoPauloDayNumber(input.periodEnd);
  const cycleDays = input.periodStart
    ? Math.max(1, end - saoPauloDayNumber(input.periodStart))
    : Math.max(1, input.fallbackCycleDays ?? 30);
  const remainingDays = Math.min(cycleDays, Math.max(0, end - saoPauloDayNumber(input.changeAt)));
  return { remainingDays, cycleDays };
}

function cycleBreakdown(plan: PricingPlanInput, unitsRaw: number, coupon: PricingCouponInput | null | undefined, now: Date) {
  if (!Number.isInteger(unitsRaw) || unitsRaw < 1) throw new PricingError('A quantidade de usuários deve ser maior que zero.');
  const months = normalizeMonths(plan.commitmentMonths);
  const bps = cycleDiscountBps(plan, months);
  const baseMonthlyCents = toCents(plan.baseMonthlyPrice) > 0 ? toCents(plan.baseMonthlyPrice) : toCents(plan.price) > 0 ? toCents(plan.price) : DEFAULT_BASE_MONTHLY_CENTS;
  const unitMonthlyCents = toCents(plan.userMonthlyPrice) > 0 ? toCents(plan.userMonthlyPrice) : DEFAULT_UNIT_MONTHLY_CENTS;
  const includedUnits = Math.max(0, Math.trunc(Number(plan.includedUnits ?? 0)) || 0);
  const extraUnits = Math.max(0, unitsRaw - includedUnits);
  const baseGrossCents = baseMonthlyCents * months;
  const baseNetCents = Math.round((baseGrossCents * (10_000 - bps)) / 10_000);
  const extraCents = unitMonthlyCents * extraUnits * months;
  const subtotalCents = baseNetCents + extraCents;
  const c = couponCents(subtotalCents, months, coupon, now);
  return {
    commitmentMonths: months, units: unitsRaw, includedUnits, extraUnits, baseMonthlyCents, unitMonthlyCents, cycleDiscountBps: bps,
    baseGrossCents, cycleDiscountCents: baseGrossCents - baseNetCents, baseNetCents, extraCents, subtotalCents,
    couponState: c.state, couponCents: c.cents, cycleTotalCents: subtotalCents - c.cents,
  };
}

export function computePrice(input: PricingInput): PricingBreakdown {
  const now = input.now ?? new Date();
  const next = cycleBreakdown(input.plan, input.units, input.coupon, now);
  if (!input.proration) return { ...next, proration: null, totalCents: next.cycleTotalCents };

  const p = input.proration;
  const changeAt = p.changeAt ?? now;
  const previous = cycleBreakdown(p.previous.plan, p.previous.units, p.previous.coupon, changeAt);
  const { remainingDays, cycleDays } = prorationDays({ periodStart: p.periodStart, periodEnd: p.periodEnd, changeAt, fallbackCycleDays: 30 * next.commitmentMonths });
  const differenceCents = next.cycleTotalCents - previous.cycleTotalCents;
  const amountCents = differenceCents > 0 && remainingDays > 0 ? Math.round((differenceCents * remainingDays) / cycleDays) : 0;
  return {
    ...next,
    proration: { previousCycleTotalCents: previous.cycleTotalCents, differenceCents, remainingDays, cycleDays, amountCents },
    totalCents: amountCents,
  };
}

/** Assinatura que guarda o preco contratado (pricingVersion antiga): o cliente mantem os valores de quando contratou. */
export function planPricingForSubscription<P extends PricingPlanInput & { pricingVersion?: string | null }>(
  plan: P,
  subscription?: { pricingVersion?: string | null; baseMonthlyPrice?: unknown; userMonthlyPrice?: unknown; discountPercent?: unknown } | null,
): PricingPlanInput {
  if (!subscription?.pricingVersion || subscription.pricingVersion === plan.pricingVersion) return plan;
  if (toCents(subscription.baseMonthlyPrice) <= 0) return plan;
  return {
    ...plan,
    baseMonthlyPrice: subscription.baseMonthlyPrice,
    userMonthlyPrice: toCents(subscription.userMonthlyPrice) > 0 ? subscription.userMonthlyPrice : plan.userMonthlyPrice,
    discountPercent: subscription.discountPercent ?? plan.discountPercent,
  };
}
