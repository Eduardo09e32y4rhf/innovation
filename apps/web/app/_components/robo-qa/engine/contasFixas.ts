import type { UsuarioTeste } from './tipos';
import { ROTULO_PERFIL } from './usuarios';

/**
 * Contas fixas do robo: criadas pelo seed (apps/api/prisma/seed-robo-qa.cjs) com e-mail previsivel e uma unica senha.
 * Com elas o robo entra em cada perfil sem criar usuario, entao nao depende do "Novo acesso" do DEV, de licencas livres
 * nem do DEV pessoal de quem esta testando. A senha fica so neste navegador e nunca vai para o relatorio.
 * Os e-mails precisam ser iguais aos do seed (conferido em tests/unit/web/robo-qa-contas-fixas.spec.ts).
 */
export const PERFIS_FIXOS = ['DEV', 'ADMIN', 'RH', 'RH_RS', 'GESTOR', 'FUNCIONARIO', 'CONSULTA', 'COMERCIAL', 'CONTABIL'] as const;

const CHAVE = 'roboQa.fixas';

export const emailFixo = (perfil: string) => `robo-qa.${perfil.toLowerCase().replace(/_/g, '')}@example.com`;
export const nomeFixo = (perfil: string) => `ROBO-QA ${ROTULO_PERFIL[perfil] ?? perfil}`;

const seguro = <T>(fn: () => T): T | null => { try { return fn(); } catch { return null; } };

export function carregarSenhaFixa(): string {
  return seguro(() => (JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as { senha?: string }).senha ?? '') ?? '';
}
export function salvarSenhaFixa(senha: string) { seguro(() => localStorage.setItem(CHAVE, JSON.stringify({ senha }))); }
export function limparSenhaFixa() { seguro(() => localStorage.removeItem(CHAVE)); }

export function contaFixa(perfil: string, senha: string): UsuarioTeste {
  return { perfil, nome: nomeFixo(perfil), email: emailFixo(perfil), senha, criado: true, reutilizada: true, fixa: true, situacao: 'pendente' };
}
