## 2024-09-27 - Fix Path Traversal in Local Support Storage
**Vulnerability:** Path traversal vulnerability in `LocalSupportStorageService` where user-provided keys were directly joined with the base path.
**Learning:** `path.join` does not prevent path traversal if the user provides `../`. A robust path resolution strategy is required to ensure the target file is strictly within the allowed directory.
**Prevention:** Use `path.resolve` with both the base directory and the sanitized key (stripping leading slashes), and then verify that the resolved target string starts with the resolved base directory path.
