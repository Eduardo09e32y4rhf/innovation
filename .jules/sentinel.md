## 2024-08-15 - Hardcoded Default Password Vulnerability
**Vulnerability:** A hardcoded default password (`Innovation@123`) was being used as a fallback when creating new user accounts for employees completing their admission ASO exams.
**Learning:** Hardcoded passwords in user creation flows create a significant vulnerability window, even if `forcePasswordChange: true` is set, because attackers can hijack the account before the legitimate user first logs in. Furthermore, missing environment variables should "fail securely" by generating a secure random string or throwing an error, rather than falling back to an insecure known constant.
**Prevention:** Always use secure random generators (`crypto.randomBytes`) for temporary passwords or secrets when an environment configuration is missing, rather than relying on predictable hardcoded fallbacks.

## 2024-08-15 - CI Fixes
**Vulnerability:** CI environments failed due to missing steps like `prisma:generate` before typechecking, missing `eslint` dependencies due to hoisting, unpinned `next` versions causing Cloudflare build failures, and invalid Prisma `$Enums` runtime assignments.
**Learning:** It is crucial to ensure CI environments perfectly mirror expected generation steps and mock missing configurations (`DATABASE_URL`) to validate effectively.
**Prevention:** Follow memory guidelines rigorously to fix CI pipeline omissions.

## 2024-08-15 - Broken tests and e2e testing environment
**Vulnerability:** The test passwords in e2e tests were mismatched with the seeded passwords (`Teste@123` vs `TestPassword123!`), causing e2e failures. Additionally, testing integrations without tests crashed because `passWithNoTests: true` was not specified in the vitest configuration.
**Learning:** Broken environments and mismatched seeded test credentials can mimic security failures or broken states during CI. Moreover, modifying `package.json` configurations without synchronizing the `package-lock.json` lockfile will cause Cloudflare Workers build and `npm ci` failures.
**Prevention:** Ensure test data fixtures precisely match e2e assumptions and securely generate fallback variables rather than falling back to strings. Synchronize lockfiles properly when adjusting optional binaries (e.g. Next.js SWC tools).
