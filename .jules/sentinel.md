
## 2025-01-20 - Prevent HMAC timing attack in Asaas Webhook
**Vulnerability:** The Asaas webhook signature validation used a simple string inequality (`!==`) to compare the expected HMAC with the provided signature, which is vulnerable to timing attacks.
**Learning:** Standard string comparison operators leak information about the match failure index through execution time, allowing attackers to incrementally forge valid signatures character by character.
**Prevention:** Always use `crypto.timingSafeEqual()` (and first check buffer lengths) when comparing cryptographic hashes, signatures, or tokens to prevent timing attacks.
