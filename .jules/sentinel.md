## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2025-02-20 - Command Injection via Environment Variable
**Vulnerability:** Use of `child_process.exec` to execute shell commands with unescaped environment variables (`DATABASE_URL`).
**Learning:** Even internal or environment variables like `DATABASE_URL` can contain shell metacharacters (e.g. `;`, `&`, `|`) if they are set maliciously or misconfigured, leading to command injection when interpolated directly into a shell command string.
**Prevention:** Always use `child_process.execFile` instead of `exec`, passing arguments as an array instead of string-escaped quotes. This avoids passing the command to a shell where interpolation can occur.
