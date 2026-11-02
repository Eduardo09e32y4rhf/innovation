import { describe, expect, it } from 'vitest';
import { onboardingTasksFromDocs } from './onboarding-from-hire';

describe('RS-R-04/RS-D-18: onboarding nasce da contratação', () => {
  it('marca como concluídas as tarefas de envio cujos documentos já foram aprovados', () => {
    const tasks = onboardingTasksFromDocs(['RG', 'Comprovante de residência'], new Date('2026-11-02T12:00:00Z'));
    const byTitle = Object.fromEntries(tasks.map((t) => [t.title, t.completedAt]));
    expect(byTitle['Enviar RG ou CNH']).toBeInstanceOf(Date);
    expect(byTitle['Enviar Comprovante de Residencia']).toBeInstanceOf(Date);
    expect(byTitle['Enviar CPF']).toBeNull();
    expect(byTitle['Assinar contrato de trabalho']).toBeNull();
  });
  it('sem documentos aprovados nada vem concluído', () => {
    expect(onboardingTasksFromDocs([]).every((t) => t.completedAt === null)).toBe(true);
  });
});
