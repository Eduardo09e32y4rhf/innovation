## 2025-02-14 - Replace Predictable PRNG in Password Resets
**Vulnerability:** The password reset token generation in `auth.service.ts` relied on `Math.random()`, which is a cryptographically weak pseudo-random number generator.
**Learning:** `Math.random()` should never be used for security-sensitive tokens because its outputs are predictable and could allow an attacker to guess reset codes and hijack accounts.
**Prevention:** Always use cryptographically secure generators (like Node's `crypto` module: `crypto.randomBytes` or `crypto.randomInt`) for generating security tokens, nonces, or passwords.
