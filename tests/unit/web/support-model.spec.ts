import { describe, expect, it } from 'vitest';
import {
  buildTimeline, countUnread, getSlaInfo, getStatusLabel, isUnread, matchesFilter, seedSeen, sortTickets,
  type SupportTicket,
} from '../../../apps/web/app/components/support/support-model';

const T0 = new Date('2026-10-22T12:00:00Z').getTime();
const iso = (offsetMin: number) => new Date(T0 + offsetMin * 60_000).toISOString();
const ticket = (o: Partial<SupportTicket> & { id: string }): SupportTicket => ({
  status: 'NEW', priority: 'NORMAL', createdAt: iso(-600), updatedAt: iso(-10), ...o,
});

describe('support: status em linguagem do cliente', () => {
  it.each([
    ['NEW', 'Recebido'], ['TRIAGE', 'Recebido'], ['IN_PROGRESS', 'Em análise'], ['WAITING_CUSTOMER', 'Aguardando você'],
    ['WAITING_DEPLOY', 'Em correção'], ['RESOLVED', 'Resolvido'], ['CLOSED', 'Encerrado'], ['REOPENED', 'Reaberto'],
    ['DUPLICATE', 'Duplicado'], ['CANCELLED', 'Cancelado'],
  ])('%s -> %s', (status, label) => expect(getStatusLabel(status)).toBe(label));
  it('status desconhecido volta como veio', () => expect(getStatusLabel('XYZ')).toBe('XYZ'));
});

describe('support: prazo (SLA)', () => {
  it('antes da primeira resposta usa o prazo de resposta', () => {
    const s = getSlaInfo({ status: 'NEW', firstResponseDueAt: iso(180), resolutionDueAt: iso(60) }, T0);
    expect(s.kind).toBe('ok');
    expect(s.label).toBe('Resposta em 3h 0min');
  });
  it('risco quando faltam menos de 2h; atrasado depois do prazo', () => {
    expect(getSlaInfo({ status: 'IN_PROGRESS', firstRespondedAt: iso(-5), resolutionDueAt: iso(30) }, T0).kind).toBe('risk');
    const late = getSlaInfo({ status: 'IN_PROGRESS', firstRespondedAt: iso(-5), resolutionDueAt: iso(-90) }, T0);
    expect(late.kind).toBe('breached');
    expect(late.label).toContain('1h 30min');
  });
  it('pausado aguardando cliente e encerrado quando finalizado', () => {
    expect(getSlaInfo({ status: 'WAITING_CUSTOMER', resolutionDueAt: iso(-90) }, T0).kind).toBe('paused');
    expect(getSlaInfo({ status: 'CLOSED', resolutionDueAt: iso(-90) }, T0).kind).toBe('done');
  });
  it('sem prazo definido', () => expect(getSlaInfo({ status: 'NEW' }, T0).kind).toBe('none'));
});

describe('support: não lido', () => {
  const a = ticket({ id: 'a', updatedAt: iso(-5) });
  const b = ticket({ id: 'b', updatedAt: iso(-50) });
  const seen = { a: iso(-30), b: iso(-50) };
  it('muda depois da última leitura', () => {
    expect(isUnread(a, seen)).toBe(true);
    expect(isUnread(b, seen)).toBe(false);
  });
  it('o chamado aberto nunca conta como não lido', () => {
    expect(isUnread(a, seen, 'a')).toBe(false);
    expect(countUnread([a, b], seen, 'a')).toBe(0);
    expect(countUnread([a, b], seen)).toBe(1);
  });
  it('sem registro de leitura conta como lido e seedSeen registra o histórico', () => {
    expect(isUnread(a, {})).toBe(false);
    expect(seedSeen([a, b], { a: 'x' })).toEqual({ a: 'x', b: b.updatedAt });
  });
});

describe('support: ordenação e filtros', () => {
  it('abertos primeiro, não lidos, prioridade, mais recente', () => {
    const list = [
      ticket({ id: 'closed', status: 'CLOSED', priority: 'CRITICAL', updatedAt: iso(-1) }),
      ticket({ id: 'normal-new', priority: 'NORMAL', updatedAt: iso(-2) }),
      ticket({ id: 'high', priority: 'HIGH', updatedAt: iso(-100) }),
      ticket({ id: 'normal-old', priority: 'NORMAL', updatedAt: iso(-300) }),
      ticket({ id: 'unread', priority: 'LOW', updatedAt: iso(-3) }),
    ];
    const seen = { unread: iso(-60) };
    expect(sortTickets(list, seen).map((t) => t.id)).toEqual(['unread', 'high', 'normal-new', 'normal-old', 'closed']);
  });
  it('não altera o array original', () => {
    const list = [ticket({ id: '1' }), ticket({ id: '2', priority: 'HIGH' })];
    sortTickets(list);
    expect(list.map((t) => t.id)).toEqual(['1', '2']);
  });
  it('filtros', () => {
    expect(matchesFilter(ticket({ id: 'x', status: 'RESOLVED' }), 'open')).toBe(false);
    expect(matchesFilter(ticket({ id: 'x', status: 'DUPLICATE' }), 'final')).toBe(true);
    expect(matchesFilter(ticket({ id: 'x' }), 'unassigned')).toBe(true);
    expect(matchesFilter(ticket({ id: 'x', assignedToUserId: 'u' }), 'unassigned')).toBe(false);
    expect(matchesFilter(ticket({ id: 'x', priority: 'HIGH' }), 'critical')).toBe(true);
  });
});

describe('support: linha do tempo', () => {
  const t = ticket({
    id: 't',
    messages: [
      { id: 'm2', message: 'nota', visibility: 'INTERNAL', createdAt: iso(-20) },
      { id: 'm1', message: 'oi', visibility: 'PUBLIC', createdAt: iso(-40), attachments: [{ id: 'a1', originalName: 'a.png', sizeBytes: 1 }] },
    ],
    events: [
      { id: 'e1', eventType: 'TICKET_CREATED', createdAt: iso(-50) },
      { id: 'e2', eventType: 'PUBLIC_REPLY', createdAt: iso(-40) },
    ],
    attachments: [
      { id: 'a1', originalName: 'a.png', sizeBytes: 1, createdAt: iso(-39) },
      { id: 'a2', originalName: 'b.pdf', sizeBytes: 1, createdAt: iso(-30) },
    ],
  });
  it('mistura mensagens, eventos e anexos soltos em ordem, sem nota interna por padrão', () => {
    expect(buildTimeline(t).map((i) => i.id)).toEqual(['e-e1', 'm-m1', 'a-a2']);
  });
  it('plataforma vê as notas internas', () => {
    const items = buildTimeline(t, { includeInternal: true });
    expect(items.map((i) => i.id)).toEqual(['e-e1', 'm-m1', 'a-a2', 'm-m2']);
    expect(items[3]).toMatchObject({ kind: 'message', internal: true });
  });
});
