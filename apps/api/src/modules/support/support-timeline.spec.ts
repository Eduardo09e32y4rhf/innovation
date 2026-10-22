import { describe, expect, it } from 'vitest';
import { buildTimeline } from './support-timeline';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 21, 13, minutes));

const ticket = () => ({
  events: [
    { id: 'e3', eventType: 'STATUS_CHANGED', createdAt: at(30), previousValue: { status: 'NEW' }, newValue: { status: 'IN_PROGRESS' }, actor: { name: 'Suporte' } },
    { id: 'e1', eventType: 'TICKET_CREATED', createdAt: at(0), actor: { name: 'Ana' } },
    { id: 'e2', eventType: 'PUBLIC_REPLY', createdAt: at(20), actor: { name: 'Suporte' } },
    { id: 'e4', eventType: 'INTERNAL_NOTE', createdAt: at(25), actor: { name: 'Suporte' } },
    { id: 'e5', eventType: 'PRIORITY_CHANGED', createdAt: at(31), previousValue: { priority: 'NORMAL' }, newValue: { priority: 'CRITICAL' } },
  ],
  messages: [
    { id: 'm1', visibility: 'PUBLIC', message: 'Estamos verificando.', createdAt: at(20), author: { name: 'Suporte', role: 'DEV' } },
    { id: 'm2', visibility: 'INTERNAL', message: 'Parece bug do cache.', createdAt: at(25), author: { name: 'Suporte', role: 'DEV' } },
  ],
  attachments: [
    { id: 'a1', originalName: 'print.png', status: 'CLEAN', createdAt: at(5) },
    { id: 'a2', originalName: 'virus.exe', status: 'REJECTED', createdAt: at(6) },
  ],
});

describe('historico completo do chamado', () => {
  it('fica em ordem cronologica, da abertura em diante', () => {
    const labels = buildTimeline(ticket(), { includeInternal: true }).map((entry) => entry.label);
    expect(labels).toEqual(['Chamado aberto', 'Anexo enviado', 'Resposta', 'Nota interna', 'Situação alterada', 'Prioridade alterada']);
  });

  it('cliente nao ve nota interna', () => {
    const entries = buildTimeline(ticket(), { includeInternal: false });
    expect(entries.some((entry) => entry.visibility === 'INTERNAL')).toBe(false);
    expect(JSON.stringify(entries)).not.toContain('cache');
  });

  it('mudanca de status e prioridade mostram de -> para em portugues', () => {
    const entries = buildTimeline(ticket(), { includeInternal: false });
    expect(entries.find((entry) => entry.label === 'Situação alterada')?.detail).toBe('Aberto → Em andamento');
    expect(entries.find((entry) => entry.label === 'Prioridade alterada')?.detail).toBe('Normal → Crítica');
  });

  it('resposta nao aparece duplicada (evento PUBLIC_REPLY e a mensagem sao a mesma coisa)', () => {
    const replies = buildTimeline(ticket(), { includeInternal: true }).filter((entry) => entry.label === 'Resposta');
    expect(replies).toHaveLength(1);
    expect(replies[0].detail).toBe('Estamos verificando.');
  });

  it('anexo recusado nao entra no historico', () => {
    expect(JSON.stringify(buildTimeline(ticket(), { includeInternal: true }))).not.toContain('virus.exe');
  });

  it('chamado sem nada ainda devolve lista vazia', () => {
    expect(buildTimeline({}, { includeInternal: false })).toEqual([]);
  });
});
