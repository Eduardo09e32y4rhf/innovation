## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2024-05-15 - Command Injection via exec
**Vulnerability:** The BackupService used child_process.exec with an unescaped environment variable (DATABASE_URL), leading to potential OS command injection.
**Learning:** Never use child_process.exec when passing dynamic inputs, including environment variables, as they can be manipulated to run arbitrary commands.
**Prevention:** Always use child_process.execFile and pass arguments as an array instead of string interpolation to prevent shell interpretation.
