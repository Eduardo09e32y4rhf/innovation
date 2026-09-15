## 2026-09-15 - Fixed Path Traversal in Storage Services
**Vulnerability:** Path traversal vulnerability due to insecure concatenation of user-provided keys with the base directory path (e.g. `path.join(basePath, key)`).
**Learning:** Always use `path.resolve` to normalize the resulting path, and then strictly verify that it `startsWith` the fully resolved base directory path (including the path separator `path.sep` to prevent partial folder matching like `/data/attachments-hacked`).
**Prevention:** Extract path resolution into a centralized, rigorously tested `resolveKey` method that throws an error when traversal is detected.
