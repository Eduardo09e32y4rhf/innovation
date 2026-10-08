/**
 * CPF/CNPJ no cadastro de empresa.
 *
 * Padrao (producao): obrigatorio e validado, com digitos verificadores.
 * Ambiente de teste do robo (COMPANY_DOCUMENT_OPTIONAL=true): pode ficar em branco e nao passa
 * pela validacao dos digitos. Sem documento a empresa nao usa cupom (a trava de cupom depende dele)
 * e o cliente no Asaas fica pendente.
 */
export function isCompanyDocumentOptional(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.COMPANY_DOCUMENT_OPTIONAL === 'true';
}

/** Somente digitos; vazio vira null (a coluna `document` e opcional e unica). */
export function normalizeCompanyDocument(raw?: string | null): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  return digits || null;
}
