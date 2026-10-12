/**
 * Modelos de documento da empresa (advertência, suspensão, comunicado...). O texto usa campos entre chaves duplas,
 * ex.: "Prezado(a) {{nome}}, em {{data_ocorrencia}} ...". Termo de uso e boas-vindas continuam sendo da Innovation.
 */
export const TEMPLATE_KINDS = ['ADVERTENCIA', 'SUSPENSAO', 'COMUNICADO', 'OUTRO'] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const TEMPLATE_VARIABLES: Array<{ key: string; label: string }> = [
  { key: 'nome', label: 'Nome do colaborador' },
  { key: 'cpf', label: 'CPF do colaborador' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'setor', label: 'Setor / departamento' },
  { key: 'matricula', label: 'Matrícula' },
  { key: 'empresa', label: 'Nome da empresa' },
  { key: 'cnpj', label: 'CNPJ da empresa' },
  { key: 'hoje', label: 'Data de hoje' },
  { key: 'data_ocorrencia', label: 'Data da ocorrência' },
  { key: 'motivo', label: 'Motivo / fundamento' },
  { key: 'dias_suspensao', label: 'Dias de suspensão' },
  { key: 'data_inicio', label: 'Início da suspensão' },
  { key: 'data_fim', label: 'Fim da suspensão' },
];
const KNOWN = new Set(TEMPLATE_VARIABLES.map((v) => v.key));
const PLACEHOLDER = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;

export type TemplateVars = Partial<Record<string, string | number | null | undefined>>;

/** Campos usados no texto que não existem na lista (provável erro de digitação). */
export function unknownVariables(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PLACEHOLDER)) if (!KNOWN.has(m[1].toLowerCase())) found.add(m[1]);
  return [...found];
}

/** Troca os campos pelos valores. Campo sem valor vira "________" (para preencher à mão), nunca "undefined". */
export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(PLACEHOLDER, (_all, key: string) => {
    const value = vars[key.toLowerCase()];
    return value === undefined || value === null || String(value).trim() === '' ? '________' : String(value);
  });
}

export function validateTemplate(input: { name?: string; kind?: string; title?: string; body?: string }): string | null {
  if (String(input.name ?? '').trim().length < 2) return 'Dê um nome ao modelo (ex.: Advertência por atraso).';
  if (!TEMPLATE_KINDS.includes(input.kind as TemplateKind)) return 'Escolha o tipo do modelo.';
  if (String(input.title ?? '').trim().length < 2) return 'Informe o título do documento.';
  const body = String(input.body ?? '').trim();
  if (body.length < 20) return 'O texto do modelo está muito curto (mínimo 20 letras).';
  if (body.length > 8000) return 'O texto passa de 8.000 letras.';
  const unknown = unknownVariables(body);
  if (unknown.length) return `Campo(s) desconhecido(s): ${unknown.map((u) => `{{${u}}}`).join(', ')}. Use os campos da lista.`;
  return null;
}
