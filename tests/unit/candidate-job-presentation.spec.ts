import { describe, expect, it } from 'vitest';
import { jobLocationLine } from '../../apps/web/app/carreiras/_lib/job-presentation';
import { readableJobTags } from '../../apps/web/app/carreiras/_lib/jobTagLabels';
describe('apresentação de vagas', () => {
  it('deduplica modalidade e abrevia contrato', () => {
    expect(jobLocationLine({ location: 'São Paulo / SP · Remoto', workMode: 'REMOTE', employmentType: 'Pessoa jurídica' })).toBe('São Paulo/SP · Remoto · PJ');
    expect(jobLocationLine({ location: 'Remoto · Remoto', workMode: 'REMOTE', employmentType: 'CLT' })).toBe('Remoto · CLT');
  });
  it('traduz somente tags conhecidas, deduplica e limita a três', () => {
    expect(readableJobTags(['pede comunicacao', 'pede_comunicacao', 'pede_ingles', 'cargo: vendas', 'chave_desconhecida', 'remoto'])).toEqual(['Comunicação', 'Inglês exigido', 'Área: Vendas']);
    expect(readableJobTags(['sem_mapa'])).toEqual([]);
  });
});
