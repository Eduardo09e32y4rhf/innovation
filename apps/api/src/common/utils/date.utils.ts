/**
 * Shared date utilities.
 */

/**
 * Returns a date-only string (YYYY-MM-DD) using UTC.
 * Used to compare calendar dates without time-zone drift.
 */
export function toDateOnlyStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns a Date set to midnight UTC for the given date,
 * adjusted to the America/Sao_Paulo calendar date.
 */
export function toDateOnly(date: Date): Date {
  const tzDateStr = date.toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  });
  return new Date(`${tzDateStr}T00:00:00.000Z`);
}
