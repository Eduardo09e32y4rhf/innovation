import { describe, expect, it, vi } from 'vitest';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ALLOW } from '../../common/utils/file-validation';
import { CONTRACT_KITS, DOC_TYPE_RULES, contractKitKey, docTypeForLabel, kitFor, normalizeRequiredDocuments, resolveRequiredDocuments, validateApproval } from './recruitment-doc-types';
import { RecruitmentDocumentsService } from './recruitment-documents.service';
import { detectDocumentType, hireKitFor } from './recruitment-documents.rules';

const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP'), Buffer.from('VP8 '), Buffer.alloc(32)]);

describe('tipos de documento (RS-D-16)', () => {
  it('reconhece o tipo pelo rotulo do catalogo', () => {
    expect(docTypeForLabel('RG ou CNH')).toBe('IDENTIDADE');
    expect(docTypeForLabel('CNH categoria exigida pela vaga')).toBe('CNH');
    expect(docTypeForLabel('Diploma')).toBe('DIPLOMA');
    expect(docTypeForLabel('ASO admissional (atestado de saúde)')).toBe('ASO');
    expect(docTypeForLabel('Certidão de antecedentes criminais')).toBe('ANTECEDENTES');
    expect(docTypeForLabel('Cartão de vacinação (adulto)')).toBe('VACINA');
    expect(docTypeForLabel('Certidão negativa de débitos federais')).toBe('CERTIDAO');
    expect(docTypeForLabel('Foto 3x4')).toBe('FOTO');
    expect(docTypeForLabel('Qualquer coisa nova')).toBe('OUTRO');
  });
  it('diploma/escolaridade aceitam WEBP (ALLOW.CERTIFICATE); documento comum nao; foto nao aceita PDF', () => {
    expect(DOC_TYPE_RULES.DIPLOMA.formats).toBe(ALLOW.CERTIFICATE);
    expect(detectDocumentType(webp, DOC_TYPE_RULES.DIPLOMA.formats)).not.toBeNull();
    expect(detectDocumentType(webp, DOC_TYPE_RULES.IDENTIDADE.formats)).toBeNull();
    expect(detectDocumentType(pdf, DOC_TYPE_RULES.FOTO.formats)).toBeNull();
  });
  it('ASO, antecedentes e vacina sao sensiveis, com base legal registrada; CNH, ASO e certidoes pedem vencimento', () => {
    for (const t of ['ASO', 'ANTECEDENTES', 'VACINA'] as const) { expect(DOC_TYPE_RULES[t].sensitive).toBe(true); expect(DOC_TYPE_RULES[t].legalBasis).toMatch(/LGPD/); }
    expect(DOC_TYPE_RULES.IDENTIDADE.sensitive).toBe(false);
    for (const t of ['CNH', 'ASO', 'CERTIDAO', 'ANTECEDENTES'] as const) expect(DOC_TYPE_RULES[t].requiresExpiry).toBe(true);
  });
  it('aprovar exige vencimento quando o tipo pede e recusa documento vencido', () => {
    const now = new Date('2026-11-10T12:00:00');
    expect(validateApproval({ docType: 'CNH', now })).toMatch(/vencimento/);
    expect(validateApproval({ docType: 'CNH', expiresAt: new Date('2026-11-01T00:00:00'), now })).toMatch(/vencido/);
    expect(validateApproval({ docType: 'CNH', expiresAt: new Date('2027-01-01T00:00:00'), now })).toBeNull();
    expect(validateApproval({ docType: 'IDENTIDADE', now })).toBeNull();
  });
});

