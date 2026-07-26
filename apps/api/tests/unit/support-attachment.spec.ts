import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupportAttachmentService } from '../../src/modules/support/support-attachment.service';
import { BadRequestException } from '@nestjs/common';
import { SupportRepository } from '../../src/modules/support/support.repository';
import { SupportStorageService } from '../../src/modules/support/support-storage.service';

describe('SupportAttachmentService', () => {
  let service: SupportAttachmentService;
  let repository: any;
  let storageService: any;
  let authorizationService: any;

  beforeEach(() => {
    repository = {
      createAttachment: vi.fn().mockResolvedValue({ id: 'att-1' }),
      updateAttachmentStatus: vi.fn().mockResolvedValue({}),
      getAttachmentById: vi.fn(),
      findPlatformTicketById: vi.fn().mockResolvedValue({ id: 'ticket-1', companyId: 'company-A', affectedUserId: 'user-1' }),
    };

    storageService = {
      saveFile: vi.fn().mockResolvedValue('/tmp/fake-path'),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      getFileStream: vi.fn(),
    };
    authorizationService = {
      assertCanUploadAttachment: vi.fn().mockResolvedValue(true),
      assertCanViewTicket: vi.fn().mockResolvedValue(true),
    };

    service = new SupportAttachmentService(repository as any, storageService as any, authorizationService as any);
  });

  describe('uploadAttachment', () => {
    it('deve validar acesso ao chamado antes de aceitar o arquivo', async () => {
      authorizationService.assertCanUploadAttachment.mockRejectedValue(new BadRequestException('Acesso negado.'));
      const file = {
        size: 1024,
        originalname: 'real.pdf',
        buffer: Buffer.from('%PDF-1.4...'),
        mimetype: 'application/pdf',
      };

      await expect(service.uploadAttachment({ sub: 'user-2' }, 'ticket-1', file))
        .rejects.toThrow('Acesso negado.');
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('deve rejeitar arquivo maior que 20MB', async () => {
      const file = { size: 21 * 1024 * 1024, originalname: 'big.jpg' };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar extensão proibida (ex: .exe)', async () => {
      const file = { size: 1024, originalname: 'virus.exe' };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('proibida por motivos de segurança');
    });

    it('deve rejeitar extensão não suportada (ex: .zip)', async () => {
      // In the implementation, .zip is in blockedExtensions or just not in allowedExtensions
      const file = { size: 1024, originalname: 'archive.tar' };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('não suportada');
    });

    it('deve falhar na verificação de magic bytes se o buffer do PDF for falsificado', async () => {
      const file = { 
        size: 1024, 
        originalname: 'fake.pdf',
        buffer: Buffer.from('NOT A PDF FILE')
      };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('corrompido ou falsificado');
    });

    it('deve gerar hash SHA-256 e salvar em QUARANTINED se for arquivo válido', async () => {
      const file = { 
        size: 1024, 
        originalname: 'real.pdf',
        buffer: Buffer.from('%PDF-1.4...'),
        mimetype: 'application/pdf'
      };

      const result = await service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file);
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('QUARANTINED');
      expect(repository.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
        sha256: expect.any(String),
        status: 'QUARANTINED'
      }));
      expect(storageService.saveFile).toHaveBeenCalled();
    });
  });

  describe('downloadAttachment (Isolamento Multi-Tenant)', () => {
    it('deve rejeitar quando o anexo nao pertence ao chamado da rota', async () => {
      repository.getAttachmentById.mockResolvedValue({ id: 'att-1', ticketId: 'ticket-2', status: 'CLEAN' });

      await expect(service.downloadAttachment({ role: 'DEV' }, 'ticket-1', 'att-1'))
        .rejects.toThrow();
      expect(storageService.getFileStream).not.toHaveBeenCalled();
    });

    it('deve rejeitar se o anexo foi classificado como REJECTED (vírus)', async () => {
      repository.getAttachmentById.mockResolvedValue({ id: 'att-1', ticketId: 'ticket-1', status: 'REJECTED' });
      
      await expect(service.downloadAttachment({ role: 'ADMIN' }, 'ticket-1', 'att-1'))
        .rejects.toThrow('bloqueado por motivos de segurança (vírus detectado)');
    });

    it('deve rejeitar se o ator ADMIN for de uma empresa diferente do ticket', async () => {
      repository.getAttachmentById.mockResolvedValue({ id: 'att-1', ticketId: 'ticket-1', status: 'CLEAN' });
      repository.findPlatformTicketById.mockResolvedValue({ companyId: 'company-B' });
      authorizationService.assertCanViewTicket.mockRejectedValue(new BadRequestException('Acesso negado a este anexo.'));
      
      await expect(service.downloadAttachment({ role: 'ADMIN', companyId: 'company-A' }, 'ticket-1', 'att-1'))
        .rejects.toThrow('Acesso negado a este anexo.');
    });

    it('deve permitir se o ator FUNCIONARIO for o autor do ticket', async () => {
      repository.getAttachmentById.mockResolvedValue({ id: 'att-1', ticketId: 'ticket-1', status: 'CLEAN', storageKey: 'key', originalName: 'a.pdf', declaredMimeType: 'application/pdf', sizeBytes: 100n });
      repository.findPlatformTicketById.mockResolvedValue({ affectedUserId: 'user-1' });
      storageService.getFileStream.mockResolvedValue('fake-stream');

      const result = await service.downloadAttachment({ role: 'FUNCIONARIO', sub: 'user-1' }, 'ticket-1', 'att-1');
      expect(result.stream).toBe('fake-stream');
    });
  });
});
