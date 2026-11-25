import { describe, expect, it } from 'vitest';
import { isValidInternationalPhoneInput, normalizeInternationalPhone } from './international-phone';

describe('international phone input', () => {
  it.each([
    ['(11) 91234-5678', '5511912345678'],
    ['(55) 3333-4444', '555533334444'],
    ['(55) 93333-4444', '5555933334444'],
    ['+55 (11) 91234-5678', '5511912345678'],
    ['+1 (415) 555-2671', '14155552671'],
    ['+44 20 7946 0958', '442079460958'],
    ['0049 30 12345678', '493012345678'],
  ])('normalizes %s without dropping country or area digits', (input, expected) => {
    expect(normalizeInternationalPhone(input)).toBe(expected);
    expect(isValidInternationalPhoneInput(input)).toBe(true);
  });

  it('rejects numbers longer than the E.164 digit limit instead of truncating them', () => {
    const input = `+${'1'.repeat(16)}`;
    expect(isValidInternationalPhoneInput(input)).toBe(false);
    expect(normalizeInternationalPhone(input)).toHaveLength(16);
  });

  it.each(['', 'abc12345678', '+1234567', '12345678', '123456789', '+1 (415) 555-2671 ext 2'])(
    'rejects malformed or incomplete phone input %s',
    (input) => {
      expect(isValidInternationalPhoneInput(input)).toBe(false);
    },
  );
});
