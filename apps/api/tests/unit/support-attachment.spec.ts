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

    it('deve rejeitar executavel pelo conteudo, mesmo com outro nome (ex: virus.pdf com cabecalho MZ)', async () => {
      const file = { size: 1024, originalname: 'virus.pdf', buffer: Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0x00]), Buffer.alloc(64, 1)]) };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('Tipo de arquivo nao permitido');
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('deve rejeitar arquivo compactado pelo conteudo (gzip/rar/7z)', async () => {
      const file = { size: 1024, originalname: 'relatorio.txt', buffer: Buffer.concat([Buffer.from([0x1f, 0x8b, 0x08, 0x00]), Buffer.alloc(64, 1)]) };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('Tipo de arquivo nao permitido');
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('deve rejeitar arquivo vazio', async () => {
      const file = { size: 0, originalname: 'vazio.pdf', buffer: Buffer.alloc(0) };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('vazio');
    });

    it('deve rejeitar PDF com script embutido', async () => {
      const file = { size: 1024, originalname: 'ativo.pdf', buffer: Buffer.from('%PDF-1.4\n1 0 obj << /JavaScript (app.alert(1)) >> endobj') };
      await expect(service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file))
        .rejects.toThrow('Arquivo recusado');
      expect(storageService.saveFile).not.toHaveBeenCalled();
    });

    it('o tipo real manda: texto chamado fake.pdf e guardado como texto, nunca como PDF', async () => {
      const file = { size: 1024, originalname: 'fake.pdf', buffer: Buffer.from('NOT A PDF FILE') };
      const result = await service.uploadAttachment({ sub: 'user-1' }, 'ticket-1', file);
      expect(result.status).toBe('QUARANTINED');
      expect(result.storageKey.endsWith('.txt')).toBe(true);
      expect(repository.createAttachment).toHaveBeenCalledWith(expect.objectContaining({
        declaredMimeType: 'text/plain',
        originalName: expect.not.stringMatching(/\.pdf$/i),
      }));
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
        .rejects.toThrow('bloqueado por motivos de seguranca');
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
