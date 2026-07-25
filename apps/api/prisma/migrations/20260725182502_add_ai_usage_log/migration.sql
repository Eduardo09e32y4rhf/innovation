-- Migration: add_ai_usage_log
-- Criada em: 2026-07-25
-- Fase 7: Persistência de consumo de tokens de IA (D-06 Crítico)

CREATE TABLE "ai_usage_logs" (
    "id"               TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "actorId"          TEXT,
    "model"            TEXT NOT NULL,
    "feature"          TEXT NOT NULL,
    "promptTokens"     INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens"      INTEGER NOT NULL,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source"           TEXT NOT NULL DEFAULT 'OPENAI',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_logs_tenantId_createdAt_idx" ON "ai_usage_logs"("tenantId", "createdAt");
CREATE INDEX "ai_usage_logs_tenantId_feature_idx" ON "ai_usage_logs"("tenantId", "feature");
