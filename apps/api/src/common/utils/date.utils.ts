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
  return new Date(`${toSaoPauloDateKey(date)}T00:00:00.000Z`);
}
export function toSaoPauloDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function saoPauloDayOfWeek(date: Date): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}