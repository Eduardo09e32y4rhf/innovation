-- Indices para filtros comuns do dashboard, guards e listas. Idempotente (IF NOT EXISTS); sem mudanca de dados.
CREATE INDEX IF NOT EXISTS "Employee_companyId_managerId_idx" ON "Employee"("companyId", "managerId");
CREATE INDEX IF NOT EXISTS "Vacation_employeeId_status_idx" ON "Vacation"("employeeId", "status");
CREATE INDEX IF NOT EXISTS "Vacation_status_idx" ON "Vacation"("status");
CREATE INDEX IF NOT EXISTS "TimeTrack_employeeId_manualStatus_idx" ON "TimeTrack"("employeeId", "manualStatus");
CREATE INDEX IF NOT EXISTS "RefreshSession_userId_family_idx" ON "RefreshSession"("userId", "family");
CREATE INDEX IF NOT EXISTS "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_companyId_createdAt_idx" ON "notifications"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "notification_recipients_userId_status_idx" ON "notification_recipients"("userId", "status");
