-- Folga de banco debita o saldo, mas não representa trabalho negativo.
-- Mantém os débitos e os fechamentos aprovados exatamente como registrados.
UPDATE "TimeTrack"
SET "totalWorked" = 0
WHERE "totalWorked" < 0
  AND "manualReason" IN ('ajuste_abono_folga', 'ajuste_abono_banco_saida_antecipada');
