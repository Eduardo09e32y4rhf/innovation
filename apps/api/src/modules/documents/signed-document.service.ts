import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { decryptForCompany, sealFile } from '../../common/crypto/file-crypto';
import { PdfReport, fmt, pdfSafeText } from '../../common/pdf/pdf-report';
import { PrismaService } from '../../database/prisma.service';
import { SupportStorageService } from '../support/support-storage.service';

/**
 * Assinatura ELETRONICA SIMPLES de documentos gerados pelo sistema (RS-D-05, parte documentos).
 * Evidencia guardada: texto exato assinado (versionado pelo modelo) e seu SHA-256, PDF final e seu SHA-256, nome, e-mail e documento
 * de quem assinou, IP, user agent e data/hora.
 *
 * Base legal: MP 2.200-2/2001, art. 10, par. 2 (validade de outros meios de comprovacao de autoria e integridade, aceitos pelas partes)
 * e Lei 14.063/2020, art. 4, I (assinatura eletronica simples). Citacoes feitas de memoria e por busca (planalto.gov.br indisponivel na
 * sessao de desenvolvimento): VALIDACAO JURIDICA PENDENTE do usuario/advogado, principalmente para contratos de trabalho, em que a
 * suficiencia da assinatura simples deve ser confirmada.
 *
 * USO (outros pacotes, ex.: aceite da proposta): chamar `sign(...)` no momento do aceite, com o texto exato que o signatario viu.
 * O IP deve vir de `clientIp(request)` e o user agent do cabecalho, nunca do corpo da requisicao.
 */
export const SIGNATURE_LEGAL_NOTE = 'Assinatura eletronica simples (MP 2.200-2/2001, art. 10, par. 2; Lei 14.063/2020, art. 4, I).';

export type SignInput = {
  companyId: string;
  kind: string;
  title: string;
  /** Texto exato que o signatario viu e aceitou. */
  text: string;
  applicationId?: string | null;
  templateId?: string | null;
  templateVersion?: number | null;
  signer: { name: string; email?: string | null; document?: string | null };
  evidence: { ip?: string | null; userAgent?: string | null };
  brand: { name: string; document?: string | null; logoUrl?: string | null };
  /** Dados estruturados exibidos no PDF (ex.: lista de dependentes, trechos de VT). */
  details?: Array<[string, string]>;
  signedAt?: Date;
};

export type SignedResult = { id: string; textHash: string; pdfSha256: string; signedAt: Date };

/** Texto canonico para o hash: quebras normalizadas e sem espacos nas pontas. */
export function canonicalText(title: string, text: string): string {
  return `${title.trim()}\n\n${text.replace(/\r\n?/g, '\n').trim()}`;
}

export function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

@Injectable()
export class SignedDocumentService {
  private readonly logger = new Logger(SignedDocumentService.name);

  constructor(private readonly prisma: PrismaService, private readonly storage: SupportStorageService) {}

  async sign(input: SignInput): Promise<SignedResult> {
    const name = input.signer.name?.trim();
    if (!input.companyId) throw new BadRequestException('Empresa nao informada.');
    if (!name || name.length < 2) throw new BadRequestException('Informe o nome de quem assina.');
    if (!input.text?.trim() || !input.title?.trim()) throw new BadRequestException('Documento sem texto para assinar.');

    const id = randomUUID();
    const signedAt = input.signedAt ?? new Date();
    const text = canonicalText(input.title, input.text);
    const textHash = sha256Hex(text);
    const pdf = await this.renderPdf({ ...input, id, signedAt, textHash });
    const pdfSha256 = sha256Hex(pdf);
    const sealed = sealFile(pdf, input.companyId); // PDF com dados pessoais: cifrado em repouso (RS-D-14)
    const pdfKey = `signed/${input.companyId}/${id}.pdf`;
    await this.storage.saveFile(pdfKey, sealed.data);
    try {
      await this.prisma.signedDocument.create({
        data: {
          id, companyId: input.companyId, applicationId: input.applicationId ?? null, kind: input.kind, templateId: input.templateId ?? null, templateVersion: input.templateVersion ?? null,
          text, textHash, pdfKey, pdfSha256, signerName: name, signerEmail: input.signer.email ?? null, signerDocument: input.signer.document ?? null,
          ipAddress: input.evidence.ip ?? null, userAgent: (input.evidence.userAgent ?? '').slice(0, 300) || null, signedAt,
        },
      });
    } catch (error) {
      await this.storage.deleteFile(pdfKey).catch(() => undefined);
      this.logger.error(`Assinatura nao gravada (${input.kind}): ${(error as Error)?.name ?? 'erro'}`);
      throw error;
    }
    await this.prisma.auditLog.create({ data: { companyId: input.companyId, userId: null, action: 'SIGNED_DOCUMENT_CREATED', entity: 'SignedDocument', entityId: id, metadata: { kind: input.kind, applicationId: input.applicationId ?? null, textHash, pdfSha256, templateVersion: input.templateVersion ?? null }, ipAddress: input.evidence.ip ?? null, userAgent: (input.evidence.userAgent ?? '').slice(0, 300) || null } });
    return { id, textHash, pdfSha256, signedAt };
  }

