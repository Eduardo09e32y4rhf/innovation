import { describe, expect, it } from 'vitest';
import { DOCUMENT_CATALOG, DOCUMENT_KITS, parseItemsInput } from '../../../apps/web/app/[tenant]/dashboard/jobs/_components/documents-model';
import { HIRE_DOCUMENT_KITS, hireKitFor, normalizeItems } from '../../../apps/api/src/modules/jobs/recruitment-documents.rules';

describe('catálogo de documentos', () => {
  const all = DOCUMENT_CATALOG.flatMap((group) => group.items);
  it('rótulos aceitos pelo servidor (2-60 caracteres, sem vírgula/ponto e vírgula)', () => {
    for (const item of all) { expect(item.length).toBeLessThanOrEqual(60); expect(item).not.toMatch(/[,;\n]/); }
    expect(parseItemsInput(all.join('\n'))).toHaveLength(new Set(all.map((item) => item.toLocaleLowerCase('pt-BR'))).size);
  });
  it('kits só usam itens do catálogo e cobrem CLT e PJ', () => {
    for (const kit of DOCUMENT_KITS) for (const item of kit.items) expect(all).toContain(item);
    expect(DOCUMENT_CATALOG.some((group) => group.key === 'pj')).toBe(true);
    expect(DOCUMENT_CATALOG.some((group) => group.key.startsWith('clt'))).toBe(true);
  });
  it('contratação usa o kit do contrato', () => {
    expect(hireKitFor('PJ')).toEqual([...HIRE_DOCUMENT_KITS.PJ]);
    expect(hireKitFor('CLT')).toEqual([...HIRE_DOCUMENT_KITS.CLT]);
    expect(normalizeItems(hireKitFor('PJ'))).toHaveLength(HIRE_DOCUMENT_KITS.PJ.length);
    expect(normalizeItems(hireKitFor('CLT'))).toHaveLength(HIRE_DOCUMENT_KITS.CLT.length);
  });
});
