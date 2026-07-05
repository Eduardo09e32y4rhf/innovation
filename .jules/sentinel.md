## 2024-07-05 - Added Rate Limiting to Authentication Endpoints
**Vulnerability:** Missing rate limiting on sensitive endpoints (login, password reset).
**Learning:** Found that the `@RateLimit` guard was implemented in the codebase but wasn't applied to sensitive authentication routes like login and password reset, leaving them vulnerable to brute-force attacks or abuse.
**Prevention:** Always apply the rate limit guard (`@UseGuards(RateLimitGuard)` and `@RateLimit(...)`) to authentication and authorization endpoints to prevent credential stuffing and brute-force attacks.
