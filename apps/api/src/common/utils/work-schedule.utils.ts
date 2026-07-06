/**
 * Shared work-schedule utilities.
 * Single source of truth for scale-related calculations.
 */

/**
 * Returns the days of the week (0 = Sunday, 6 = Saturday) that are rest days
 * for the given work scale. Comparison is case-insensitive.
 *
 * Examples:
 *   '5x2' | '5X2' → [0, 6]  (Sunday + Saturday)
 *   '6x1' | '6X1' → [0]     (Sunday only)
 *   '12x36'       → []       (varies; handled externally by schedule)
 *   anything else → [0]      (default: Sunday)
 */
export function getDaysOffByScale(workScale?: string | null): number[] {
  const scale = (workScale ?? '').toLowerCase().trim();
  if (scale === '5x2') return [0, 6];
  if (scale === '6x1') return [0];
  if (scale === '12x36') return []; // alternating — caller must handle
  return [0]; // safe default
}
