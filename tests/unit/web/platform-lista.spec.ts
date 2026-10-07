import { describe, expect, it } from 'vitest';
import { comoLista } from '../../../apps/web/app/[tenant]/dashboard/platform/_hub/lista';

describe('comoLista (aba Auditoria caía com "companies.map is not a function")', () => {
  it('aceita lista pura', () => expect(comoLista([{ id: 1 }])).toEqual([{ id: 1 }]));
  it('extrai a lista do objeto paginado { data, total, page, limit }', () => {
    expect(comoLista({ data: [{ id: 'a' }], total: 1, page: 1, limit: 25 })).toEqual([{ id: 'a' }]);
  });
  it('nunca devolve algo que não seja lista', () => {
    for (const ruim of [null, undefined, {}, { data: null }, { data: {} }, 'x', 7]) expect(comoLista(ruim)).toEqual([]);
  });
});
