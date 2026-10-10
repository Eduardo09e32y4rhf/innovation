import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SupportStorageService } from '../support/support-storage.service';
import * as crypto from 'crypto';
import PDFDocument from 'pdfkit';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SupportStorageService) private readonly storageService: SupportStorageService
  ) {}

  async generateDocument(
    companyId: string,
    type: 'REPORT' | 'CONTRACT' | 'PAYSLIP' | 'OTHER',
    title: string,
    contentBuilder: (doc: typeof PDFDocument) => void,
    authorId?: string
  ): Promise<{ id: string, storageKey: string, sha256: string }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        
        doc.on('end', async () => {
          const pdfBuffer = Buffer.concat(chunks);
          
          // Generate SHA-256 for immutability check
          const sha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
          const storageKey = `docs/${companyId}/${Date.now()}-${sha256.substring(0, 8)}.pdf`;

          await this.storageService.saveFile(storageKey, pdfBuffer);

          const record = await this.prisma.generatedDocument.create({
            data: {
              companyId,
              type,
              title,
              storageKey,
              sha256,
              sizeBytes: pdfBuffer.length,
              createdBy: authorId,
            }
          });

          this.logger.log(`Generated immutable PDF: ${record.id} (${sha256})`);
          resolve({ id: record.id, storageKey, sha256 });
        });

        doc.on('error', (err) => {
          this.logger.error('Error generating PDF', err);
          reject(err);
        });

        // Run the custom content builder for the PDF
        contentBuilder(doc);
        
        doc.end();
      } catch (err) {
        this.logger.error('Failed to generate document', err);
        reject(err);
      }
    });
  }

  /** Guarda um PDF já montado (pelo kit de relatórios) com SHA-256 e registro imutável. */
  async storePdf(companyId: string, type: 'REPORT' | 'CONTRACT' | 'PAYSLIP' | 'OTHER', title: string, buffer: Buffer, authorId?: string): Promise<{ id: string; storageKey: string; sha256: string }> {
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = `docs/${companyId}/${Date.now()}-${sha256.substring(0, 8)}.pdf`;
    await this.storageService.saveFile(storageKey, buffer);
    const record = await this.prisma.generatedDocument.create({ data: { companyId, type, title, storageKey, sha256, sizeBytes: buffer.length, createdBy: authorId } });
    this.logger.log(`Generated immutable PDF: ${record.id} (${sha256})`);
    return { id: record.id, storageKey, sha256 };
  }
  async getDocumentStream(actor: any, documentId: string) {
    const doc = await this.prisma.generatedDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new BadRequestException('Documento não encontrado');

    if (actor.role !== 'DEV' && actor.role !== 'SUPORTE') {
      if (doc.companyId !== actor.companyId) {
        throw new BadRequestException('Acesso negado a este documento');
      }
    }

    const stream = await this.storageService.getFileStream(doc.storageKey);
    return { stream, filename: `${doc.title}.pdf`, size: doc.sizeBytes };
  }

  /** Bytes do PDF gerado. O chamador e responsavel por autorizar o acesso ao documento. */
  async readBuffer(documentId: string): Promise<Buffer> {
    const doc = await this.prisma.generatedDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new BadRequestException('Documento não encontrado');
    const stream = await this.storageService.getFileStream(doc.storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  /** Registra um PDF recebido de fora (ex.: assinado no gov.br) em armazenamento privado, com SHA-256. */
  async storeExternalPdf(companyId: string, title: string, buffer: Buffer, authorId?: string): Promise<{ id: string; storageKey: string; sha256: string }> {
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const storageKey = `docs/${companyId}/signed-${Date.now()}-${sha256.substring(0, 8)}.pdf`;
    await this.storageService.saveFile(storageKey, buffer);
    const record = await this.prisma.generatedDocument.create({ data: { companyId, type: 'CONTRACT', title, storageKey, sha256, sizeBytes: buffer.length, createdBy: authorId } });
    return { id: record.id, storageKey, sha256 };
  }
}
