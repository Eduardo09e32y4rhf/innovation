import { describe, expect, it } from 'vitest';
import { jobLifecycle, outdatedFields, reportedChanges, statusChange } from './job-lifecycle';

const hoje = new Date('2026-10-12T12:00:00Z');
const diasAtras = (n: number) => new Date(hoje.getTime() - n * 86_400_000);

describe('vaga encerrada: 30 dias', () => {
  it('aberta aceita candidatos', () => expect(jobLifecycle({ status: 'OPEN' }, hoje)).toMatchObject({ phase: 'OPEN', acceptsApplications: true, canReactivate: false }));
  it('aberta com prazo vencido não aceita', () => expect(jobLifecycle({ status: 'OPEN', deadline: diasAtras(1) }, hoje).acceptsApplications).toBe(false));
  it('encerrada há 5 dias: continua visível, não aceita, dá para reativar (faltam 25 dias)', () => {
    const l = jobLifecycle({ status: 'CLOSED', closedAt: diasAtras(5) }, hoje);
    expect(l).toMatchObject({ phase: 'CLOSED_RECENT', acceptsApplications: false, canReactivate: true, daysLeft: 25 });
    expect(l.reactivatableUntil).toBe('2026-11-06');
  });
  it('encerrada há 30 dias exatos ainda reativa; há 31 não', () => {
    expect(jobLifecycle({ status: 'CLOSED', closedAt: diasAtras(30) }, hoje).canReactivate).toBe(true);
    expect(jobLifecycle({ status: 'CLOSED', closedAt: diasAtras(31) }, hoje)).toMatchObject({ phase: 'ARCHIVED', canReactivate: false });
  });
  it('vaga antiga sem closedAt usa a última alteração', () => expect(jobLifecycle({ status: 'CLOSED', updatedAt: diasAtras(40) }, hoje).phase).toBe('ARCHIVED'));
  it('rascunho não aceita nem reativa', () => expect(jobLifecycle({ status: 'DRAFT' }, hoje)).toMatchObject({ phase: 'DRAFT', acceptsApplications: false }));
});

describe('trocar o status', () => {
  it('encerrar grava a data e não mexe no resto', () => expect(statusChange({ status: 'OPEN' }, 'CLOSED', hoje)).toEqual({ ok: true, data: { closedAt: hoje } }));
  it('reativar dentro de 30 dias: limpa o encerramento e conta a reativação (não é vaga nova)', () => {
    const r = statusChange({ status: 'CLOSED', closedAt: diasAtras(10), reopenCount: 1 }, 'OPEN', hoje);
    expect(r).toEqual({ ok: true, data: { closedAt: null, reopenedAt: hoje, reopenCount: 2 } });
  });
  it('reativar depois de 30 dias é recusado e manda duplicar', () => {
    const r = statusChange({ status: 'CLOSED', closedAt: diasAtras(45) }, 'OPEN', hoje);
    expect(r.ok).toBe(false);
    expect((r as any).message).toMatch(/Duplique/);
  });
  it('encerrada não volta para rascunho', () => expect(statusChange({ status: 'CLOSED', closedAt: diasAtras(2) }, 'DRAFT', hoje).ok).toBe(false));
  it('mesmo status não muda nada', () => expect(statusChange({ status: 'OPEN' }, 'OPEN', hoje)).toEqual({ ok: true, data: {} }));
  it('publicar rascunho é livre', () => expect(statusChange({ status: 'DRAFT' }, 'OPEN', hoje).ok).toBe(true));
});

describe('cadastro desatualizado (candidatura interna)', () => {
  const completo = { phone: '11999990000', email: 'a@b.com', birthDate: '1990-01-01', cep: '01310914', street: 'Av. Paulista', city: 'São Paulo', cpf: '12345678909', updatedAt: diasAtras(60) };
  it('cadastro completo e recente não gera aviso', () => expect(outdatedFields(completo, hoje)).toEqual([]));
  it('lista o que falta', () => expect(outdatedFields({ ...completo, phone: '', cep: null }, hoje)).toEqual(['telefone', 'endereço']));
  it('cadastro parado há mais de 12 meses', () => expect(outdatedFields({ ...completo, updatedAt: diasAtras(400) }, hoje)).toEqual(['cadastro sem atualização há mais de 12 meses']));
  it('diferenças informadas: telefone diferente aparece, igual (só máscara) não', () => {
    expect(reportedChanges({ phone: '11999990000', email: 'a@b.com' }, { phone: '(11) 99999-0000', email: 'A@B.com' })).toEqual([]);
    expect(reportedChanges({ phone: '11999990000', email: 'a@b.com' }, { phone: '(11) 98888-7777', email: 'novo@b.com' })).toEqual(['telefone: (11) 98888-7777', 'e-mail: novo@b.com']);
  });
});
