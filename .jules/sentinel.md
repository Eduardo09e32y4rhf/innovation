## 2024-05-20 - Path Traversal in File Storage

**Vulnerability:** Found a path traversal vulnerability in `apps/api/src/modules/support/local-support-storage.service.ts` where `path.join` was used to concatenate user input with a base directory without validating that the final resolved path stays within the intended base directory. This allowed accessing arbitrary files on the system via directory traversal sequences (`../../`).
**Learning:** `path.join` does not prevent path traversal if the arguments contain relative directory paths (`..`). Node.js's `path.resolve` combined with checking if the target path starts with the resolved base path plus a path separator is necessary to prevent this vulnerability, along with preventing partial directory matching.
**Prevention:** Always use `path.resolve` and strict prefix checking `target.startsWith(resolvedBase + path.sep)` when constructing file paths from user input.
