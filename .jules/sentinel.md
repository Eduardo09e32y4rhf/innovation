## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-02-14 - Fix command injection in backup service
**Vulnerability:** Use of `exec` with unescaped environment variables (`DATABASE_URL`) for `pg_dump` allowed OS command injection.
**Learning:** Never use `exec` when arguments come from potentially untrusted sources or environment variables, as they are passed directly to a shell.
**Prevention:** Always use `execFile` with an array of arguments, which bypasses the shell entirely and prevents injection attacks.