describe('kits por contrato e lista da vaga (RS-D-09)', () => {
  it('escolhe o kit pelo tipo de contrato', () => {
    expect(contractKitKey('CLT')).toBe('CLT');
    expect(contractKitKey('PJ')).toBe('PJ');
    expect(contractKitKey('Prestação de serviços')).toBe('PJ');
    expect(contractKitKey('Estágio')).toBe('ESTAGIO');
    expect(contractKitKey('Jovem Aprendiz')).toBe('APRENDIZ');
    expect(contractKitKey('Temporário')).toBe('TEMPORARIO');
    expect(contractKitKey(null)).toBe('CLT');
    expect(kitFor('Estágio')).toEqual([...CONTRACT_KITS.ESTAGIO]);
    expect(hireKitFor('aprendiz')).toContain('Documento do responsável legal');
  });
  it('a lista configurada na vaga vence o kit; vazia usa o kit; normaliza e remove repetidos', () => {
    expect(normalizeRequiredDocuments([{ label: ' RG ' }, { label: 'rg' }, 'CPF', { label: 'x' }, { label: 'Diploma', required: false }, 7])).toEqual([{ label: 'RG', required: true }, { label: 'CPF', required: true }, { label: 'Diploma', required: false }]);
    expect(resolveRequiredDocuments({ requiredDocuments: [{ label: 'CPF', required: true }], employmentType: 'CLT' })).toEqual([{ label: 'CPF', required: true }]);
    expect(resolveRequiredDocuments({ requiredDocuments: [], employmentType: 'PJ' }).map((i) => i.label)).toEqual([...CONTRACT_KITS.PJ]);
  });
});

function build(app: any, requests: any[], docs: any[]) {
  const prisma: any = {
    application: { findFirst: vi.fn(async () => app) },
    recruitmentDocumentRequest: { findMany: vi.fn(async () => requests) },
    recruitmentDocument: { findMany: vi.fn(async () => docs) },
  };
  const scope: any = { assertApplication: vi.fn(async () => undefined) };
  return { svc: new RecruitmentDocumentsService(prisma, {} as any, {} as any, scope, {} as any), prisma };
}

describe('RecruitmentDocumentsService.hiringKitStatus', () => {
  it('devolve required/approved/missing com a lista da vaga mais o que ja foi pedido', async () => {
    const { svc, prisma } = build({ companyId: 'c1', job: { requiredDocuments: [{ label: 'RG ou CNH', required: true }, { label: 'CPF', required: true }, { label: 'Diploma', required: false }], employmentType: 'CLT' } },
      [{ items: ['CPF', 'Foto 3x4'] }], [{ label: 'RG ou CNH', status: 'APPROVED' }, { label: 'CPF', status: 'RECEIVED' }]);
    const out = await svc.hiringKitStatus('app-1', 'c1');
    expect(out).toEqual({ required: ['RG ou CNH', 'CPF', 'Foto 3x4'], approved: ['RG ou CNH'], missing: ['CPF', 'Foto 3x4'] });
    expect(prisma.application.findFirst.mock.calls[0][0].where).toEqual({ id: 'app-1', companyId: 'c1' });
  });
  it('sem lista na vaga usa o kit do contrato; candidatura de outra empresa e 404', async () => {
    const ok = build({ companyId: 'c1', job: { requiredDocuments: null, employmentType: 'PJ' } }, [], []);
    expect((await ok.svc.hiringKitStatus('app-1')).required).toEqual([...CONTRACT_KITS.PJ]);
    const none = build(null, [], []);
    await expect(none.svc.hiringKitStatus('app-1', 'outra')).rejects.toBeInstanceOf(NotFoundException);
  });
  it('kitForApplication pre-carrega a lista com o tipo de cada item', async () => {
    const { svc } = build({ job: { requiredDocuments: null, employmentType: 'Estágio' } }, [], []);
    const out = await svc.kitForApplication('c1', { sub: 'u' }, 'app-1');
    expect(out.configured).toBe(false);
    expect(out.items.find((i) => i.label === 'Foto 3x4')?.docType).toBe('FOTO');
  });
});

describe('upload respeita o formato do tipo', () => {
  it('foto 3x4 em PDF e recusada com mensagem do formato certo', async () => {
    const request = { id: 'r', companyId: 'c1', applicationId: 'a', items: ['Foto 3x4'], expiresAt: new Date(Date.now() + 1e8), revokedAt: null, application: { forwardedAt: null, job: { title: 'x', company: { name: 'y' } } } };
    const prisma: any = { recruitmentDocumentRequest: { findUnique: vi.fn(async () => request) }, recruitmentDocument: { findFirst: vi.fn(async () => null) } };
    const svc = new RecruitmentDocumentsService(prisma, {} as any, { assertClean: vi.fn() } as any, {} as any, {} as any);
    const token = 'a'.repeat(43);
    await expect(svc.publicUpload(token, 'Foto 3x4', { buffer: pdf })).rejects.toThrow(/PNG, JPEG/);
    await expect(svc.publicUpload(token, 'Foto 3x4', { buffer: pdf })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
