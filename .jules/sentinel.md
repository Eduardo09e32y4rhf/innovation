## 2025-07-10 - Missing Rate Limiting on Auth Endpoints
**Vulnerability:** Login and password reset endpoints were missing explicit rate limiting at the controller level.
**Learning:** While the service layer implemented a basic block after 3 failed attempts per user, this did not prevent brute force attempts against multiple usernames (credential stuffing) or prevent denial of service via overwhelming the password reset endpoint.
**Prevention:** Always apply the custom `RateLimitGuard` to sensitive authentication and unauthenticated external-facing endpoints to provide network-level protection before database lookups occur.
