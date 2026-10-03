// Texto livre não pode virar fórmula ao abrir o arquivo no Excel/LibreOffice.
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvDocument(rows: unknown[][]): string {
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n');
}
