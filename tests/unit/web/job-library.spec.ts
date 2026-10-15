import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { evaluateAnswer, screeningScore } from '../../../apps/api/src/modules/jobs/recruitment-rules';
import { InternalApplyDto, PublicInternalApplyDto } from '../../../apps/api/src/modules/jobs/internal-jobs.service';
import { applyLevels, draftFromTemplate, levelsOf, QUESTION_LIBRARY, questionFromLibrary, ROLE_TEMPLATES, templateForTitle, weightShares } from '../../../apps/web/app/[tenant]/dashboard/jobs/job-library';

describe('modelos de cargo', () => {
  it('reconhece o cargo pelo titulo', () => {
    expect(templateForTitle('Vendedor Externo')?.id).toBe('vendas');
    expect(templateForTitle('Desenvolvedor Full Stack')?.id).toBe('ti');
    expect(templateForTitle('Motorista de Caminhão')?.id).toBe('motorista');
    expect(templateForTitle('Técnico de Enfermagem')?.id).toBe('saude');
    expect(templateForTitle('Auxiliar de Limpeza')?.id).toBe('limpeza');
    expect(templateForTitle('Astronauta')).toBeNull();
  });
  it('todo modelo gera vaga completa com perguntas validas da biblioteca', () => {
    const keys = new Set(QUESTION_LIBRARY.map((item) => item.key));
    for (const template of ROLE_TEMPLATES) {
      const draft = draftFromTemplate(template.titles[0], template);
      expect(draft.description).toContain(template.titles[0]);
      expect(draft.requirements.length).toBeGreaterThan(0);
      expect(draft.criteria.length).toBeGreaterThan(0);
      for (const key of draft.questions) expect(keys.has(key)).toBe(true);
    }
  });
});

describe('perguntas prontas: nota em % igual no navegador e no servidor', () => {
  it('pergunta pronta tem regra v2 e elimina o que deve', () => {
    const cnh = questionFromLibrary('cnh', 'REJECT');
    expect(cnh.scoreRule).toMatchObject({ v: 2, weight: 3 });
    expect(cnh.knockout).toMatchObject({ action: 'REJECT', acceptValues: ['B', 'AB', 'C', 'D', 'E'] });
    const rule = { ...cnh, id: 'cnh', options: cnh.options } as any;
    expect(evaluateAnswer(rule, 'B').points).toBe(100);
    expect(evaluateAnswer(rule, 'Não possuo')).toMatchObject({ knockedOut: true, action: 'REJECT' });
  });
  it('niveis vao e voltam sem perder nada; pesos somam 100%', () => {
    const base = questionFromLibrary('experiencia');
    const edited = applyLevels(base, { 'Sem experiência': 'X', 'Menos de 6 meses': 40, '6 meses a 2 anos': 70, 'Mais de 2 anos': 100 }, 2, 'FLAG');
    expect(levelsOf(edited)).toEqual({ 'Sem experiência': 'X', 'Menos de 6 meses': 40, '6 meses a 2 anos': 70, 'Mais de 2 anos': 100 });
    const shares = weightShares([edited, questionFromLibrary('inicio'), questionFromLibrary('bairro')]);
    expect(shares).toEqual([67, 33, 0]);
    const score = screeningScore([evaluateAnswer({ ...edited, id: 'a' } as any, 'Mais de 2 anos'), evaluateAnswer({ ...questionFromLibrary('inicio'), id: 'b' } as any, 'Em até 30 dias')]);
    expect(score).toBe(Math.round((100 * 2 + 40) / 3));
  });
});

describe('vaga interna: a candidatura deixa de ser recusada pela validacao', () => {
  it('campos do formulario sao aceitos (antes: "property registration should not exist")', async () => {
    const dto = plainToInstance(InternalApplyDto, { registration: '1001', phone: '11999', coverLetter: 'Oi' });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
    const pub = plainToInstance(PublicInternalApplyDto, { registration: '1001', cpf: '123.456.789-09', consent: true, answers: { q1: 'Sim' } });
    expect(await validate(pub, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
  });
});
