const MAX_DEPENDENTS = 20;

function clamp(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), MAX_DEPENDENTS) : 0;
}

/**
 * Single source of truth for the number of IRRF dependents.
 * Accepts a number, numeric string ("2"), JSON array/object/number, or a comma/semicolon/newline list. Never throws.
 */
export function countDependents(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return clamp(value);
  if (Array.isArray(value)) return clamp(value.length);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['dependents', 'dependentes', 'items', 'list']) {
      if (key in obj) return countDependents(obj[key]);
    }
    for (const key of ['count', 'quantity', 'quantidade', 'total']) {
      if (typeof obj[key] === 'number' || typeof obj[key] === 'string') return countDependents(obj[key]);
    }
    return Object.keys(obj).length ? 1 : 0;
  }
  if (typeof value !== 'string') return 0;
  const text = value.trim();
  if (!text) return 0;
  if (/^\d+$/.test(text)) return clamp(Number(text));
  if (/^[[{"]/.test(text)) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'string') return /^\d+$/.test(parsed.trim()) ? clamp(Number(parsed)) : countDependents(parsed.split(/[,;\n]/));
      return countDependents(parsed);
    } catch {
      /* fall through to list parsing */
    }
  }
  return clamp(text.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean).length);
}
