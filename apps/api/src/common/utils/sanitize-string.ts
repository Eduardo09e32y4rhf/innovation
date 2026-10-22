/**
 * Defesa em profundidade contra XSS armazenado em campos de TEXTO PLANO.
 * A defesa primária continua sendo o escape na saída (React escapa por padrão).
 * Remove marcação ativa (tags, comentários, blocos script/style), esquemas
 * javascript:/vbscript:/data:text/html e payloads escondidos em entidades HTML.
 * Preserva texto legítimo: "a < b", "5 > 3", "R&D", acentos e emoji.
 */
const ACTIVE_BLOCK = /<\s*(script|style|iframe|object|embed|svg|math|template|noscript|xmp|plaintext)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const COMMENT = /<!--[\s\S]*?(?:-->|$)/g;
const TAG = /<\/?[a-z!?][^>]*(?:>|$)/gi;
const SCRIPT_SCHEME = /(?:j\s*a\s*v\s*a|v\s*b)\s*s\s*c\s*r\s*i\s*p\s*t\s*:|d\s*a\s*t\s*a\s*:\s*t\s*e\s*x\s*t\s*\/\s*h\s*t\s*m\s*l/gi;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<', gt: '>', quot: '"', apos: "'", amp: '&', colon: ':', tab: '\t', newline: '\n', lpar: '(', rpar: ')', sol: '/', num: '#',
};

function decodeEntities(input: string): string {
  return input.replace(/&(?:#x([0-9a-f]{1,6})|#(\d{1,7})|([a-z]{2,8}));?/gi, (match, hex, dec, name) => {
    if (hex || dec) {
      const code = hex ? parseInt(hex, 16) : parseInt(dec, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[String(name).toLowerCase()] ?? match;
  });
}

function clean(input: string): string {
  let current = input;
  for (let i = 0; i < 10; i += 1) {
    const next = current
      .replace(ACTIVE_BLOCK, '')
      .replace(COMMENT, '')
      .replace(TAG, '')
      .replace(SCRIPT_SCHEME, '')
      .replace(CONTROL_CHARS, '');
    if (next === current) return next;
    current = next;
  }
  return current.replace(/<(?=[a-z!?/])/gi, '');
}

export interface SanitizeOptions {
  trim?: boolean;
}

export function sanitizeString(value: unknown, options: SanitizeOptions = {}): string {
  if (typeof value !== 'string') return value as string;
  let out = clean(value.normalize('NFC'));

  // Payload codificado (&#60;script&#62;, &lt;img ...&gt;, dupla codificação): só altera se a decodificação revelar marcação ativa.
  let decoded = out;
  for (let level = 0; level < 3; level += 1) {
    const next = decodeEntities(decoded);
    if (next === decoded) break;
    decoded = next;
    const cleaned = clean(decoded);
    if (cleaned !== decoded) {
      out = cleaned;
      break;
    }
  }

  return options.trim === false ? out : out.trim();
}
