#!/usr/bin/env bash
# Lê somente opções operacionais. .env é dado do Compose, nunca código shell.
load_deploy_options() {
  local key value
  for key in "$@"; do
    if [ "${!key+x}" = x ]; then continue; fi
    value=$(awk -v key="$key" '
      { sub(/\r$/, ""); line=$0; sub(/^[ \t]*(export[ \t]+)?/, "", line) }
      index(line, key "=") == 1 {
        value=substr(line, length(key)+2)
        sub(/^[ \t]+/, "", value); sub(/[ \t]+$/, "", value)
        quote=substr(value, 1, 1)
        if ((quote == "\042" || quote == "\047") && substr(value, length(value), 1) == quote) {
          value=substr(value, 2, length(value)-2)
        } else { sub(/[ \t]+#.*/, "", value) }
        found=1
      }
      END { if (found) print value }
    ' .env)
    if [ -n "$value" ]; then export "$key=$value"; fi
  done
}
