## 2025-02-14 - Fix missing check for undefined token when validating Asaas webhooks
**Vulnerability:** A missing check for `undefined` token in `secureEqual` method for validating webhooks
**Learning:** Checking for `undefined` before creating Buffer using `Buffer.from(received)` when header `asaas-access-token` is missing or undefined is necessary since NodeJS will throw an unhandled `TypeError`
**Prevention:** Make sure all `Buffer.from` calls handle undefined/null appropriately before execution

## 2024-08-17 - Path Traversal in File Storage Services
**Vulnerability:** The `LocalSupportStorageService` was using `path.join(this.basePath, key)` without validating if the resulting path escaped the intended storage directory, allowing Path Traversal via keys like `../../../etc/passwd`.
**Learning:** In NestJS/Node.js storage services that interact directly with the filesystem, `path.join` is insufficient for path construction if the `key` is derived from user input.
**Prevention:** Always use `path.resolve` combined with a `startsWith` check against an absolute base path (e.g., `const absoluteBase = path.resolve(this.basePath); const target = path.resolve(absoluteBase, key); if (!target.startsWith(absoluteBase + path.sep)) throw Error;`) before executing any filesystem operations like `fs.readFile`, `fs.writeFile`, or `fs.unlink`.
