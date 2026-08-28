## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-02-27 - Fix Command Injection in Backup Service
**Vulnerability:** A command injection vulnerability existed in `BackupService` where `DATABASE_URL` was directly interpolated into a `pg_dump` command executed via `child_process.exec`.
**Learning:** Using `child_process.exec` with unescaped environment variables or user input allows arbitrary command execution. Escaping quotes is not sufficient.
**Prevention:** Always use `child_process.execFile` when running shell commands and pass arguments as an array instead of string-escaped quotes.
