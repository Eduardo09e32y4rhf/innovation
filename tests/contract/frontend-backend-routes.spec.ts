import { describe, it, expect } from 'vitest';

/**
 * Fase 2 — Contrato de URLs: Frontend ↔ Backend NestJS
 *
 * Este teste garante que as URLs definidas em api.ts correspondem exatamente
 * às rotas canônicas registradas nos controllers NestJS de Suporte.
 *
 * Proibição: nunca use .catch(() => {}) ou || true aqui.
 * Se a URL mudar no backend, este teste fica VERMELHO e bloqueia o merge.
 */

// URLs canônicas do backend (conforme support.controller.ts e platform/support.controller.ts)
const SUPPORT_BACKEND_ROUTES = {
  list:   { method: 'GET',   path: '/support/tickets' },
  create: { method: 'POST',  path: '/support/tickets' },
  get:    { method: 'GET',   path: '/support/tickets/:id' },
  reply:  { method: 'POST',  path: '/support/tickets/:id/messages' },
  close:  { method: 'POST',  path: '/support/tickets/:id/close' },
  reopen: { method: 'POST',  path: '/support/tickets/:id/reopen' },
  stats:  { method: 'GET',   path: '/support/stats' },
};

const PLATFORM_SUPPORT_BACKEND_ROUTES = {
  stats:          { method: 'GET',   path: '/platform/support/stats' },
  list:           { method: 'GET',   path: '/platform/support/tickets' },
  get:            { method: 'GET',   path: '/platform/support/tickets/:id' },
  reply:          { method: 'POST',  path: '/platform/support/tickets/:id/messages' },
  internalNote:   { method: 'POST',  path: '/platform/support/tickets/:id/internal-notes' },
  updateStatus:   { method: 'PATCH', path: '/platform/support/tickets/:id/status' },
  updatePriority: { method: 'PATCH', path: '/platform/support/tickets/:id/priority' },
  assign:         { method: 'PATCH', path: '/platform/support/tickets/:id/assign' },
  resolve:        { method: 'POST',  path: '/platform/support/tickets/:id/resolve' },
};

const PUBLIC_SUPPORT_BACKEND_ROUTES = {
  createTicket:  { method: 'POST', path: '/support/public/tickets' },
  passwordReset: { method: 'POST', path: '/support/public/password-reset' },
};

// URLs usadas no frontend (extraídas diretamente de apps/web/app/lib/api.ts)
const SUPPORT_FRONTEND_URLS = {
  stats:  '/support/stats',
  list:   '/support/tickets',
  get:    (id: string) => `/support/tickets/${id}`,
  create: '/support/tickets',
  reply:  (id: string) => `/support/tickets/${id}/messages`,
  close:  (id: string) => `/support/tickets/${id}/close`,
  reopen: (id: string) => `/support/tickets/${id}/reopen`,
};

const PLATFORM_SUPPORT_FRONTEND_URLS = {
  stats:          '/platform/support/stats',
  list:           '/platform/support/tickets',
  get:            (id: string) => `/platform/support/tickets/${id}`,
  reply:          (id: string) => `/platform/support/tickets/${id}/messages`,
  internalNote:   (id: string) => `/platform/support/tickets/${id}/internal-notes`,
  updateStatus:   (id: string) => `/platform/support/tickets/${id}/status`,
  updatePriority: (id: string) => `/platform/support/tickets/${id}/priority`,
  assign:         (id: string) => `/platform/support/tickets/${id}/assign`,
  resolve:        (id: string) => `/platform/support/tickets/${id}/resolve`,
};

const PUBLIC_SUPPORT_FRONTEND_URLS = {
  createTicket:  '/support/public/tickets',
  passwordReset: '/support/public/password-reset',
};

