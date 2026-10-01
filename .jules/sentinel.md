## 2026-10-01 - Path Traversal Vulnerability Bypass

**Vulnerability:** Path traversal possible by passing absolute paths (e.g. `/etc/passwd`) as keys in storage services, bypassing `path.resolve` checks.
**Learning:** `path.resolve(basePath, key)` treats `key` as an absolute path if it begins with a slash, overriding `basePath`.
**Prevention:** Always sanitize leading slashes from user-provided keys using `key.replace(/^\/+/, '')` before calling `path.resolve`.
