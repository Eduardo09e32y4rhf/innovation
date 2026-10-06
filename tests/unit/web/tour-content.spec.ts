import { describe, expect, it } from 'vitest';
import { TOURS, tourFor } from '../../../apps/web/app/[tenant]/dashboard/_components/tour/tour-content';

const ESCALAS_VIEWS = ['calendario', 'ponto', 'solicitacoes', 'aprovacoes', 'modelos', 'fechamento', 'relatorios'];
const ROLES = ['FUNCIONARIO', 'GESTOR', 'RH', 'ADMIN', 'CEO', 'CONTABIL', 'COMERCIAL', 'DEV', 'CONSULTA', 'RH_RS'];

describe('passo a passo por perfil', () => {
  it('existe um roteiro para cada perfil do sistema', () => {
    for (const role of ROLES) expect(TOURS[role], role).toBeDefined();
  });

  it('cada roteiro tem passos curtos, com titulo unico e rotas validas', () => {
    for (const [role, tour] of Object.entries(TOURS)) {
      expect(tour.steps.length, role).toBeGreaterThanOrEqual(4);
      expect(tour.steps.length, role).toBeLessThanOrEqual(8);
      const titles = tour.steps.map((step) => step.title);
      expect(new Set(titles).size, `${role}: titulos repetidos`).toBe(titles.length);
      for (const step of tour.steps) {
        expect(step.text.length, `${role}/${step.title}`).toBeLessThanOrEqual(330);
        if (!step.href) continue;
        expect(step.href.startsWith('/dashboard'), `${role}: ${step.href}`).toBe(true);
        const view = new URL(step.href, 'https://x.test').searchParams.get('view');
        if (view) expect(ESCALAS_VIEWS, `${role}: view ${view}`).toContain(view);
      }
    }
  });

  it('funcionario ve so o que e dele e nunca e levado a telas de gestao', () => {
    const hrefs = TOURS.FUNCIONARIO.steps.map((step) => step.href ?? '');
    for (const forbidden of ['/users', '/employees', '/platform', '/contabilidade', '/faturas', 'aprovacoes', 'fechamento', 'modelos']) {
      expect(hrefs.some((href) => href.includes(forbidden)), forbidden).toBe(false);
    }
  });

  it('perfil desconhecido cai no roteiro mais restrito', () => {
    expect(tourFor('QUALQUER').role).toBe('FUNCIONARIO');
    expect(tourFor(undefined).role).toBe('FUNCIONARIO');
    expect(tourFor('rh').role).toBe('RH');
  });

  it('RH, ADMIN e DEV ensinam as escalas 5x2, 6x1 e 12x36 ja cadastradas', () => {
    for (const role of ['RH', 'ADMIN', 'GESTOR', 'DEV']) {
      expect(TOURS[role].steps.some((step) => /5x2, 6x1 e 12x36/.test(step.title)), role).toBe(true);
    }
  });
});
