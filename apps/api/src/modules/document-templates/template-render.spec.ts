import { describe, expect, it } from 'vitest';
import { renderTemplate, unknownVariables, validateTemplate } from './template-render';

describe('modelos de documento', () => {
  it('troca os campos pelos valores', () => {
    expect(renderTemplate('Prezado(a) {{nome}}, cargo {{cargo}}.', { nome: 'Ana', cargo: 'Analista' })).toBe('Prezado(a) Ana, cargo Analista.');
  });
  it('aceita espaços e maiúsculas dentro das chaves', () => expect(renderTemplate('{{ Nome }}', { nome: 'Ana' })).toBe('Ana'));
  it('campo sem valor vira linha para preencher à mão, nunca "undefined"', () => {
    expect(renderTemplate('Data: {{data_ocorrencia}}', {})).toBe('Data: ________');
    expect(renderTemplate('Dias: {{dias_suspensao}}', { dias_suspensao: null })).toBe('Dias: ________');
  });
  it('mesmo campo várias vezes', () => expect(renderTemplate('{{nome}} e {{nome}}', { nome: 'Ana' })).toBe('Ana e Ana'));
  it('não executa nada além de trocar texto', () => expect(renderTemplate('{{nome}}', { nome: '<script>alert(1)</script>' })).toBe('<script>alert(1)</script>'));
  it('acha campos desconhecidos', () => expect(unknownVariables('{{nome}} {{salario}} {{foo}}')).toEqual(['salario', 'foo']));
  it('valida o modelo', () => {
    const ok = { name: 'Advertência por atraso', kind: 'ADVERTENCIA', title: 'Termo de advertência', body: 'Prezado(a) {{nome}}, em {{data_ocorrencia}} houve atraso.' };
    expect(validateTemplate(ok)).toBeNull();
    expect(validateTemplate({ ...ok, name: '' })).toMatch(/nome/);
    expect(validateTemplate({ ...ok, kind: 'X' })).toMatch(/tipo/);
    expect(validateTemplate({ ...ok, body: 'curto' })).toMatch(/curto/);
    expect(validateTemplate({ ...ok, body: ok.body + ' {{salario}}' })).toMatch(/desconhecido/);
  });
});
