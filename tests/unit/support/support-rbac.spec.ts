import { describe, it, expect } from 'vitest';

/**
 * Fase 3 — Testes de Regras de Acesso ao Suporte (RBAC)
 *
 * Cobre as regras oficiais:
 *   ADMIN:     abre e acompanha chamados da empresa
 *   RH:        abre e acompanha chamados da empresa
 *   GESTOR:    abre para si ou funcionário diretamente subordinado
 *   FUNCIONARIO: não abre chamado; vê apenas seus próprios
 *   CONSULTA:  somente visualiza o que estiver autorizado
 *   COMERCIAL: não acessa painel técnico DEV
 *   DEV:       administra todos os chamados
 */

// Simulação pura das regras — sem banco, sem rede
type Role = 'DEV' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

interface Actor {
  id: string;
  role: Role;
  companyId: string;
  managedEmployeeIds?: string[]; // IDs de subordinados diretos do GESTOR
}

interface Ticket {
  id: string;
  companyId: string;
  createdByUserId: string;
  affectedUserId?: string;
  category: string;
  visibility: 'CLIENT' | 'DEV';
}

// Lógica de autorização (espelho das regras do backend)
function canCreateTicket(actor: Actor, affectedUserId?: string): { allowed: boolean; reason: string } {
  if (actor.role === 'DEV') return { allowed: true, reason: 'DEV pode tudo' };
  if (actor.role === 'FUNCIONARIO') return { allowed: false, reason: 'FUNCIONARIO não pode abrir chamados' };
  if (actor.role === 'CONSULTA') return { allowed: false, reason: 'CONSULTA não pode criar chamados' };
  if (actor.role === 'COMERCIAL') return { allowed: false, reason: 'COMERCIAL não acessa suporte técnico' };
  if (actor.role === 'ADMIN' || actor.role === 'RH') return { allowed: true, reason: 'ADMIN/RH pode abrir chamados da empresa' };
  if (actor.role === 'GESTOR') {
    if (!affectedUserId) return { allowed: true, reason: 'GESTOR abre para si' };
    const isSubordinate = actor.managedEmployeeIds?.includes(affectedUserId);
    if (isSubordinate) return { allowed: true, reason: 'GESTOR abre para subordinado direto' };
    return { allowed: false, reason: 'GESTOR não pode abrir para funcionário fora de sua equipe' };
  }
  return { allowed: false, reason: 'Papel desconhecido' };
}

function canViewTicket(actor: Actor, ticket: Ticket): { allowed: boolean; reason: string } {
  if (actor.role === 'DEV') return { allowed: true, reason: 'DEV vê todos' };
  if (actor.role === 'COMERCIAL') return { allowed: false, reason: 'COMERCIAL não acessa suporte técnico' };
  // Isolamento de tenant — nunca vê ticket de outra empresa
  if (ticket.companyId !== actor.companyId) {
    return { allowed: false, reason: 'Ticket pertence a outro tenant' };
  }
  if (actor.role === 'ADMIN' || actor.role === 'RH') {
    return { allowed: true, reason: 'ADMIN/RH vê todos os tickets da empresa' };
  }
  if (actor.role === 'FUNCIONARIO') {
    const isOwn = ticket.createdByUserId === actor.id || ticket.affectedUserId === actor.id;
    return isOwn
      ? { allowed: true, reason: 'FUNCIONARIO vê seu próprio ticket' }
      : { allowed: false, reason: 'FUNCIONARIO não vê tickets de colegas' };
  }
  return { allowed: true, reason: 'Acesso permitido' };
}

function canViewInternalNote(actor: Actor): { allowed: boolean; reason: string } {
  if (actor.role === 'DEV') return { allowed: true, reason: 'DEV vê notas internas' };
  return { allowed: false, reason: 'Apenas DEV pode ver notas internas' };
}

function canAccessDevPanel(actor: Actor): { allowed: boolean; reason: string } {
  if (actor.role === 'DEV') return { allowed: true, reason: 'DEV acessa o painel técnico' };
  return { allowed: false, reason: `${actor.role} não tem acesso ao painel DEV` };
}

// Fixtures
const COMPANY_A = 'company-A';
const COMPANY_B = 'company-B';

const actorDev: Actor = { id: 'dev-1', role: 'DEV', companyId: 'platform' };
const actorAdmin: Actor = { id: 'admin-1', role: 'ADMIN', companyId: COMPANY_A };
const actorRH: Actor = { id: 'rh-1', role: 'RH', companyId: COMPANY_A };
const actorGestor: Actor = { id: 'gestor-1', role: 'GESTOR', companyId: COMPANY_A, managedEmployeeIds: ['func-1'] };
const actorFuncionario: Actor = { id: 'func-1', role: 'FUNCIONARIO', companyId: COMPANY_A };
const actorFuncionario2: Actor = { id: 'func-2', role: 'FUNCIONARIO', companyId: COMPANY_A };
const actorComercial: Actor = { id: 'comercial-1', role: 'COMERCIAL', companyId: 'platform' };
const actorAdminB: Actor = { id: 'admin-b-1', role: 'ADMIN', companyId: COMPANY_B };

