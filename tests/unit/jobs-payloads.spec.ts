import { describe, expect, it } from 'vitest';
import { criterionPayload, questionPayload, toWholeReais } from '../../apps/web/app/[tenant]/dashboard/jobs/payloads';

describe('envio de perguntas e critérios da vaga', () => {
  it('não reenvia jobId nem position vindos do banco (erro "Job Id / Cargo: campo não reconhecido")', () => {
    const fromDatabase = { id: 'q1', jobId: 'j1', position: 0, label: '  Tem CNH?  ', type: 'SELECT', required: true, options: ['Sim', 'Não'], knockout: null, scoreRule: null } as any;
    const payload = questionPayload(fromDatabase);
    expect(Object.keys(payload).sort()).toEqual(['id', 'knockout', 'label', 'options', 'required', 'scoreRule', 'type']);
    expect(payload).not.toHaveProperty('jobId');
    expect(payload).not.toHaveProperty('position');
    expect(payload.label).toBe('Tem CNH?');
  });

  it('pergunta nova (sem id) vai sem o campo id', () => {
    expect(questionPayload({ label: 'x', type: 'TEXT', required: false, options: [] } as any)).not.toHaveProperty('id');
  });

  it('critério também vai só com id, nome e peso', () => {
    const payload = criterionPayload({ id: 'c1', jobId: 'j1', position: 2, name: ' Experiência ', weight: 3 } as any);
    expect(payload).toEqual({ id: 'c1', name: 'Experiência', weight: 3 });
  });
});

describe('salário da vaga', () => {
  it('aceita decimal com ponto ou vírgula e arredonda para reais inteiros', () => {
    expect(toWholeReais('4500')).toBe(4500);
    expect(toWholeReais('4500.50')).toBe(4501);
    expect(toWholeReais('4.500,40')).toBe(4500);
    expect(toWholeReais('4500,5')).toBe(4501);
  });
  it('vazio ou inválido vira "não informado"', () => {
    expect(toWholeReais('')).toBeUndefined();
    expect(toWholeReais('abc')).toBeUndefined();
    expect(toWholeReais('-10')).toBeUndefined();
  });
});
