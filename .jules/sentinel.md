## 2025-02-28 - Path Traversal via absolute path in path.resolve
**Vulnerability:** Path traversal vulnerability in `path.resolve` where user-controlled keys starting with a slash (`/`) override the base path instead of appending to it.
**Learning:** `path.resolve` can be overridden by absolute paths. Using `path.resolve('/base/dir', '/etc/passwd')` returns `/etc/passwd`.
**Prevention:** Always sanitize leading slashes from user-controlled paths (e.g., `key.replace(/^\/+/, '')`) before passing them to `path.resolve`.
