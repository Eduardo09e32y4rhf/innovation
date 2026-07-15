## 2024-07-15 - Fixed Timing Attack Vulnerability in Asaas Webhooks
**Vulnerability:** Comparing HMAC signatures for webhooks using simple string inequality (`!==`).
**Learning:** This exposes the application to timing attacks, where an attacker can determine the correct signature byte-by-byte by analyzing response times.
**Prevention:** Always use `crypto.timingSafeEqual()` for cryptographic signature comparisons. Ensure both strings are converted to Buffers of exact equal length before comparison.
