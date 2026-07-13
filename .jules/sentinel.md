## 2025-07-13 - Fix Timing Attack Vulnerability in Asaas Webhooks
**Vulnerability:** Found two webhook handlers (`apps/api/src/modules/webhooks/asaas-webhook.controller.ts` and `apps/api/src/modules/finance/asaas-webhook.controller.ts`) that use simple string inequality (`!==`) to verify HMAC signatures instead of `crypto.timingSafeEqual()`.
**Learning:** Checking signature strings character-by-character allows attackers to deduce the valid signature by measuring the response time, which is a known timing attack pattern.
**Prevention:** Always convert cryptographic strings to Buffers of exact same length and use `crypto.timingSafeEqual()` for constant-time comparison when verifying signatures or hashes.
