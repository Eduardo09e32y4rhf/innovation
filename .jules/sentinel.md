## 2024-06-27 - Added Rate Limiting to Auth Endpoints
**Vulnerability:** Missing rate limiting on sensitive authentication endpoints (login, password reset, registration).
**Learning:** Auth endpoints were using `JwtAuthGuard` but no rate limiting, which could allow brute force or credential stuffing attacks. The repository uses a custom `RateLimitGuard` located in `apps/api/src/common/guards/rate-limit.guard.ts` instead of standard NestJS throttlers.
**Prevention:** Always apply the custom `RateLimitGuard` and `@RateLimit` decorator to new sensitive endpoints (auth, mutations, etc.) to prevent abuse.
