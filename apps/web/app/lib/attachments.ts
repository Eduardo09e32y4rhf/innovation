/** Limite de anexo do WhatsApp: 10 MB (o servidor aceita 14 MB de JSON, que comporta 10 MB + 33% de base64). */
export const MAX_WHATSAPP_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Mensagem amigável quando o arquivo não pode ser enviado; `null` quando está dentro do limite. */
export function attachmentSizeError(
  file: { name: string; size: number },
  maxBytes: number = MAX_WHATSAPP_ATTACHMENT_BYTES,
): string | null {
  if (!Number.isFinite(file.size) || file.size <= 0) return `"${file.name}" está vazio. Escolha outro arquivo.`;
  if (file.size > maxBytes) {
    return `"${file.name}" tem ${formatMegabytes(file.size)} e o limite é ${formatMegabytes(maxBytes)}. Reduza o arquivo ou envie por link.`;
  }
  return null;
}
