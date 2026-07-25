import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SupportTicketCategory, SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import { CreateSupportTicketDto } from '../../apps/api/src/modules/support/dto/create-support-ticket.dto';
import { CreatePublicSupportTicketDto } from '../../apps/api/src/modules/support/dto/create-public-support-ticket.dto';
import { ListSupportTicketsQueryDto } from '../../apps/api/src/modules/support/dto/list-support-tickets-query.dto';

describe('Support Contract Validation (Frontend & Backend)', () => {
  describe('Enums Alignment', () => {
    it('should contain all expected SupportTicketCategory values used by client and platform frontend', () => {
      const expectedCategories = [
        'BUG',
        'CORRECTION',
        'ADJUSTMENT',
        'MAINTENANCE',
        'FEATURE_REQUEST',
        'PASSWORD_RESET',
        'ACCESS',
        'BILLING',
        'PERFORMANCE',
        'SECURITY',
        'INTEGRATION',
        'OTHER',
      ];
      expectedCategories.forEach((cat) => {
        expect(Object.values(SupportTicketCategory)).toContain(cat);
      });
    });

    it('should contain all expected SupportTicketStatus values used by client and platform frontend', () => {
      const expectedStatuses = [
        'NEW',
        'TRIAGE',
        'IN_PROGRESS',
        'WAITING_CUSTOMER',
        'WAITING_DEPLOY',
        'RESOLVED',
        'CLOSED',
      ];
      expectedStatuses.forEach((status) => {
        expect(Object.values(SupportTicketStatus)).toContain(status);
      });
    });

    it('should contain all expected SupportTicketPriority values used by client and platform frontend', () => {
      const expectedPriorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
      expectedPriorities.forEach((priority) => {
        expect(Object.values(SupportTicketPriority)).toContain(priority);
      });
    });
  });

  describe('CreateSupportTicketDto Contract', () => {
    it('should pass validation when valid category and fields are provided from frontend form', async () => {
      const dto = plainToInstance(CreateSupportTicketDto, {
        category: SupportTicketCategory.OTHER,
        title: 'Dúvida sobre uso ou funcionalidade',
        description: 'Como exportar o relatório mensal de ponto espelho para contabilidade?',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when invalid category (like legacy DOUBT) is passed', async () => {
      const dto = plainToInstance(CreateSupportTicketDto, {
        category: 'DOUBT' as any,
        title: 'Título de teste',
        description: 'Descrição de teste com caracteres suficientes',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('category');
    });
  });

  describe('CreatePublicSupportTicketDto Contract', () => {
    it('should pass validation when valid public form fields are provided', async () => {
      const dto = plainToInstance(CreatePublicSupportTicketDto, {
        name: 'Cliente Teste',
        email: 'cliente@empresa.com',
        category: SupportTicketCategory.ACCESS,
        subject: 'Problema no Login ou Senha',
        description: 'Não estou conseguindo entrar na minha conta corporativa com minha senha atual.',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when invalid email or category is provided', async () => {
      const dto = plainToInstance(CreatePublicSupportTicketDto, {
        name: 'Cliente Teste',
        email: 'email-invalido',
        category: 'LOGIN_ISSUE' as any,
        subject: 'Assunto curto',
        description: 'Descrição',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const props = errors.map((e) => e.property);
      expect(props).toContain('email');
      expect(props).toContain('category');
    });
  });

  describe('ListSupportTicketsQueryDto Contract', () => {
    it('should pass validation when status, category and priority filters match valid enums', async () => {
      const dto = plainToInstance(ListSupportTicketsQueryDto, {
        status: SupportTicketStatus.NEW,
        priority: SupportTicketPriority.HIGH,
        category: SupportTicketCategory.BILLING,
        search: 'termo de busca',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
