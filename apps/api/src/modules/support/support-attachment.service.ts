import { createHash } from 'node:crypto';
import { ALLOW, inspectFile } from '../../common/utils/file-validation';
import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupportStorageService } from './support-storage.service';
import { SupportRepository } from './support.repository';
import { SupportAuthorizationService } from './support-authorization.service';
// @ts-ignore - clamscan nao publica tipos
import NodeClam from 'clamscan';

export const SUPPORT_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

@Injectable()
export class SupportAttachmentService {
  private clamscan: any = null;
  private readonly logger = new Logger(SupportAttachmentService.name);

  constructor(
    private readonly repository: SupportRepository,
    @Inject(SupportStorageService) private readonly storageService: SupportStorageService,
    private readonly authorizationService: SupportAuthorizationService,
  ) {}

  /** Conecta ao clamd sob demanda (e tenta de novo na proxima vez se estiver fora do ar). */
  private async getScanner() {
    if (this.clamscan) return this.clamscan;
    try {
      this.clamscan = await new NodeClam().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
          timeout: 60000,
          local_fallback: false,
        },
      });
      this.logger.log('ClamAV scanner initialized');
    } catch (err) {
      this.logger.warn(`ClamAV not reachable, attachments will stay quarantined: ${err instanceof Error ? err.message : String(err)}`);
    }
    return this.clamscan;
  }

  /**
   * O tipo vem do CONTEUDO (magic bytes via inspectFile), nunca da extensao nem do mimetype enviados:
   * extensao, mimetype e nome gravados abaixo sao os do tipo real detectado.
   */
  async uploadAttachment(actor: any, ticketId: string, file: any, messageId?: string) {
    const ticket = await this.repository.findPlatformTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Chamado nao encontrado.');
    }
    await this.authorizationService.assertCanUploadAttachment(actor, ticket);

    const checked = inspectFile(file?.buffer, { allow: ALLOW.SUPPORT, maxBytes: SUPPORT_ATTACHMENT_MAX_BYTES, filename: file?.originalname });
    if (!checked.ok) {
      this.logger.warn(`[Security Alert] Anexo recusado pelo conteudo (${checked.detected}): ${String(file?.originalname).slice(0, 80)}`);
      throw new BadRequestException(`Arquivo recusado: ${checked.message}`);
    }

    const extension = checked.extension;
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const storageKey = `${ticketId}/${Date.now()}-${sha256.substring(0, 8)}.${extension}`;
    const filePath = await this.storageService.saveFile(storageKey, file.buffer);

    await this.repository.createAttachment({
      ticketId,
      messageId,
      uploadedByUserId: actor.sub,
      originalName: checked.safeName,
      storageKey,
      attachmentType: checked.kind === 'png' || checked.kind === 'jpeg' || checked.kind === 'webp' ? 'IMAGE' : (checked.kind === 'mp4' || checked.kind === 'webm' ? 'VIDEO' : 'DOCUMENT'),
      declaredMimeType: checked.mime,
      sizeBytes: BigInt(file.buffer.length),
      sha256,
      status: 'QUARANTINED',
    });

    this.scanAttachment(filePath, storageKey).catch((e) => this.logger.error(e));

    return { success: true, storageKey, status: 'QUARANTINED' };
  }

  /** Fail-closed: so vira CLEAN quando o clamd responde explicitamente isInfected === false. */
  private async scanAttachment(filePath: string, storageKey: string) {
    const scanner = await this.getScanner();
    if (!scanner) return; // continua QUARANTINED: o download nao libera

    try {
      const { isInfected, viruses } = await scanner.isInfected(filePath);
      if (isInfected === true) {
        this.logger.warn(`Virus found in ${storageKey}: ${(viruses ?? []).join(', ')}`);
        await this.storageService.deleteFile(storageKey);
        await this.repository.updateAttachmentStatus(storageKey, 'REJECTED', (viruses ?? []).join(', '));
      } else if (isInfected === false) {
        this.logger.log(`File ${storageKey} is clean`);
        await this.repository.updateAttachmentStatus(storageKey, 'CLEAN');
      } else {
        this.logger.warn(`Resultado de scan indeterminado para ${storageKey}; permanece em quarentena.`);
      }
    } catch (e) {
      this.clamscan = null; // forca nova conexao; o anexo segue em quarentena
      this.logger.error('Error scanning file', e as any);
    }
  }

  async downloadAttachment(actor: any, ticketId: string, attachmentId: string) {
    const attachment = await this.repository.getAttachmentById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new NotFoundException('Anexo nao encontrado.');
    }

    // Autorizacao primeiro: quem nao pode ver o chamado nao descobre o estado do anexo.
    const ticket = await this.repository.findPlatformTicketById(ticketId);
    if (!ticket) throw new NotFoundException('Chamado nao encontrado.');
    await this.authorizationService.assertCanViewTicket(actor, ticket);

    switch (attachment.status) {
      case 'CLEAN':
        break;
      case 'QUARANTINED':
      case 'SCANNING':
        throw new ConflictException('Este arquivo ainda esta em verificacao de seguranca. Tente novamente em instantes.');
      case 'DELETED':
        throw new NotFoundException('Anexo nao encontrado.');
      default: // REJECTED e qualquer status desconhecido: bloqueia
        throw new ForbiddenException('Este arquivo foi bloqueado por motivos de seguranca.');
    }

    const stream = await this.storageService.getFileStream(attachment.storageKey);
    return { stream, mimetype: attachment.declaredMimeType, filename: attachment.originalName, size: Number(attachment.sizeBytes) };
  }
}
