## 2026-07-14 - Fix timing attacks in webhook signature verification
**Vulnerability:** Comparing HMAC signatures using strict inequality (`!==`) makes the application vulnerable to timing attacks, allowing attackers to forge signatures by measuring the time it takes to compare characters.
**Learning:** This existed because standard string comparison operators were used instead of secure, constant-time comparison functions like `crypto.timingSafeEqual()`.
**Prevention:** Always convert signatures to Buffers and use `crypto.timingSafeEqual()` for cryptographic comparisons, ensuring to check that the Buffer lengths are equal before comparing to prevent runtime errors.
