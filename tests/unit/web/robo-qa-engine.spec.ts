import { describe, expect, it } from 'vitest';
import { classificar } from '../../../apps/web/app/_components/robo-qa/engine/explicacoes';
import { limpar, registrarSegredo } from '../../../apps/web/app/_components/robo-qa/engine/seguranca';
import { esperadoPara } from '../../../apps/web/app/_components/robo-qa/engine/matriz';
import { blocosDoTour } from '../../../apps/web/app/_components/robo-qa/engine/tour';

const expl = { gravidade: 'alta' as const, titulo: 't', explicacao: 'e' };

describe('classificacao dos resultados', () => {
  it('botao nao encontrado / tempo esgotado / permissao negada sao INCONCLUSIVOS, nunca defeito', () => {
    expect(classificar('passo', expl, 'Tempo esgotado: não achei o botão X')).toBe('inconclusivo');
    expect(classificar('http', { ...expl, titulo: 'Permissão negada (403)' })).toBe('inconclusivo');
    expect(classificar('http', { ...expl, titulo: 'A tela pediu algo que não existe (404)' })).toBe('inconclusivo');
    expect(classificar('console', expl)).toBe('inconclusivo');
    expect(classificar('rede', expl)).toBe('inconclusivo');
  });
  it('so e FALHA com evidencia de defeito', () => {
    expect(classificar('http', { ...expl, titulo: 'O servidor falhou (erro 500)' })).toBe('falha');
    expect(classificar('pageerror', expl)).toBe('falha');
    expect(classificar('tela', expl)).toBe('falha');
    expect(classificar('regra', expl)).toBe('falha');
    expect(classificar('passo', expl, 'ESPERADO: a aba deveria existir')).toBe('falha');
  });
});

describe('nada de segredo no relatorio', () => {
  it('remove senhas conhecidas, JWT e pares senha/token', () => {
    registrarSegredo('Abc12345Segredo');
    const txt = limpar('digitou Abc12345Segredo; token: eyJhbGciOi.abcdefghij.klmnopqrstu; senha=outraSenha1; Authorization Bearer xyz123');
    expect(txt).not.toMatch(/Abc12345Segredo|eyJhbGciOi|outraSenha1|xyz123/);
  });
});

describe('modos do teste', () => {
  it('rapido tem menos etapas que o completo e nao inclui Plataforma/Faturas/Vagas/bloqueios', () => {
    const rapido = blocosDoTour('RH_RS', 'rapido').map((b) => b.nome);
    const completo = blocosDoTour('RH_RS', 'completo').map((b) => b.nome);
    expect(rapido.length).toBeLessThan(completo.length);
    expect(rapido).toContain('Menu lateral');
    for (const nome of ['Plataforma', 'Faturas', 'Vagas']) { expect(rapido).not.toContain(nome); expect(completo).toContain(nome); }
    expect(rapido.some((n) => n.startsWith('Bloqueio'))).toBe(false);
    expect(completo.some((n) => n.startsWith('Bloqueio'))).toBe(true);
  });
  it('RH_RS: so painel e Vagas permitidos', () => {
    expect(esperadoPara('RH_RS').permitidos.map((i) => i.id).sort()).toEqual(['dashboard', 'jobs']);
  });
});