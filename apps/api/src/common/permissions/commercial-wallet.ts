import { NotFoundException } from '@nestjs/common';

/** COMERCIAL opera apenas a propria carteira (Company.commercialOwnerId). DEV/CEO/CONTABIL seguem a regra do proprio modulo. */
type Actor = { sub?: string; id?: string; role?: string } | null | undefined;

export function isWalletRestricted(actor: Actor): boolean {
  return actor?.role === 'COMERCIAL';
}

export function walletOwnerId(actor: Actor): string | undefined {
  return isWalletRestricted(actor) ? (actor?.sub ?? actor?.id ?? '__none__') : undefined;
}

export function isInWallet(actor: Actor, company?: { commercialOwnerId?: string | null } | null): boolean {
  if (!isWalletRestricted(actor)) return true;
  const me = actor?.sub ?? actor?.id;
  return Boolean(me) && company?.commercialOwnerId === me;
}

/** Fora da carteira responde 404 (nao revela a existencia do recurso). */
export function assertInWallet(actor: Actor, company: { commercialOwnerId?: string | null } | null | undefined, message: string) {
  if (!isInWallet(actor, company)) throw new NotFoundException(message);
}