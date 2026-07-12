## 2025-03-08 - Fixed Timing Attack in Asaas Webhook Signature Verification
**Vulnerability:** Asaas webhook signatures were being validated using simple string inequality (`!==`). This is vulnerable to timing attacks, as string comparisons short-circuit on the first mismatched character.
**Learning:** The simple comparison leak the length of the matching prefix. Because an HMAC is computed with a secret key, an attacker could potentially brute-force the valid signature character by character.
**Prevention:** Always use `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` for verifying hashes, HMACs, or any other cryptographically sensitive comparison. Ensure both buffers are the same length before comparison to avoid runtime errors.
