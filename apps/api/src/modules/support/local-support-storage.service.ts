import { Injectable, Logger } from '@nestjs/common';
import { SupportStorageService } from './support-storage.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class LocalSupportStorageService implements SupportStorageService {
  private readonly basePath = process.env.SUPPORT_ATTACHMENTS_PATH || '/data/attachments';
  private readonly logger = new Logger(LocalSupportStorageService.name);

  constructor() {
    this.ensureDirectory(this.basePath).catch(err => this.logger.error('Failed to create attachments directory', err));
  }

  private async ensureDirectory(dir: string) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      this.logger.error('Falha ao criar diretório de anexos de suporte', e);
    }
  }

  async saveFile(key: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.basePath, key);
    await fs.writeFile(filePath, buffer);
    return filePath;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.unlink(filePath);
    } catch (e) {
      this.logger.error(`Failed to delete file: ${key}`, e);
    }
  }

  async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    const { createReadStream } = require('fs');
    const filePath = path.join(this.basePath, key);
    return createReadStream(filePath);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.access(filePath);
      return true;
    } catch (e) {
      return false;
    }
  }

  getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }
}