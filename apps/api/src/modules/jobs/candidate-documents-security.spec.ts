import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { REQUIRED_MODULE_KEY } from '../../common/decorators/require-module.decorator';
import { RecruitmentDocumentsController } from './recruitment-documents.controller';
import { PublicCandidateDocumentsController } from './public-candidate-documents.controller';

const clam = vi.hoisted(() => ({ init: vi.fn(), scanStream: vi.fn() }));
vi.mock('clamscan', () => ({ default: class { init() { return clam.init(); } } }));

import { CandidateDocumentScanner } from './candidate-document-scanner.service';

const ENV = process.env.NODE_ENV;
afterEach(() => { process.env.NODE_ENV = ENV; clam.init.mockReset(); clam.scanStream.mockReset(); });

describe('ClamAV (falha fechada em producao)', () => {
  it('producao: scanner indisponivel bloqueia o envio', async () => {
    process.env.NODE_ENV = 'production';
    clam.init.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(new CandidateDocumentScanner().assertClean(Buffer.from('%PDF-1'))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('producao: erro durante o scan tambem bloqueia', async () => {
    process.env.NODE_ENV = 'production';
    clam.init.mockResolvedValue({ scanStream: clam.scanStream });
    clam.scanStream.mockRejectedValue(new Error('timeout'));
    await expect(new CandidateDocumentScanner().assertClean(Buffer.from('%PDF-1'))).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('arquivo infectado e recusado; limpo passa; fora de producao sem scanner nao bloqueia', async () => {
    process.env.NODE_ENV = 'production';
    clam.init.mockResolvedValue({ scanStream: clam.scanStream });
    clam.scanStream.mockResolvedValueOnce({ isInfected: true });
    await expect(new CandidateDocumentScanner().assertClean(Buffer.from('x'))).rejects.toBeInstanceOf(UnprocessableEntityException);
    clam.scanStream.mockResolvedValueOnce({ isInfected: false });
    await expect(new CandidateDocumentScanner().assertClean(Buffer.from('x'))).resolves.toBeUndefined();
    process.env.NODE_ENV = 'test';
    clam.init.mockRejectedValue(new Error('down'));
    await expect(new CandidateDocumentScanner().assertClean(Buffer.from('x'))).resolves.toBeUndefined();
  });
});

describe('perfis dos documentos de candidatura', () => {
  it('RH, RH_RS, ADMIN e DEV; nunca GESTOR/CONSULTA/FUNCIONARIO; exige o modulo recruitment', () => {
    const roles: string[] = Reflect.getMetadata(ROLES_KEY, RecruitmentDocumentsController);
    expect(roles).toEqual(['DEV', 'ADMIN', 'RH', 'RH_RS']);
    expect(Reflect.getMetadata(REQUIRED_MODULE_KEY, RecruitmentDocumentsController)).toBe('recruitment');
  });

  it('contratar continua fora do RH_RS e nenhuma rota de documentos cria funcionario', () => {
    const proto = RecruitmentDocumentsController.prototype as any;
    expect(Object.getOwnPropertyNames(proto).filter((n) => /hire|employee|admit/i.test(n))).toEqual([]);
  });

  it('rotas publicas nao usam guards de autenticacao (so o token)', () => {
    expect(Reflect.getMetadata('__guards__', PublicCandidateDocumentsController)).toBeUndefined();
  });
});