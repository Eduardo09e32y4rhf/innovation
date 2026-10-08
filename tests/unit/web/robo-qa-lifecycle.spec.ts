import { beforeEach, describe, expect, it, vi } from 'vitest';
import { identidadeConfere } from '../../../apps/web/app/_components/robo-qa/engine/sessao';
import { autorizarNome, registrarCriacao, manifesto, limparRecursos, recursoDaResposta } from '../../../apps/web/app/_components/robo-qa/engine/recursos';
import { blocosDoTour } from '../../../apps/web/app/_components/robo-qa/engine/tour';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
});
describe('identidade real e limpeza limitada', () => {
  it.each([null, { email: 'dev@test', perfil: 'DEV' }, { email: 'outro@test', perfil: 'RH' }])('recusa sessão anterior ou alheia: %j', (atual) => {
    expect(identidadeConfere(atual, { email: 'rh@test', perfil: 'RH' })).toBe(false);
  });
  it('aceita somente email e perfil esperados', () => expect(identidadeConfere({ email: 'RH@test', perfil: 'RH' }, { email: 'rh@test', perfil: 'RH' })).toBe(true));
  it('não exclui registros anteriores só porque têm prefixo ROBO-QA', () => {
    expect(recursoDaResposta('/users', { name: 'ROBO-QA antigo' }, { id: 'a' }, [])).toBeNull();
    expect(recursoDaResposta('/finance/refunds', { name: 'ROBO-QA atual' }, { id: 'a' }, ['ROBO-QA atual'])).toBeNull();
  });
  it('persiste IDs, deduplica observações e limpa em ordem inversa', async () => {
    autorizarNome('ROBO-QA atual');
    for (const id of ['um', 'dois', 'dois']) registrarCriacao('/jobs', { title: 'ROBO-QA atual' }, { id });
    const excluir = vi.fn().mockResolvedValue(undefined);
    expect(await limparRecursos(excluir)).toEqual([]);
    expect(excluir.mock.calls).toEqual([['/jobs/dois'], ['/jobs/um']]);
    await limparRecursos(excluir);
    expect(excluir).toHaveBeenCalledTimes(2);
    expect(manifesto().recursos.every((r) => r.status === 'removido')).toBe(true);
  });
  it('falha na exclusão permanece pendente para retomar', async () => {
    autorizarNome('ROBO-QA pendente');
    registrarCriacao('/jobs', { title: 'ROBO-QA pendente' }, { id: 'um' });
    expect(await limparRecursos(async () => { throw new Error('403'); })).toHaveLength(1);
    expect(manifesto().recursos[0].status).toBe('pendente');
  });
  it('usa o ID do funcionário, não o ID do usuário relacionado', () => {
    expect(recursoDaResposta('/employees', { name: 'ROBO-QA Nome' }, { id: 'func', user: { id: 'user' } }, ['ROBO-QA Nome'])?.id).toBe('func');
  });
  it('arquiva empresa sem purge', async () => {
    autorizarNome('ROBO-QA Empresa');
    registrarCriacao('/platform/companies', { name: 'Robo-qa Empresa' }, { id: 'empresa' });
    const excluir = vi.fn().mockResolvedValue(undefined);
    await limparRecursos(excluir);
    expect(excluir.mock.calls).toEqual([['/platform/companies/empresa']]);
  });
  it('termina vagas e cadastro antes de seguir para outra tela', () => {
    const nomes = blocosDoTour('DEV').map((b) => b.nome);
    const i = nomes.indexOf('Tela: Vagas');
    expect(nomes.slice(i, i + 3)).toEqual(['Tela: Vagas', 'Vagas', 'Criar vaga']);
    expect(nomes.filter((n) => n === 'Criar vaga')).toHaveLength(1);
  });
});
