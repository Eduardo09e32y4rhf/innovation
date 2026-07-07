## 2024-05-18 - [Weak Random Number Generation for Password Reset]
**Vulnerability:** Weak random number generation (`Math.random()`) was being used to generate the 6-character code for password resets.
**Learning:** This approach to generation is predictable and could potentially allow an attacker to guess a password reset code.
**Prevention:** Always use cryptographically secure random number generators like `crypto.randomBytes` for any sensitive code, token, or password generation.

## 2024-05-18 - [Missing Rate Limit on Authentication Endpoints]
**Vulnerability:** The `/auth/login` and `/auth/password-reset/request` endpoints lacked rate limiting.
**Learning:** These endpoints are susceptible to brute force and credential stuffing attacks without rate limit protection.
**Prevention:** Implement strong, strict rate limits (e.g. using `RateLimitGuard`) on all authentication and authorization endpoints to mitigate these types of attacks.
