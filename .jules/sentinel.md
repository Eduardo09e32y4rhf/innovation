## 2025-02-14 - Add rate limiting to auth endpoints
**Vulnerability:** Missing rate limiting on `/auth/login` and `/auth/password-reset/request` endpoints, making them vulnerable to brute-force and credential stuffing attacks.
**Learning:** The endpoints were exposed directly without utilizing the existing `RateLimitGuard` and `RateLimit` decorators available in the codebase, indicating a gap in consistently applying defense-in-depth measures to all authentication-related routes.
**Prevention:** Ensure all sensitive endpoints, especially those dealing with authentication, authorization, or password management, are explicitly protected by `RateLimitGuard` to mitigate automated attacks.
