import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentService } from '../../src/modules/documents/document.service';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('DocumentService', () => {
  let service: DocumentService;
  let prisma: any;
  let storageService: any;

  beforeEach(() => {
    prisma = {
      generatedDocument: {
        create: vi.fn().mockImplementation((args) => Promise.resolve({ id: 'doc-123', ...args.data })),
        findUnique: vi.fn(),
      }
    };

    storageService = {
      saveFile: vi.fn().mockResolvedValue('/tmp/fake.pdf'),
      getFileStream: vi.fn(),
    };

    service = new DocumentService(prisma as any, storageService as any);
  });

  describe('generateDocument', () => {
    it('deve gerar PDF, calcular SHA-256 e criar registro imutável no banco', async () => {
      const buildPdf = (doc: any) => {
        doc.text('Relatório Teste');
      };

      const result = await service.generateDocument('company-1', 'REPORT', 'Meu Relatorio', buildPdf, 'user-1');
      
      expect(result.id).toBe('doc-123');
      expect(result.sha256).toBeDefined();
      expect(result.storageKey).toContain('docs/company-1/');
      
      expect(prisma.generatedDocument.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          companyId: 'company-1',
          type: 'REPORT',
          sha256: result.sha256
        })
      }));
    });
  });

  describe('getDocumentStream (Isolamento Multi-Tenant)', () => {
    it('deve permitir acesso se ator for DEV, mesmo de outra empresa', async () => {
      prisma.generatedDocument.findUnique.mockResolvedValue({ id: 'doc-1', companyId: 'company-B', storageKey: 'key' });
      storageService.getFileStream.mockResolvedValue('stream');

      const result = await service.getDocumentStream({ role: 'DEV', companyId: 'company-A' }, 'doc-1');
      expect(result.stream).toBe('stream');
    });

    it('deve bloquear acesso se ator não for DEV e for de outra empresa', async () => {
      prisma.generatedDocument.findUnique.mockResolvedValue({ id: 'doc-1', companyId: 'company-B', storageKey: 'key' });
      
      await expect(service.getDocumentStream({ role: 'ADMIN', companyId: 'company-A' }, 'doc-1'))
        .rejects.toThrow('Acesso negado a este documento');
    });

    it('deve permitir acesso se ator for da mesma empresa do documento', async () => {
      prisma.generatedDocument.findUnique.mockResolvedValue({ id: 'doc-1', companyId: 'company-A', storageKey: 'key' });
      storageService.getFileStream.mockResolvedValue('stream');

      const result = await service.getDocumentStream({ role: 'ADMIN', companyId: 'company-A' }, 'doc-1');
      expect(result.stream).toBe('stream');
    });
  });
});
