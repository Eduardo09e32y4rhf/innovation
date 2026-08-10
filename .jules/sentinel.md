## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution
## 2026-08-10 - Fix Path Traversal in LocalSupportStorageService
**Vulnerability:** Path traversal in `LocalSupportStorageService` allowed access to files outside the intended attachment directory by failing to validate that the resolved user-provided key starts with the configured `basePath`.
**Learning:** `path.join` on its own does not prevent directory traversal if the user input contains `../`. Always use `path.resolve` and check if the resulting path starts with the expected base directory.
**Prevention:** Introduce a `getSafePath` helper that leverages `path.resolve` and strictly verifies that the resulting path is contained within the resolved base directory before executing any file operations.
