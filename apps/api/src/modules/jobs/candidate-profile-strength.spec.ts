import { describe, expect, it } from 'vitest';
import { candidateProfileStrength } from './candidate-profile-strength';
const complete = { name: 'Pessoa', about: 'Experiência em atendimento.', phone: '11999999999', street: 'Rua', city: 'São Paulo', state: 'SP', skills: ['Excel'], education: [{ level: 'Superior' }], experience: [{ role: 'Vendedor' }], languages: ['Português'], resumeKey: 'resume.pdf' };
describe('força do perfil', () => {
  it('soma 100 apenas para os oito itens concluídos', () => {
    const result = candidateProfileStrength(complete);
    expect(result.score).toBe(100); expect(result.items).toHaveLength(8); expect(result.missingItems).toEqual([]);
  });
  it('sem resumo fica em 80 e não é Avançado', () => {
    const result = candidateProfileStrength({ ...complete, about: '  ' });
    expect(result.score).toBe(80); expect(result.level.name).toBe('Intermediário'); expect(result.missingItems[0]).toMatchObject({ key: 'about', points: 20 });
  });
  it('ordena os itens faltantes por pontos, sem recompensas fictícias', () => {
    const result = candidateProfileStrength({});
    expect(result.score).toBe(0); expect(result.missingItems.map(item => item.points)).toEqual([20, 20, 15, 15, 10, 10, 5, 5]);
  });
  it('não conta arrays vazios ou itens em branco', () => {
    expect(candidateProfileStrength({ name: ' ', skills: [' '], languages: [''], education: [{}], experience: [{}] }).score).toBe(0);
  });
});