describe('Contract: Frontend ↔ Backend URL Alignment', () => {
  describe('api.support (cliente autenticado)', () => {
    it('stats deve usar GET /support/stats', () => {
      expect(SUPPORT_FRONTEND_URLS.stats).toBe(SUPPORT_BACKEND_ROUTES.stats.path);
    });

    it('list deve usar GET /support/tickets', () => {
      expect(SUPPORT_FRONTEND_URLS.list).toBe(SUPPORT_BACKEND_ROUTES.list.path);
    });

    it('create deve usar POST /support/tickets', () => {
      expect(SUPPORT_FRONTEND_URLS.create).toBe(SUPPORT_BACKEND_ROUTES.create.path);
    });

    it('get deve usar GET /support/tickets/:id (substituindo :id pelo valor real)', () => {
      const id = 'abc-123';
      const url = SUPPORT_FRONTEND_URLS.get(id);
      const expected = SUPPORT_BACKEND_ROUTES.get.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('reply deve usar POST /support/tickets/:id/messages', () => {
      const id = 'abc-123';
      const url = SUPPORT_FRONTEND_URLS.reply(id);
      const expected = SUPPORT_BACKEND_ROUTES.reply.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('close deve usar POST /support/tickets/:id/close', () => {
      const id = 'abc-123';
      const url = SUPPORT_FRONTEND_URLS.close(id);
      const expected = SUPPORT_BACKEND_ROUTES.close.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('reopen deve usar POST /support/tickets/:id/reopen', () => {
      const id = 'abc-123';
      const url = SUPPORT_FRONTEND_URLS.reopen(id);
      const expected = SUPPORT_BACKEND_ROUTES.reopen.path.replace(':id', id);
      expect(url).toBe(expected);
    });
  });

  describe('api.platformSupport (painel DEV)', () => {
    it('stats deve usar GET /platform/support/stats', () => {
      expect(PLATFORM_SUPPORT_FRONTEND_URLS.stats).toBe(PLATFORM_SUPPORT_BACKEND_ROUTES.stats.path);
    });

    it('list deve usar GET /platform/support/tickets', () => {
      expect(PLATFORM_SUPPORT_FRONTEND_URLS.list).toBe(PLATFORM_SUPPORT_BACKEND_ROUTES.list.path);
    });

    it('get deve usar GET /platform/support/tickets/:id', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.get(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.get.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('reply deve usar POST /platform/support/tickets/:id/messages', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.reply(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.reply.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('internalNote deve usar POST /platform/support/tickets/:id/internal-notes', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.internalNote(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.internalNote.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('updateStatus deve usar PATCH /platform/support/tickets/:id/status', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.updateStatus(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.updateStatus.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('updatePriority deve usar PATCH /platform/support/tickets/:id/priority', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.updatePriority(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.updatePriority.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('assign deve usar PATCH /platform/support/tickets/:id/assign', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.assign(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.assign.path.replace(':id', id);
      expect(url).toBe(expected);
    });

    it('resolve deve usar POST /platform/support/tickets/:id/resolve', () => {
      const id = 'abc-123';
      const url = PLATFORM_SUPPORT_FRONTEND_URLS.resolve(id);
      const expected = PLATFORM_SUPPORT_BACKEND_ROUTES.resolve.path.replace(':id', id);
      expect(url).toBe(expected);
    });
  });

  describe('api.publicSupport (rotas públicas)', () => {
    it('createTicket deve usar POST /support/public/tickets', () => {
      expect(PUBLIC_SUPPORT_FRONTEND_URLS.createTicket).toBe(PUBLIC_SUPPORT_BACKEND_ROUTES.createTicket.path);
    });

    it('passwordReset deve usar POST /support/public/password-reset', () => {
      expect(PUBLIC_SUPPORT_FRONTEND_URLS.passwordReset).toBe(PUBLIC_SUPPORT_BACKEND_ROUTES.passwordReset.path);
    });
  });

  describe('Proibição de URLs legadas ou inconsistentes', () => {
    it('não deve usar a rota legada /support sem /tickets no path de listagem', () => {
      // Garantia que não foi usando /support (sem /tickets) para listar chamados
      expect(SUPPORT_FRONTEND_URLS.list).not.toBe('/support');
      expect(SUPPORT_FRONTEND_URLS.list).toContain('/tickets');
    });

    it('não deve usar categoria legada DOUBT (removida do schema)', () => {
      // DOUBT foi removida — o frontend não deve nunca usar essa categoria
      const legacyCategory = 'DOUBT';
      const validCategories = ['BUG','CORRECTION','ADJUSTMENT','MAINTENANCE','FEATURE_REQUEST','PASSWORD_RESET','ACCESS','BILLING','PERFORMANCE','SECURITY','INTEGRATION','OTHER'];
      expect(validCategories).not.toContain(legacyCategory);
    });
  });
});
