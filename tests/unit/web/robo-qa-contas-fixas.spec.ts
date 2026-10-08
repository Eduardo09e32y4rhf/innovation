import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { carregarSenhaFixa, contaFixa, emailFixo, limparSenhaFixa, nomeFixo, PERFIS_FIXOS, salvarSenhaFixa } from '../../../apps/web/app/_components/robo-qa/engine/contasFixas';
import { novoEstado } from '../../../apps/web/app/_components/robo-qa/engine/estado';
import { PERFIS_DE_TESTE } from '../../../apps/web/app/_components/robo-qa/engine/matriz';
import { ROTULO_PERFIL } from '../../../apps/web/app/_components/robo-qa/engine/usuarios';

// O seed (CommonJS, sem dependencias) e o robo do site precisam concordar nos e-mails e nomes.
const seed = createRequire(import.meta.url)('../../../apps/api/prisma/robo-qa-contas.cjs') as {
  PERFIS: { perfil: string; rotulo: string }[];
  emailFixo(perfil: string): string;
  nomeFixo(rotulo: string): string;
  senhaForte(senha: unknown): boolean;
  avaliarAmbiente(env: Record<string, string | undefined>): { ok: boolean; motivo?: string };
};

beforeEach(() => {
  const dados = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => dados.get(k) ?? null, setItem: (k: string, v: string) => dados.set(k, v), removeItem: (k: string) => dados.delete(k) });
});

describe('contas fixas: robô e seed concordam', () => {
  it('mesmos perfis, e-mails e nomes dos dois lados', () => {
    expect(seed.PERFIS.map((p) => p.perfil)).toEqual([...PERFIS_FIXOS]);
    for (const { perfil, rotulo } of seed.PERFIS) {
      expect(emailFixo(perfil)).toBe(seed.emailFixo(perfil));
      expect(nomeFixo(perfil)).toBe(seed.nomeFixo(rotulo));
      expect(ROTULO_PERFIL[perfil]).toBe(rotulo);
    }
  });
  it('todo perfil testado pelo robô (além do DEV que o liga) tem conta fixa', () => {
    for (const perfil of PERFIS_DE_TESTE) expect(PERFIS_FIXOS).toContain(perfil);
    expect(PERFIS_FIXOS).toContain('DEV');
  });
  it('e-mails são únicos e de teste', () => {
    const emails = PERFIS_FIXOS.map(emailFixo);
    expect(new Set(emails).size).toBe(emails.length);
    expect(emails.every((e) => e.endsWith('@example.com') && e.startsWith('robo-qa.'))).toBe(true);
    expect(emailFixo('RH_RS')).toBe('robo-qa.rhrs@example.com');
  });
});

describe('contas fixas: uso pelo robô', () => {
  it('a senha fica salva só neste navegador e pode ser removida', () => {
    expect(carregarSenhaFixa()).toBe('');
    salvarSenhaFixa('Senha#Forte123');
    expect(carregarSenhaFixa()).toBe('Senha#Forte123');
    limparSenhaFixa();
    expect(carregarSenhaFixa()).toBe('');
  });
  it('conta fixa já nasce criada e reutilizada: o robô não tenta criá-la', () => {
    const u = contaFixa('GESTOR', 'Senha#Forte123');
    expect(u).toMatchObject({ perfil: 'GESTOR', email: 'robo-qa.gestor@example.com', criado: true, reutilizada: true, fixa: true, situacao: 'pendente' });
  });
  it('com a senha salva, todos os perfis escolhidos entram por conta fixa', () => {
    salvarSenhaFixa('Senha#Forte123');
    const estado = novoEstado([...PERFIS_DE_TESTE], 'normal', 'empresa', 'completo');
    expect(estado.usuarios).toHaveLength(PERFIS_DE_TESTE.length);
    expect(estado.usuarios.every((u) => u.fixa && u.criado && u.email === emailFixo(u.perfil))).toBe(true);
  });
  it('sem a senha, mantém o comportamento antigo (cria usuários ROBO-QA aleatórios)', () => {
    const estado = novoEstado(['RH', 'GESTOR'], 'normal', 'empresa', 'rapido');
    expect(estado.usuarios.every((u) => !u.fixa && !u.criado && u.email.endsWith('@example.com'))).toBe(true);
  });
});

describe('seed: só roda em banco de teste, com confirmação', () => {
  const ok = { NODE_ENV: 'development', ROBO_QA_BANCO_DE_TESTE: 'sim', ROBO_QA_SENHA: 'Senha#Forte123', DATABASE_URL: 'postgresql://u:p@localhost:5436/innovation_test_db' };
  it('aceita o ambiente de teste local', () => expect(seed.avaliarAmbiente(ok)).toEqual({ ok: true }));
  it('recusa sem a confirmação de banco de teste', () => expect(seed.avaliarAmbiente({ ...ok, ROBO_QA_BANCO_DE_TESTE: undefined }).ok).toBe(false));
  it.each(['curta1#A', 'semnumero#Aa', 'SEMMINUSCULA1#', 'semsimbolo1Aa', undefined])('recusa senha fraca: %s', (senha) => {
    expect(seed.avaliarAmbiente({ ...ok, ROBO_QA_SENHA: senha }).ok).toBe(false);
  });
  it('recusa produção, a menos que se confirme que é homologação', () => {
    const producao = { ...ok, NODE_ENV: 'production' };
    expect(seed.avaliarAmbiente(producao).ok).toBe(false);
    expect(seed.avaliarAmbiente({ ...producao, ROBO_QA_PERMITIR_PRODUCAO: 'sim' }).ok).toBe(true);
  });
  it('recusa banco remoto sem confirmação; aceita nome de serviço do Docker e localhost', () => {
    const remoto = { ...ok, DATABASE_URL: 'postgresql://u:p@db.exemplo.com.br:5432/x' };
    expect(seed.avaliarAmbiente(remoto).ok).toBe(false);
    expect(seed.avaliarAmbiente({ ...remoto, ROBO_QA_PERMITIR_BANCO_REMOTO: 'sim' }).ok).toBe(true);
    expect(seed.avaliarAmbiente({ ...ok, DATABASE_URL: 'postgresql://u:p@db:5432/x' }).ok).toBe(true);
    expect(seed.avaliarAmbiente({ ...ok, DATABASE_URL: 'postgresql://u:p@127.0.0.1:5432/x' }).ok).toBe(true);
  });
  it('recusa DATABASE_URL ausente ou inválida', () => {
    expect(seed.avaliarAmbiente({ ...ok, DATABASE_URL: undefined }).ok).toBe(false);
    expect(seed.avaliarAmbiente({ ...ok, DATABASE_URL: 'isso-nao-e-url' }).ok).toBe(false);
  });
});
