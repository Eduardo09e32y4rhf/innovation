import { describe, expect, it } from 'vitest';
import { visibleEvaluations } from './blind-evaluation';

const ev = (userId: string, criterionId: string) => ({ userId, criterionId, score: 3 });

describe('avaliação cega', () => {
  const all = [ev('ana', 'c1'), ev('ana', 'c2'), ev('bia', 'c1')];
  it('quem ainda não avaliou tudo vê só as próprias notas', () => {
    const out = visibleEvaluations(all, 'bia', ['c1', 'c2']);
    expect(out.items).toEqual([ev('bia', 'c1')]);
    expect(out.blind).toBe(true);
  });
  it('quem concluiu todos os critérios vê as notas dos colegas', () => {
    const out = visibleEvaluations(all, 'ana', ['c1', 'c2']);
    expect(out.items).toHaveLength(3);
    expect(out.blind).toBe(false);
  });
  it('quem não avaliou nada não vê nada dos outros', () => {
    expect(visibleEvaluations(all, 'caio', ['c1']).items).toEqual([]);
  });
  it('vaga sem critérios não esconde nada', () => {
    expect(visibleEvaluations(all, 'caio', []).items).toHaveLength(3);
  });
});