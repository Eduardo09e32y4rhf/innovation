import { describe, expect, it } from 'vitest';
import { isRecruiterOnlyAccount } from './recruiter-account';

describe('conta autonoma de R&S', () => {
  it('so Recrutamento, sem modulo de funcionarios', () => {
    expect(isRecruiterOnlyAccount(['recruitment'])).toBe(true);
    expect(isRecruiterOnlyAccount(['recruitment', 'support'])).toBe(true);
    expect(isRecruiterOnlyAccount(['employees', 'recruitment'])).toBe(false);
    expect(isRecruiterOnlyAccount(['employees', 'time-track', 'vacations', 'management', 'recruitment'])).toBe(false);
    expect(isRecruiterOnlyAccount([])).toBe(false);
    expect(isRecruiterOnlyAccount(null)).toBe(false);
  });
});
