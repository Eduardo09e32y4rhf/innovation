/** Strip HTML/script tags and dangerous characters from user-supplied strings. */
export function sanitizeString(value: unknown): string {
  if (typeof value !== 'string') return value as string;
  return value
    .replace(/<[^>]*>/g, '')       // strip HTML tags
    .replace(/javascript:/gi, '')  // strip js: URIs
    .replace(/on\w+\s*=/gi, '')    // strip inline event handlers
    .trim();
}
