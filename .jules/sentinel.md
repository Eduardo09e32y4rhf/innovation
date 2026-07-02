## 2024-05-24 - Missing Rate Limiting on Login Endpoint
**Vulnerability:** The `/auth/login` endpoint lacked rate limiting protection.
**Learning:** The application provides a custom `RateLimitGuard` but it was not applied to the sensitive authentication endpoint, leaving it vulnerable to brute-force and credential stuffing attacks.
**Prevention:** Always apply the custom `@UseGuards(RateLimitGuard)` and `@RateLimit` decorators to all sensitive endpoints that perform authentication, authorization, or heavy operations. Ensure that the specific limit fits the business case (e.g., `window: 60, max: 5, prefix: 'login'`).
