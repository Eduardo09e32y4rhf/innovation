import { describe, expect, it } from 'vitest';
import { summarizeAccessResults } from '../../../apps/web/app/[tenant]/dashboard/employees/access-result';

describe('summarizeAccessResults', () => {
  it('resposta vazia ou ausente nao e sucesso', () => {
    expect(summarizeAccessResults([], 'ok').ok).toBe(false);
    expect(summarizeAccessResults(undefined, 'ok').ok).toBe(false);
  });
  it('falha por item mostra o motivo do servidor', () => {
    const r = summarizeAccessResults([{ employeeId: 'e1', success: false, error: 'Seu perfil nao pode gerir o acesso deste usuario' }], 'Acesso bloqueado');
    expect(r).toEqual({ ok: false, message: 'Seu perfil nao pode gerir o acesso deste usuario' });
  });
  it('um item com falha entre varios derruba o sucesso geral', () => {
    expect(summarizeAccessResults([{ success: true }, { success: false }], 'ok').ok).toBe(false);
  });
  it('sucesso devolve a provisoria somente quando ela existe', () => {
    expect(summarizeAccessResults([{ success: true }], 'Acesso bloqueado')).toEqual({ ok: true, message: 'Acesso bloqueado' });
    expect(summarizeAccessResults([{ success: true, temporaryPassword: 'Aa1!x' }], 'Senha redefinida')).toEqual({ ok: true, message: 'Senha redefinida', temporaryPassword: 'Aa1!x' });
  });
});