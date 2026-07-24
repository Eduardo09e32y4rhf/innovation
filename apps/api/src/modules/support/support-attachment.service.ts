import { Injectable, Logger, BadRequestException, Inject } from '@nestjs/common';
import { SupportStorageService } from './support-storage.service';
import { SupportRepository } from './support.repository';
// @ts-ignore
import NodeClam from 'clamscan';

@Injectable()
export class SupportAttachmentService {
  private clamscan: any;
  private readonly logger = new Logger(SupportAttachmentService.name);

  constructor(
    private readonly repository: SupportRepository,
    @Inject(SupportStorageService) private readonly storageService: SupportStorageService
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

  async uploadAttachment(actor: any, ticketId: string, file: any, messageId?: string) {
    if (file.size > 100 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds 100MB limit');
    }

    const { createHash } = require('crypto');
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');

    const extension = file.originalname.split('.').pop() || '';
    const storageKey = `${ticketId}/${Date.now()}-${sha256.substring(0, 8)}.${extension}`;
    
    // Save locally
    const filePath = await this.storageService.saveFile(storageKey, file.buffer);

    // Save to DB as QUARANTINED
    const attachment = await this.repository.createAttachment({
      ticketId,
      messageId,
      uploadedByUserId: actor.id,
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
}