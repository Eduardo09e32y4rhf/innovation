import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { SupportStorageService } from './support-storage.service';
import { SupportRepository } from './support.repository';
import { SupportAuthorizationService } from './support-authorization.service';
// @ts-ignore
import NodeClam from 'clamscan';

@Injectable()
export class SupportAttachmentService {
  private clamscan: any;
  private readonly logger = new Logger(SupportAttachmentService.name);

  constructor(
    private readonly repository: SupportRepository,
    @Inject(SupportStorageService) private readonly storageService: SupportStorageService,
    private readonly authorizationService: SupportAuthorizationService,
  ) {
    this.initClamAV();
  }

  private async initClamAV() {
    try {
      this.clamscan = await new NodeClam().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310'),
          timeout: 60000,
          local_fallback: false,
        }
      });
      this.logger.log('ClamAV scanner initialized');
    } catch (err) {
      this.logger.warn('ClamAV not reachable, attachments will stay quarantined.', err);
    }
  }

  private readonly allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'pdf', 'txt', 'mp4', 'webm']);
  private readonly blockedExtensions = new Set(['exe', 'bat', 'cmd', 'ps1', 'sh', 'js', 'html', 'htm', 'svg', 'zip', 'rar', 'dll', 'apk', 'msi', 'vbs', 'scr', 'pif']);

  async uploadAttachment(actor: any, ticketId: string, file: any, messageId?: string) {
    const ticket = await this.repository.findPlatformTicketById(ticketId);
    if (!ticket) {
      throw new BadRequestException('Chamado nao encontrado.');
    }
    await this.authorizationService.assertCanUploadAttachment(actor, ticket);

    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('O tamanho do arquivo excede o limite máximo permitido de 20 MB.');
    }

    const extension = (file.originalname.split('.').pop() || '').toLowerCase();

    if (this.blockedExtensions.has(extension)) {
      this.logger.warn(`[Security Alert] Tentativa de upload de arquivo bloqueado por política: ${file.originalname}`);
      throw new BadRequestException(`A extensão de arquivo '.${extension}' é proibida por motivos de segurança.`);
    }

    if (!this.allowedExtensions.has(extension)) {
      throw new BadRequestException(`Extensão '.${extension}' não suportada. Formatos aceitos: PNG, JPG, WEBP, PDF, TXT, MP4, WEBM.`);
    }

    // Verificação básica de Magic Bytes contra falsificação de extensão
    if (file.buffer && file.buffer.length >= 4) {
      const hex = file.buffer.subarray(0, 4).toString('hex').toUpperCase();
      if (extension === 'png' && !hex.startsWith('89504E47')) throw new BadRequestException('Arquivo PNG corrompido ou falsificado.');
      if ((extension === 'jpg' || extension === 'jpeg') && !hex.startsWith('FFD8FF')) throw new BadRequestException('Arquivo JPEG corrompido ou falsificado.');
      if (extension === 'pdf' && !file.buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) throw new BadRequestException('Arquivo PDF corrompido ou falsificado.');
    }

    const { createHash } = require('crypto');
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    const storageKey = `${ticketId}/${Date.now()}-${sha256.substring(0, 8)}.${extension}`;
    
    // Save locally
    const filePath = await this.storageService.saveFile(storageKey, file.buffer);

    // Save to DB as QUARANTINED
    const attachment = await this.repository.createAttachment({
      ticketId,
      messageId,
      uploadedByUserId: actor.sub,
      originalName: file.originalname,
      storageKey,
      attachmentType: extension.match(/(jpg|jpeg|png|gif|webp)/i) ? 'IMAGE' : (extension.match(/(mp4|webm)/i) ? 'VIDEO' : 'DOCUMENT'),
      declaredMimeType: file.mimetype,
      sizeBytes: BigInt(file.size),
      sha256,
      status: 'QUARANTINED',
    });

    // And then we scan asynchronously
    this.scanAttachment(filePath, storageKey).catch(e => this.logger.error(e));

    return { success: true, storageKey, status: 'QUARANTINED' };
  }

  private async scanAttachment(filePath: string, storageKey: string) {
    if (!this.clamscan) return;
    
    try {
      const { isInfected, viruses } = await this.clamscan.isInfected(filePath);
      
      if (isInfected) {
        this.logger.warn(`Virus found in ${storageKey}: ${viruses.join(', ')}`);
        await this.storageService.deleteFile(storageKey);
        await this.repository.updateAttachmentStatus(storageKey, 'REJECTED', viruses.join(', '));
      } else {
        this.logger.log(`File ${storageKey} is clean`);
        await this.repository.updateAttachmentStatus(storageKey, 'CLEAN');
      }
    } catch (e) {
      this.logger.error('Error scanning file', e);
    }
  }

  async downloadAttachment(actor: any, ticketId: string, attachmentId: string) {
    const attachment = await this.repository.getAttachmentById(attachmentId);
    if (!attachment || attachment.ticketId !== ticketId) {
      throw new BadRequestException('Anexo não encontrado.');
    }

    if (attachment.status === 'REJECTED') {
      throw new BadRequestException('Este arquivo foi bloqueado por motivos de segurança (vírus detectado).');
    }

    // Autorização
    const ticket = await this.repository.findPlatformTicketById(ticketId);
    if (!ticket) throw new BadRequestException('Chamado nao encontrado.');
    await this.authorizationService.assertCanViewTicket(actor, ticket);

    const stream = await this.storageService.getFileStream(attachment.storageKey);
    return { stream, mimetype: attachment.declaredMimeType, filename: attachment.originalName, size: Number(attachment.sizeBytes) };
  }
}
