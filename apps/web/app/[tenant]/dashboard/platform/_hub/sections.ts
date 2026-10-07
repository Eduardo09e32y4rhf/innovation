export type SubSection = { key: string; label: string };

/** Subsecoes dentro de cada aba da Plataforma (tela unica; a subsecao vem da URL: ?sub=). */
const SUBS: Record<string, Array<SubSection & { roles: readonly string[] }>> = {
  resumo: [
    { key: 'visao', label: 'Visão geral', roles: ['DEV', 'CEO', 'COMERCIAL', 'CONTABIL'] },
    { key: 'alertas', label: 'Alertas e riscos', roles: ['DEV', 'COMERCIAL'] },
  ],
  comercial: [
    { key: 'contratos', label: 'Contratos', roles: ['DEV', 'COMERCIAL'] },
    { key: 'propostas', label: 'Propostas', roles: ['DEV', 'COMERCIAL'] },
  ],
  dossie: [
    { key: 'general', label: 'Resumo', roles: ['DEV', 'CEO', 'COMERCIAL'] },
    { key: 'subscription', label: 'Assinatura', roles: ['DEV', 'CEO', 'COMERCIAL'] },
    { key: 'finance', label: 'Financeiro', roles: ['DEV', 'CEO', 'COMERCIAL'] },
    { key: 'users', label: 'Usuários', roles: ['DEV', 'CEO', 'COMERCIAL'] },
    { key: 'documents', label: 'Documentos', roles: ['DEV', 'CEO', 'COMERCIAL'] },
    { key: 'support', label: 'Chamados', roles: ['DEV', 'CEO', 'COMERCIAL'] },
    { key: 'logs', label: 'Auditoria', roles: ['DEV', 'CEO', 'COMERCIAL'] },
  ],
  configuracoes: [
    { key: 'global', label: 'Configuração global', roles: ['DEV', 'CEO'] },
    { key: 'permissoes', label: 'Permissões', roles: ['DEV'] },
    { key: 'acessos', label: 'Acessos técnicos', roles: ['DEV', 'CEO', 'COMERCIAL'] },
  ],
};

export function subsFor(tab: string, role: string | null | undefined): SubSection[] {
  const normalized = String(role ?? '').toUpperCase();
  return (SUBS[tab] ?? []).filter((sub) => sub.roles.includes(normalized)).map(({ key, label }) => ({ key, label }));
}

/** Subsecao pedida quando permitida; senao a primeira disponivel (ou undefined se a aba nao tem subsecoes). */
export function resolveSub(tab: string, requested: string | null | undefined, role: string | null | undefined): string | undefined {
  const subs = subsFor(tab, role);
  return subs.find((sub) => sub.key === requested)?.key ?? subs[0]?.key;
}