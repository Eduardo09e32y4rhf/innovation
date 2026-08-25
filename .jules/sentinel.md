## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2026-08-25 - Prevent Command Injection with execFile
**Vulnerability:** `BackupService` used `child_process.exec` to run `pg_dump`, passing the unescaped `DATABASE_URL` environment variable directly into the shell string. This allowed OS command injection if the URL contained shell characters.
**Learning:** Even environment variables should be treated as untrusted input if they can be manipulated or are dynamically generated (like PRISMA connection URLs). Shell interpolation via `exec` is inherently unsafe for dynamic data.
**Prevention:** Always use `child_process.execFile` (or `spawn`) and pass arguments as an array instead of string-escaped quotes. This prevents the shell from interpreting metacharacters entirely.
