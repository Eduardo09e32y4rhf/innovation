## 2024-07-01 - Weak Random Number Generator in Password Reset
**Vulnerability:** Weak random number generator (`Math.random()`) was used to generate password reset tokens.
**Learning:** Math.random() is predictable and unsuitable for security purposes. An attacker could potentially predict the reset code.
**Prevention:** Use cryptographically secure random number generators (e.g., `crypto.randomBytes()` in Node.js) for any security-sensitive tokens, keys, or passwords.
