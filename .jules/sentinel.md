## 2024-07-09 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** The authentication endpoints (`login`, `register-company`, `password-reset/*`) were missing rate limiting, making them susceptible to brute-force attacks and abuse.
**Learning:** The `@nestjs/throttler` package wasn't used; instead, there is a custom `RateLimitGuard` built around Redis that can be used via the `@RateLimit` decorator. It requires `import { RateLimitGuard, RateLimit } from '../../common/guards/rate-limit.guard';` and `@UseGuards(RateLimitGuard)`.
**Prevention:** Ensure that all sensitive and authentication-related endpoints across the application use the custom `RateLimitGuard` decorator to prevent abuse and brute-force attacks.
