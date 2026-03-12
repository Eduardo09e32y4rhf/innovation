## 2024-05-18 - [HIGH] Missing Authentication on Webhook Endpoint
**Vulnerability:** The `/api/webhooks/n8n/callback` endpoint processed data without verifying its source or authenticity, making it susceptible to Broken Access Control.
**Learning:** Even internal endpoints or webhooks not intended for direct user consumption must implement authentication. Relying on an endpoint being "hidden" or obscure is security by obscurity and an invalid defense. Also learned that when implementing token verification, `secrets.compare_digest` must be used instead of standard string equality (`==`) to prevent timing attacks.
**Prevention:** Always require an authentication mechanism (e.g., webhook secret, API key, HMAC signature) on endpoints that accept external data payloads. Use constant-time comparison for secrets.

## 2025-03-03 - Mercado Pago Webhook Signature Verification Bypass
**Vulnerability:** The Mercado Pago webhook endpoint (`backend/src/api/v1/endpoints/payments.py`) correctly computed the expected HMAC signature for incoming payloads, but was using a weak comparison operator (`!=`) to check it. More critically, if the signature did not match, the code only logged a warning and continued executing the request instead of raising a 401 Unauthorized error. This allowed attackers to craft malicious webhook payloads and trick the system into approving fake payments or upgrading plans without any actual payment on Mercado Pago.
**Learning:** Checking for signature validity is meaningless if an invalid result does not block the operation. Webhook signature validation errors must immediately reject the request with a 4xx error. Furthermore, string comparisons of cryptographic hashes (like HMACs) must use `secrets.compare_digest` to prevent timing attacks.
**Prevention:** Always use `secrets.compare_digest` for signature validation and ensure `HTTPException` is raised or the function terminates if the signature fails verification.

## 2025-03-03 - Exposing Environment Variables in Public Repository Scripts
**Vulnerability:** Scripts (`run_local_debug.ps1`, `run_local.ps1`, `iniciar_local.ps1`) expose API keys for Gemini, Mercado Pago, and hardcoded `SECRET_KEY`. Furthermore, backend config uses a hardcoded default `SECRET_KEY` instead of failing if not set in the environment.
**Learning:** Hardcoded defaults in scripts or configuration can lead to accidental exposure and severe security vulnerabilities in production.
**Prevention:** Remove keys from the scripts and require `SECRET_KEY` to be set via environment variable.

## 2025-03-04 - Authentication Bypass and Information Leakage in n8n Webhook
**Vulnerability:** The `/api/webhooks/n8n/callback` endpoint had an authentication bypass vulnerability because it only checked the `X-N8N-Webhook-Secret` header if the `N8N_WEBHOOK_SECRET` environment variable was set. If the environment variable was missing, the endpoint allowed unauthenticated access. Furthermore, the endpoint leaked internal error details in the 500 response (`detail=str(e)`).
**Learning:** Security controls should fail closed, not open. If a required security configuration (like a webhook secret) is missing, the application should reject all requests to that endpoint, rather than allowing them through. Also, error messages should be generic to avoid leaking sensitive information.
**Prevention:** Always ensure that security checks fail closed (e.g., `if not expected_secret: raise HTTPException(...)`). Never expose raw exception strings (`str(e)`) in HTTP responses to external clients.
## 2025-03-04 - [HIGH] Information Disclosure via Exception Stack Traces
**Vulnerability:** Several backend endpoints (`users.py`, `jobs.py`, `candidates.py`) were returning the raw output of Python exceptions (`str(e)`) directly to users via HTTP 500 response bodies.
**Learning:** Returning `str(e)` directly in HTTP responses can leak sensitive internal details, database structure (SQLAlchemy errors), or logic to malicious actors. This violates the principle of failing securely and "Never expose raw exception strings (`str(e)`) in HTTP responses to external clients."
**Prevention:** Catch exceptions, log `str(e)` securely on the backend using Python`s `logging` library, and return a sanitized, generic error message (e.g. "Erro interno ao processar a requisição") to the client.

## 2025-03-04 - [MEDIUM] Missing Rate Limiting on Authentication Endpoints
**Vulnerability:** Core authentication and recovery endpoints (`/register`, `/forgot-password`, `/reset-password`, `/google-callback`) lacked rate limiting. This exposes the application to brute-force attacks, account enumeration, credential stuffing, and DoS attacks against sensitive functionality.
**Learning:** Unprotected auth endpoints are high-value targets. When applying `slowapi` rate limiting (`@limiter.limit(...)`) to FastAPI endpoints, a common pitfall is forgetting that the endpoint signature must explicitly include a `request: Request` parameter. Without it, the limiter cannot extract the client's IP or identity to enforce the limit, and depending on the implementation, might crash or fail open.
**Prevention:** Apply rate limiting (e.g., `slowapi`) to all authentication, password recovery, and sensitive action endpoints by default. Ensure the necessary `Request` object is injected into the endpoint signature so the rate limiter functions correctly.