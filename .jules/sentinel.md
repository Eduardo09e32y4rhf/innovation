## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-05-18 - Prevent Command Injection in Backup Script
**Vulnerability:** Command Injection via unescaped environment variable in `BackupService`
**Learning:** `child_process.exec` uses a shell to execute commands, making it vulnerable to injection if inputs like environment variables (`process.env.DATABASE_URL`) are concatenated directly into the command string without sanitization. An attacker able to control or manipulate `DATABASE_URL` could execute arbitrary shell commands.
**Prevention:** Always use `child_process.execFile` and pass dynamic arguments as an array instead of string concatenation to bypass shell execution completely.
