import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { JwtUser } from '../../common/types/auth.types';
import { EmployeeDocumentsService } from './employee-documents.service';

const actor: JwtUser = {
  sub: 'user-1',
  email: 'rh@empresa.com.br',
  name: 'Responsavel RH',
  companyId: 'company-1',
  role: 'RH',
};

function createService(documentData: any = null) {
  const repository = {
    getOfficialDocumentData: vi.fn().mockResolvedValue(documentData),
  };
  const documents = {
    generateDocument: vi.fn().mockResolvedValue({
      id: 'document-1',
      storageKey: 'docs/company-1/document.pdf',
      sha256: 'abc123',
    }),
    getDocumentStream: vi.fn().mockResolvedValue({
      stream: { pipe: vi.fn() },
      filename: 'stored.pdf',
      size: 2048,
    }),
  };
  const service = new EmployeeDocumentsService(repository as any, documents as any);
  return { service, repository, documents };
}

describe('EmployeeDocumentsService', () => {
  it('gera espelho de ponto persistido com periodo oficial e hash', async () => {
    const { service, repository, documents } = createService({
      company: { name: 'Empresa Teste' },
      employee: { id: 'employee-1', name: 'Maria da Silva' },
      manager: null,
      timeTracks: [],
      occurrences: [],
      closing: null,
    });

    const result = await service.generate('company-1', actor, 'employee-1', 'POINT_SHEET', '2026-07');

    expect(repository.getOfficialDocumentData).toHaveBeenCalledWith(
      'company-1',
      'employee-1',
      expect.objectContaining({
        start: new Date('2026-07-01T00:00:00.000Z'),
        end: new Date('2026-07-31T23:59:59.999Z'),
      }),
    );
    expect(documents.generateDocument).toHaveBeenCalledWith(
      'company-1',
      'REPORT',
      expect.stringContaining('Espelho de ponto - Maria da Silva'),
      expect.any(Function),
      'user-1',
    );
    expect(documents.getDocumentStream).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-1', role: 'RH' }),
      'document-1',
    );
    expect(result).toMatchObject({
      filename: 'espelho-ponto-maria-da-silva-2026-07.pdf',
      documentId: 'document-1',
      sha256: 'abc123',
      version: 'EMPLOYEE_DOCS_2026_1',
      size: 2048,
    });
  });

  it('gera ficha de registro sem consultar periodo de ponto', async () => {
    const { service, repository } = createService({
      company: { name: 'Empresa Teste' },
      employee: { id: 'employee-1', name: 'Joao Souza' },
      manager: null,
      timeTracks: [],
      occurrences: [],
      closing: null,
    });

    const result = await service.generate('company-1', actor, 'employee-1', 'EMPLOYEE_RECORD');

    expect(repository.getOfficialDocumentData).toHaveBeenCalledWith('company-1', 'employee-1', undefined);
    expect(result.filename).toBe('ficha-registro-joao-souza.pdf');
  });

  it('rejeita competencia invalida antes de consultar dados', async () => {
    const { service, repository } = createService();

    await expect(
      service.generate('company-1', actor, 'employee-1', 'OCCURRENCES', '07/2026'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.getOfficialDocumentData).not.toHaveBeenCalled();
  });

  it('nao gera documento de funcionario fora do tenant', async () => {
    const { service, documents } = createService(null);

    await expect(
      service.generate('company-1', actor, 'employee-inexistente', 'EMPLOYEE_RECORD'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(documents.generateDocument).not.toHaveBeenCalled();
  });
});
