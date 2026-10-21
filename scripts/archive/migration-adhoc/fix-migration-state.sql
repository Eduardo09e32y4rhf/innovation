-- Corrige migration travada como "failed" no Prisma
-- Uso:
--   docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /dev/stdin < scripts/fix-migration-state.sql

DELETE FROM _prisma_migrations
WHERE migration_name = 'YYYYMMDDHHMMSS_add_management_and_aso';

-- Opcional: confirmar
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM _prisma_migrations
WHERE migration_name = 'YYYYMMDDHHMMSS_add_management_and_aso';