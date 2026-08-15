## 2024-08-15 - Hardcoded Default Password Vulnerability
**Vulnerability:** A hardcoded default password (`Innovation@123`) was being used as a fallback when creating new user accounts for employees completing their admission ASO exams.
**Learning:** Hardcoded passwords in user creation flows create a significant vulnerability window, even if `forcePasswordChange: true` is set, because attackers can hijack the account before the legitimate user first logs in. Furthermore, missing environment variables should "fail securely" by generating a secure random string or throwing an error, rather than falling back to an insecure known constant.
**Prevention:** Always use secure random generators (`crypto.randomBytes`) for temporary passwords or secrets when an environment configuration is missing, rather than relying on predictable hardcoded fallbacks.

## 2024-08-15 - CI Fixes
**Vulnerability:** CI environments failed due to missing steps like `prisma:generate` before typechecking, missing `eslint` dependencies due to hoisting, unpinned `next` versions causing Cloudflare build failures, and invalid Prisma `$Enums` runtime assignments.
**Learning:** It is crucial to ensure CI environments perfectly mirror expected generation steps and mock missing configurations (`DATABASE_URL`) to validate effectively.
**Prevention:** Follow memory guidelines rigorously to fix CI pipeline omissions.
