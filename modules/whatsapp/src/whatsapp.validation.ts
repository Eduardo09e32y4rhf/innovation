export function isWhatsappBridgePath(value: string): boolean {
  return value.trim().length > 0 && !value.includes('..');
}
