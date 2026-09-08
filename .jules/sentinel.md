## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-02-14 - Fix command injection vulnerability in PostgreSQL backup
**Vulnerability:** OS command injection in database backup service via `child_process.exec` using unescaped string interpolation.
**Learning:** Even environment variables like `DATABASE_URL` shouldn't be interpolated directly into shell commands (`exec`), as they could contain malicious characters or unintentionally break shell execution.
**Prevention:** Always use `child_process.execFile` and pass arguments as an array instead of string-escaped quotes to mitigate OS command injection.
