-- Usuarios dedicados aos testes E2E (SOMENTE banco local/teste). Copiam a senha do admin@innovation.local.
-- Uso: PGPASSWORD=... psql -h localhost -U innovation_user innovation_rh_connect -f tests/e2e/setup/seed-users.sql
INSERT INTO "User" (id, "companyId", name, email, "passwordHash", "passwordChangedAt", "forcePasswordChange", role, "isActive", "failedLoginAttempts", "previousPasswords", "emailVerifiedAt", "createdAt", "updatedAt")
SELECT gen_random_uuid(), a."companyId", v.name, v.email, a."passwordHash", a."passwordChangedAt", false, v.role::"UserRole", true, 0, ARRAY[]::text[], now(), now(), now()
FROM "User" a
CROSS JOIN (VALUES
  ('E2E Admin',    'e2e.admin@innovation.local',   'ADMIN'),
  ('E2E Sessao',   'e2e.session@innovation.local', 'ADMIN'),
  ('E2E Funcionario', 'e2e.func@innovation.local', 'FUNCIONARIO')
) AS v(name, email, role)
WHERE a.email = 'admin@innovation.local'
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.email = v.email);
