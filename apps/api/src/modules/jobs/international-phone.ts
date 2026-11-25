const PHONE_INPUT_PATTERN = /^\+?[\d\s().-]+$/;
const DEFAULT_COUNTRY_CODE = '55';
const MAX_PHONE_INPUT_LENGTH = 40;
const MIN_INTERNATIONAL_PHONE_DIGITS = 8;
const MAX_INTERNATIONAL_PHONE_DIGITS = 15;

export function normalizeInternationalPhone(value: string): string {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 11) {
    digits = `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  return digits;
}

export function isValidInternationalPhoneInput(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_PHONE_INPUT_LENGTH) return false;
  const trimmed = value.trim();
  if (!trimmed || !PHONE_INPUT_PATTERN.test(trimmed)) return false;

  const rawDigits = trimmed.replace(/\D/g, '');
  const hasCountryCodeWithoutPrefix = rawDigits.startsWith(DEFAULT_COUNTRY_CODE) && [12, 13].includes(rawDigits.length);
  if (!trimmed.startsWith('+') && !trimmed.startsWith('00') && !hasCountryCodeWithoutPrefix && ![10, 11].includes(rawDigits.length)) {
    return false;
  }

  const digits = normalizeInternationalPhone(trimmed);
  return digits.length >= MIN_INTERNATIONAL_PHONE_DIGITS && digits.length <= MAX_INTERNATIONAL_PHONE_DIGITS;
}