const ticketCompanyA: Ticket = { id: 'tkt-a1', companyId: COMPANY_A, createdByUserId: 'func-1', category: 'OTHER', visibility: 'CLIENT' };
const ticketCompanyB: Ticket = { id: 'tkt-b1', companyId: COMPANY_B, createdByUserId: 'admin-b-1', category: 'OTHER', visibility: 'CLIENT' };
const ticketFunc2: Ticket = { id: 'tkt-a2', companyId: COMPANY_A, createdByUserId: 'func-2', category: 'OTHER', visibility: 'CLIENT' };

describe('Regras de Acesso ao Suporte (RBAC)', () => {
  describe('canCreateTicket', () => {
    it('ADMIN pode abrir chamado → 201', () => {
      const result = canCreateTicket(actorAdmin);
      expect(result.allowed).toBe(true);
    });

    it('RH pode abrir chamado → 201', () => {
      const result = canCreateTicket(actorRH);
      expect(result.allowed).toBe(true);
    });

    it('GESTOR abre para subordinado direto → 201', () => {
      const result = canCreateTicket(actorGestor, 'func-1');
      expect(result.allowed).toBe(true);
    });

    it('GESTOR abre para funcionário de outro gestor → 403', () => {
      const result = canCreateTicket(actorGestor, 'func-99-outro-gestor');
      expect(result.allowed).toBe(false);
    });

    it('FUNCIONARIO tenta abrir chamado → 403', () => {
      const result = canCreateTicket(actorFuncionario);
      expect(result.allowed).toBe(false);
    });

    it('COMERCIAL tenta abrir chamado de suporte técnico → 403', () => {
      const result = canCreateTicket(actorComercial);
      expect(result.allowed).toBe(false);
    });

    it('DEV pode abrir qualquer chamado → 201', () => {
      const result = canCreateTicket(actorDev);
      expect(result.allowed).toBe(true);
    });
  });

  describe('canViewTicket — isolamento de tenant', () => {
    it('ADMIN vê ticket da sua empresa → autorizado', () => {
      const result = canViewTicket(actorAdmin, ticketCompanyA);
      expect(result.allowed).toBe(true);
    });

    it('ADMIN empresa A não vê ticket da empresa B → 403', () => {
      const result = canViewTicket(actorAdmin, ticketCompanyB);
      expect(result.allowed).toBe(false);
    });

    it('ADMIN empresa B não vê ticket da empresa A → 403', () => {
      const result = canViewTicket(actorAdminB, ticketCompanyA);
      expect(result.allowed).toBe(false);
    });

    it('FUNCIONARIO vê seu próprio ticket → autorizado', () => {
      const result = canViewTicket(actorFuncionario, ticketCompanyA); // criado por func-1
      expect(result.allowed).toBe(true);
    });

    it('FUNCIONARIO não vê ticket de colega → 403', () => {
      const result = canViewTicket(actorFuncionario, ticketFunc2); // criado por func-2
      expect(result.allowed).toBe(false);
    });

    it('DEV vê ticket de qualquer empresa → autorizado', () => {
      const resultA = canViewTicket(actorDev, ticketCompanyA);
      const resultB = canViewTicket(actorDev, ticketCompanyB);
      expect(resultA.allowed).toBe(true);
      expect(resultB.allowed).toBe(true);
    });

    it('COMERCIAL não acessa painel de suporte técnico → 403', () => {
      const result = canViewTicket(actorComercial, ticketCompanyA);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canViewInternalNote', () => {
    it('DEV vê notas internas → autorizado', () => {
      const result = canViewInternalNote(actorDev);
      expect(result.allowed).toBe(true);
    });

    it('ADMIN não vê nota interna → bloqueado', () => {
      const result = canViewInternalNote(actorAdmin);
      expect(result.allowed).toBe(false);
    });

    it('RH não vê nota interna → bloqueado', () => {
      const result = canViewInternalNote(actorRH);
      expect(result.allowed).toBe(false);
    });

    it('FUNCIONARIO não vê nota interna → bloqueado', () => {
      const result = canViewInternalNote(actorFuncionario);
      expect(result.allowed).toBe(false);
    });
  });

  describe('canAccessDevPanel', () => {
    it('DEV acessa painel técnico → autorizado', () => {
      const result = canAccessDevPanel(actorDev);
      expect(result.allowed).toBe(true);
    });

    it('COMERCIAL não acessa painel DEV → 403', () => {
      const result = canAccessDevPanel(actorComercial);
      expect(result.allowed).toBe(false);
    });

    it('ADMIN não acessa painel DEV → 403', () => {
      const result = canAccessDevPanel(actorAdmin);
      expect(result.allowed).toBe(false);
    });

    it('RH não acessa painel DEV → 403', () => {
      const result = canAccessDevPanel(actorRH);
      expect(result.allowed).toBe(false);
    });

    it('FUNCIONARIO não acessa painel DEV → 403', () => {
      const result = canAccessDevPanel(actorFuncionario);
      expect(result.allowed).toBe(false);
    });
  });
});