  /** PDF final: texto, dados, bloco de evidencias e hash do texto. */
  private async renderPdf(input: SignInput & { id: string; signedAt: Date; textHash: string }): Promise<Buffer> {
    const report = await PdfReport.create({
      title: pdfSafeText(input.title).slice(0, 60),
      brand: { name: pdfSafeText(input.brand.name), document: input.brand.document, logoUrl: input.brand.logoUrl },
      number: `Assinatura ${input.id.slice(0, 8)}`,
      chip: { label: 'ASSINADO ELETRONICAMENTE', tone: 'ok' },
      footerNote: `Hash do texto (SHA-256): ${input.textHash.slice(0, 32)}...`,
      footerId: input.id,
      generatedAt: input.signedAt,
    });
    report.paragraph(pdfSafeText(input.text.replace(/\r\n?/g, '\n').trim()), { size: 10, color: '#0f172a' });
    if (input.details?.length) {
      report.section('Dados informados');
      report.fields(input.details.map(([label, value]) => [pdfSafeText(label), pdfSafeText(value)] as [string, string]), 2);
    }
    report.section('Evidencias da assinatura');
    report.fields([
      ['Assinante', pdfSafeText(input.signer.name)],
      ['Documento', input.signer.document ? fmt.document(input.signer.document) : '-'],
      ['E-mail', input.signer.email ?? '-'],
      ['Data e hora (Brasilia)', fmt.dateTime(input.signedAt)],
      ['IP', input.evidence.ip ?? '-'],
      ['Dispositivo', pdfSafeText((input.evidence.userAgent ?? '-').slice(0, 120))],
    ], 2);
    report.notice('Validade', [SIGNATURE_LEGAL_NOTE, `Hash SHA-256 do texto assinado: ${input.textHash}`], 'neutral');
    return report.finish();
  }

  /** Confere a integridade: o PDF guardado ainda tem o hash gravado e o texto gravado ainda tem o hash do aceite. */
  async verify(companyId: string, id: string): Promise<{ valid: boolean; textIntact: boolean; pdfIntact: boolean; signedAt: Date; signerName: string; kind: string }> {
    const row = await this.prisma.signedDocument.findFirst({ where: { id, companyId } });
    if (!row) throw new NotFoundException('Documento assinado nao encontrado.');
    const textIntact = sha256Hex(row.text) === row.textHash;
    let pdfIntact = false;
    try { pdfIntact = sha256Hex(await this.readPdf(companyId, row.pdfKey)) === row.pdfSha256; } catch { pdfIntact = false; }
    return { valid: textIntact && pdfIntact, textIntact, pdfIntact, signedAt: row.signedAt, signerName: row.signerName, kind: row.kind };
  }

  /** PDF assinado (decifrado). Quem chama audita a leitura e confere a permissao. */
  async read(companyId: string, id: string): Promise<{ buffer: Buffer; kind: string; applicationId: string | null; pdfSha256: string }> {
    const row = await this.prisma.signedDocument.findFirst({ where: { id, companyId }, select: { pdfKey: true, kind: true, applicationId: true, pdfSha256: true } });
    if (!row) throw new NotFoundException('Documento assinado nao encontrado.');
    return { buffer: await this.readPdf(companyId, row.pdfKey), kind: row.kind, applicationId: row.applicationId, pdfSha256: row.pdfSha256 };
  }

  private async readPdf(companyId: string, key: string): Promise<Buffer> {
    const stream = await this.storage.getFileStream(key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    return decryptForCompany(Buffer.concat(chunks), companyId);
  }

  list(companyId: string, applicationId: string) {
    return this.prisma.signedDocument.findMany({ where: { companyId, applicationId }, orderBy: { signedAt: 'desc' }, select: { id: true, kind: true, templateVersion: true, signerName: true, signedAt: true, pdfSha256: true, textHash: true } });
  }
}
