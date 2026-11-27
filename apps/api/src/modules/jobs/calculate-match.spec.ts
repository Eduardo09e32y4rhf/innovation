import { describe, expect, it } from 'vitest';
import { calculateMatch } from './calculate-match';
const candidate = { profession: 'Vendedor', skills: ['Vendas', 'Excel', 'Atendimento'], education: [{ level: 'Ensino médio', status: 'Completo' }], city: 'São Paulo', state: 'SP', driverLicenseCategory: ['A/B'] };
const job = { title: 'Vendedor', department: 'Vendas', workMode: 'REMOTE', criteria: [{ name: 'Vendas', kind: 'SKILL', isMandatory: true, weight: 1 }] };
describe('match único do candidato', () => {
  it.each(['A', 'B', 'CNH categoria B', 'A/B'])('aceita CNH A/B para %s', target => {
    const result = calculateMatch(candidate, { ...job, criteria: [...job.criteria, { name: target, kind: 'CNH', isMandatory: true, weight: 1 }] });
    expect(result.met).toContain(target); expect(result.missingMandatory).toBe(false);
  });
  it('CNH A não atende B; o obrigatório limita o score e impede Ideal', () => {
    const result = calculateMatch({ ...candidate, driverLicenseCategory: ['A'] }, { ...job, criteria: [...job.criteria, { name: 'CNH categoria B', kind: 'CNH', isMandatory: true, weight: 1 }] });
    expect(result.score).toBeLessThanOrEqual(60); expect(result.level).not.toBe('ideal'); expect(result.missing).toContain('CNH categoria B');
  });
  it('Vendas/Excel/Atendimento não ultrapassa 40 para Full Stack', () => {
    const result = calculateMatch(candidate, { title: 'Desenvolvedor Full Stack', workMode: 'REMOTE', requirements: ['TypeScript', 'React', 'Node.js'] });
    expect(result.score).toBeLessThanOrEqual(40); expect(result.partial.join(' ')).toContain('Área diferente');
  });
  it('não cria compatibilidade sem perfil ou requisitos', () => {
    expect(calculateMatch({}, { title: 'Vendedor', workMode: 'REMOTE' }).score).toBe(0);
    expect(calculateMatch(candidate, { title: 'Vendedor' }).partial).toHaveLength(1);
  });
  it('respeita os quatro pesos quando há evidências completas', () => {
    expect(calculateMatch(candidate, job).score).toBe(100);
    expect(calculateMatch(candidate, { ...job, workMode: 'ONSITE', location: 'Curitiba/PR' }).score).toBe(90);
  });
});

it('normaliza requisitos legados sem penalizar acentos', () => {
  expect(calculateMatch({ profession: 'Vendedor', skills: ['Comunicação'] }, { title: 'Vendedor', requirements: ['pede_comunicacao'] }).requirements[0].met).toBe(true);
});
