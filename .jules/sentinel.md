## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2025-02-14 - Fix Path Traversal in LocalSupportStorageService
**Vulnerability:** The `LocalSupportStorageService` used `path.join(this.basePath, key)` to resolve file paths without checking if the resulting path actually stayed within `this.basePath`. This allowed for path traversal vulnerabilities (e.g., passing `key` as `../../../etc/passwd` would resolve to `/etc/passwd`).
**Learning:** Even internal or semi-internal file storage services must validate that requested keys do not escape the designated storage directory. Simply using `path.join` or `path.resolve` without boundary checks is insecure.
**Prevention:** Always use a validation method that resolves the full path and checks if it `startsWith` the base directory (ensuring to append `path.sep` to prevent prefix bypasses, like `/data/attachments-logs`).
