import type { Estado, Modo, Ritmo, UsuarioTeste } from './tipos';
import { novoUsuarioDeTeste } from './usuarios';

const CHAVE = 'roboQa.v1';
const CHAVE_RELATORIO = 'roboQa.relatorio';
const CHAVE_CONTAS = 'roboQa.contas';

/** Contas de teste (ROBO-QA @example.com) guardadas so neste navegador, para nao recriar nem refazer o primeiro acesso. */
export interface ContaSalva { email: string; nome: string; senha: string }

export const RITMOS: Record<Ritmo, { antes: number; depois: number; digitacao: number }> = {
  devagar: { antes: 900, depois: 900, digitacao: 90 },
  normal: { antes: 450, depois: 450, digitacao: 35 },
  rapido: { antes: 60, depois: 120, digitacao: 5 },
};

export function novoEstado(perfis: string[], ritmo: Ritmo, tenant: string, modo: Modo = 'completo'): Estado {
  return {
    versao: 1, ativo: true, pausado: false, cancelado: false, fase: 'dev', ritmo, modo, inicio: Date.now(), perfis,
    usuarios: perfis.map(usuarioParaPerfil), idxUsuario: 0, subEtapa: 'sair', tourIdx: 0,
    passos: [], achados: [], abas: [], agora: 'iniciando', perfilAtual: 'DEV', tenant,
  };
}

function usuarioParaPerfil(perfil: string): UsuarioTeste {
  const conta = carregarContas()[perfil];
  if (!conta?.email || !conta.senha) return novoUsuarioDeTeste(perfil);
  return { perfil, nome: conta.nome, email: conta.email, senha: conta.senha, criado: true, reutilizada: true, situacao: 'pendente' };
}

const seguro = <T>(fn: () => T): T | null => { try { return fn(); } catch { return null; } };

// localStorage (e nao sessionStorage): se a aba travar/fechar com um erro, o progresso nao se perde -
// ao reabrir, o robo retoma do ultimo passo salvo em vez de comecar do zero.
export function carregar(): Estado | null {
  return seguro(() => {
    const bruto = localStorage.getItem(CHAVE);
    const e = bruto ? (JSON.parse(bruto) as Estado) : null;
    return e && e.versao === 1 ? e : null;
  });
}
export function salvar(e: Estado) { seguro(() => localStorage.setItem(CHAVE, JSON.stringify(e))); }
export function limpar() { seguro(() => localStorage.removeItem(CHAVE)); }

export interface RelatorioSalvo { quando: number; html: string; markdown: string; usuarios: string[]; resumo: string }
export function salvarRelatorio(r: RelatorioSalvo) { seguro(() => localStorage.setItem(CHAVE_RELATORIO, JSON.stringify(r))); }
export function carregarRelatorio(): RelatorioSalvo | null { return seguro(() => JSON.parse(localStorage.getItem(CHAVE_RELATORIO) ?? 'null')); }

export function carregarContas(): Record<string, ContaSalva> { return seguro(() => JSON.parse(localStorage.getItem(CHAVE_CONTAS) ?? '{}')) ?? {}; }
export function salvarConta(perfil: string, conta: ContaSalva) { seguro(() => localStorage.setItem(CHAVE_CONTAS, JSON.stringify({ ...carregarContas(), [perfil]: conta }))); }
export function limparContas() { seguro(() => localStorage.removeItem(CHAVE_CONTAS)); }
