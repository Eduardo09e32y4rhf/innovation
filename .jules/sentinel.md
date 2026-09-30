
## 2026-09-30 - Path Traversal bypass with path.resolve
**Vulnerability:** A path traversal vulnerability existed when concatenating user-provided paths using \`path.resolve\` (e.g. \`path.resolve(basePath, userInput)\`).
**Learning:** Node's \`path.resolve\` treats any absolute path in its arguments as the new root, ignoring preceding arguments. An attacker providing an absolute path (e.g., \`/etc/passwd\`) could completely bypass the intended base directory constraint.
**Prevention:** Always sanitize leading slashes from user input (e.g., \`key.replace(/^\\/+/, '')\`) before passing it to \`path.resolve\` to ensure it evaluates relative to the intended base directory, and explicitly verify the resulting path starts with the base directory.
