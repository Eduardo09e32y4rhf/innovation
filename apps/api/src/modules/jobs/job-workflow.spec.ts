import { describe, expect, it } from 'vitest';
import { approvalOutcome, canDecide, currentStep, headcountCheck, needsApproval, normalizeSteps } from './job-workflow';

describe('requisição de vaga', () => {
  it('normaliza as etapas na ordem gestor, RH, financeiro e ignora lixo', () => {
    expect(normalizeSteps(['financeiro', 'x', 'gestor', 'gestor'])).toEqual(['GESTOR', 'FINANCEIRO']);
    expect(normalizeSteps(undefined)).toEqual([]);
  });
  it('a etapa da vez é a primeira pendente depois das aprovadas', () => {
    const rows = [{ step: 'GESTOR', position: 0, status: 'APPROVED' }, { step: 'RH', position: 1, status: 'PENDING' }, { step: 'FINANCEIRO', position: 2, status: 'PENDING' }];
    expect(currentStep(rows)?.step).toBe('RH');
    expect(currentStep([{ step: 'GESTOR', position: 0, status: 'REJECTED' }, { step: 'RH', position: 1, status: 'PENDING' }])).toBeNull();
    expect(approvalOutcome(rows)).toBe('PENDING');
    expect(approvalOutcome(rows.map((r) => ({ ...r, status: 'APPROVED' })))).toBe('APPROVED');
    expect(approvalOutcome([{ step: 'RH', position: 0, status: 'REJECTED' }])).toBe('REJECTED');
  });
  it('cada etapa tem seus perfis', () => {
    expect(canDecide('GESTOR', 'gestor')).toBe(true);
    expect(canDecide('FINANCEIRO', 'RH')).toBe(false);
    expect(canDecide('FINANCEIRO', 'CEO')).toBe(true);
  });
  it('só rascunho ou vaga nova passa por aprovação; reativar e pausar não', () => {
    expect(needsApproval(['RH'], null, 'OPEN')).toBe(true);
    expect(needsApproval(['RH'], 'DRAFT', 'OPEN')).toBe(true);
    expect(needsApproval(['RH'], 'PAUSED', 'OPEN')).toBe(false);
    expect(needsApproval(['RH'], 'CLOSED', 'OPEN')).toBe(false);
    expect(needsApproval([], 'DRAFT', 'OPEN')).toBe(false);
  });
  it('orçamento por área', () => {
    expect(headcountCheck(null, 10, 5)).toEqual({ ok: true });
    expect(headcountCheck(5, 3, 2)).toEqual({ ok: true });
    const over = headcountCheck(5, 4, 2);
    expect(over.ok).toBe(false);
    expect((over as any).message).toMatch(/Restam 1/);
  });
});