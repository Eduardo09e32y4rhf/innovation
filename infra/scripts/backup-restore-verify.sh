#!/usr/bin/env bash
# Prova que um backup do Postgres restaura sem perda: pg_dump -Fc -> pg_restore em banco temporario ->
# compara contagem de linhas, soma de colunas numericas (Decimal/float/int) e hash do conteudo por tabela.
# Mede o tempo de dump e de restauracao (insumos de RPO/RTO). Sai com codigo 1 se houver QUALQUER diferenca.
#
# Uso:  SOURCE_URL=postgresql://user:senha@host:5432/db  infra/scripts/backup-restore-verify.sh
# Opcionais: RESTORE_DB (padrao innovation_restore_test)  KEEP_RESTORE=1 (nao apaga o banco restaurado)
#            VERIFY_HASH=0 (pula hash de conteudo)  WORKDIR (padrao: mktemp)
# Requisitos: pg_dump, pg_restore, psql (mesma major do servidor) e usuario com CREATEDB.
set -Eeuo pipefail

SOURCE_URL="${SOURCE_URL:-${DATABASE_URL:-}}"
[ -n "$SOURCE_URL" ] || { echo "Defina SOURCE_URL (ou DATABASE_URL)." >&2; exit 2; }
RESTORE_DB="${RESTORE_DB:-innovation_restore_test}"
VERIFY_HASH="${VERIFY_HASH:-1}"
WORKDIR="${WORKDIR:-$(mktemp -d)}"
umask 077

# Mesma conexao, outro nome de banco (preserva ?schema=... removendo parametros que o libpq nao entende).
BASE="${SOURCE_URL%%\?*}"
ADMIN_URL="${BASE%/*}/postgres"
RESTORE_URL="${BASE%/*}/${RESTORE_DB}"
SRC_URL="$BASE"
DUMP="$WORKDIR/backup.dump"

now() { date +%s.%N; }
elapsed() { awk -v a="$1" -v b="$2" 'BEGIN{printf "%.1f", b-a}'; }
cleanup() {
  rm -rf "$WORKDIR"
  if [ "${KEEP_RESTORE:-0}" != "1" ]; then psql "$ADMIN_URL" -qAtc "DROP DATABASE IF EXISTS \"$RESTORE_DB\"" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

# Gera "tabela|coluna|valor" para tudo que precisa ser identico apos o restore.
fingerprint() {
  local url="$1"
  psql "$url" -qAt -v ON_ERROR_STOP=1 <<'SQL'
-- contagem de linhas por tabela
SELECT c.relname || '|__rows__|' ||
  (xpath('/row/v/text()', query_to_xml(format('select count(*) as v from %I.%I', n.nspname, c.relname), false, true, '')))[1]::text
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = 'public' AND c.relname NOT LIKE '\_prisma%'
UNION ALL
-- soma de toda coluna numerica (Decimal, float, inteiros)
SELECT table_name || '|' || column_name || '|' ||
  coalesce((xpath('/row/v/text()', query_to_xml(format('select sum(%I)::text as v from %I.%I', column_name, table_schema, table_name), false, true, '')))[1]::text, 'NULL')
FROM information_schema.columns col
WHERE table_schema = 'public' AND table_name NOT LIKE '\_prisma%'
  AND data_type IN ('numeric', 'double precision', 'real', 'integer', 'bigint', 'smallint')
  AND EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = col.table_schema AND t.table_name = col.table_name AND t.table_type = 'BASE TABLE')
ORDER BY 1;
SQL
  if [ "$VERIFY_HASH" = "1" ]; then
    psql "$url" -qAt -v ON_ERROR_STOP=1 <<'SQL'
-- hash do conteudo completo de cada tabela (linha em texto, ordenada)
SELECT c.relname || '|__md5__|' ||
  (xpath('/row/v/text()', query_to_xml(format('select coalesce(md5(string_agg(t::text, chr(10) order by t::text)), ''empty'') as v from %I.%I t', n.nspname, c.relname), false, true, '')))[1]::text
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND n.nspname = 'public' AND c.relname NOT LIKE '\_prisma%'
ORDER BY 1;
SQL
  fi
}

echo "== Origem: $(psql "$SRC_URL" -qAtc "select current_database() || ' (' || pg_size_pretty(pg_database_size(current_database())) || ')'")"

t0=$(now)
pg_dump "$SRC_URL" -Fc --no-owner -f "$DUMP"
t1=$(now)
DUMP_SIZE=$(du -h "$DUMP" | cut -f1)
pg_restore -l "$DUMP" >/dev/null   # valida o indice do dump
echo "== Dump:    $(elapsed "$t0" "$t1")s, $DUMP_SIZE"

psql "$ADMIN_URL" -qAtc "DROP DATABASE IF EXISTS \"$RESTORE_DB\"" >/dev/null
psql "$ADMIN_URL" -qAtc "CREATE DATABASE \"$RESTORE_DB\"" >/dev/null
t2=$(now)
pg_restore -d "$RESTORE_URL" --no-owner --exit-on-error "$DUMP"
t3=$(now)
echo "== Restore: $(elapsed "$t2" "$t3")s  (RTO medido ~ restore + religar a API)"

fingerprint "$SRC_URL"     > "$WORKDIR/src.txt"
fingerprint "$RESTORE_URL" > "$WORKDIR/dst.txt"

TABLES=$(grep -c '|__rows__|' "$WORKDIR/src.txt" || true)
CHECKS=$(wc -l < "$WORKDIR/src.txt")
echo "== Tabelas: $TABLES | verificacoes (linhas + somas + hashes): $CHECKS"
echo "-- tabela -> linhas origem / destino (maiores 12)"
join -t'|' -j1 \
  <(grep '|__rows__|' "$WORKDIR/src.txt" | awk -F'|' '{print $1"|"$3}' | sort -t'|' -k1,1) \
  <(grep '|__rows__|' "$WORKDIR/dst.txt" | awk -F'|' '{print $1"|"$3}' | sort -t'|' -k1,1) 2>/dev/null \
  | sort -t'|' -k2,2nr | head -12 | awk -F'|' '{printf "   %-32s %8s / %-8s %s\n", $1, $2, $3, ($2==$3?"ok":"DIFERE")}'

if diff -u "$WORKDIR/src.txt" "$WORKDIR/dst.txt" > "$WORKDIR/diff.txt"; then
  echo "== RESULTADO: OK - 0 diferencas em $CHECKS verificacoes."
  exit 0
fi
echo "== RESULTADO: FALHA - diferencas encontradas:" >&2
head -40 "$WORKDIR/diff.txt" >&2
exit 1
