import { BadRequestException, Injectable } from '@nestjs/common';

export interface SupportFilePayload {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class SupportFileValidationService {
  private readonly allowedExtensions = new Set(['png', 'jpg', 'jpeg', 'webp', 'pdf', 'txt', 'mp4', 'webm']);
  private readonly blockedExtensions = new Set(['exe', 'bat', 'cmd', 'ps1', 'sh', 'js', 'html', 'htm', 'svg', 'zip', 'rar', 'dll', 'apk', 'msi', 'vbs', 'scr', 'pif']);

  validate(file: SupportFilePayload) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Arquivo inválido ou vazio.');
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('O tamanho do arquivo excede o limite máximo permitido de 20 MB.');
    }

    const extension = (file.originalname.split('.').pop() || '').toLowerCase();
    if (!extension) {
      throw new BadRequestException('O arquivo precisa ter uma extensão válida.');
    }

    if (this.blockedExtensions.has(extension)) {
      throw new BadRequestException(`A extensão de arquivo '.${extension}' é proibida por motivos de segurança.`);
    }

    if (!this.allowedExtensions.has(extension)) {
      throw new BadRequestException(`Extensão '.${extension}' não suportada. Formatos aceitos: PNG, JPG, WEBP, PDF, TXT, MP4, WEBM.`);
    }

    this.validateMagicBytes(extension, file.buffer);

    return { extension };
  }

  detectMimeType(extension: string, declaredMimeType?: string) {
    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'webp': return 'image/webp';
      case 'pdf': return 'application/pdf';
      case 'txt': return 'text/plain';
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      default: return declaredMimeType || 'application/octet-stream';
    }
  }

  private validateMagicBytes(extension: string, buffer: Buffer) {
    if (buffer.length < 4) return;

    const hex = buffer.subarray(0, 4).toString('hex').toUpperCase();
    if (extension === 'png' && !hex.startsWith('89504E47')) {
      throw new BadRequestException('Arquivo PNG corrompido ou falsificado.');
    }
    if ((extension === 'jpg' || extension === 'jpeg') && !hex.startsWith('FFD8FF')) {
      throw new BadRequestException('Arquivo JPEG corrompido ou falsificado.');
    }
    if (extension === 'pdf' && !buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
      throw new BadRequestException('Arquivo PDF corrompido ou falsificado.');
    }
    if (extension === 'webp' && buffer.length >= 12 && buffer.subarray(8, 12).toString('ascii') !== 'WEBP') {
      throw new BadRequestException('Arquivo WEBP corrompido ou falsificado.');
    }
  }
}
