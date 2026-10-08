/** BOM UTF-8: sem ele o Excel abre o CSV em ANSI e estraga os acentos ("FuncionÃ¡rio"). */
export const CSV_BOM = '﻿';
export const CSV_SEPARATOR = ';'; // o Excel em pt-BR usa ponto e vírgula

/** Números, horas e saldos ("-1:30", "12,5", "-10") são dados legítimos e não podem ganhar apóstrofo. */
const NUMERICO = /^-?\d+([.,]\d+)?(:\d{2})?$/;
/** Início que o Excel/Sheets interpretam como fórmula (OWASP CSV injection), incluindo TAB. */
const COMECA_COMO_FORMULA = /^[=+\-@\t]/;

/** Uma célula pronta para o CSV: sem quebra de linha, entre aspas, aspas duplicadas e protegida contra fórmula. */
export function csvCell(value: unknown): string {
  const text = String(value ?? '').replace(/\r\n|\r|\n/g, ' ');
  const seguro = COMECA_COMO_FORMULA.test(text) && !NUMERICO.test(text) ? `'${text}` : text;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/** Monta o arquivo: BOM + cabeçalho + linhas, separador ';' e quebra CRLF. */
export function buildCsv(header: unknown[], rows: unknown[][]): string {
  return CSV_BOM + [header, ...rows].map((row) => row.map(csvCell).join(CSV_SEPARATOR)).join('\r\n');
}
