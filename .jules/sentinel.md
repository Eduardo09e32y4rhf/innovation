## 2024-07-08 - Remove Hardcoded Bypass Tokens
**Vulnerability:** Hardcoded tokens (`LOCAL_SESSION_TOKEN` and `DEMO_TOKEN`) were present in `apps/api/src/common/guards/jwt-auth.guard.ts` as fallback bypasses.
**Learning:** Hardcoding test or bypass tokens in source code is dangerous, even if guarded by non-production checks.
**Prevention:** Always require bypass tokens to be injected securely via environment variables (e.g., `process.env.LOCAL_SESSION_TOKEN`) rather than hardcoding them in the codebase.
