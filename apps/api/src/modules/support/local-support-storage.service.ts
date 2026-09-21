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

  // Resolves the file key against the base path and verifies it doesn't escape the directory
  private resolveAndCheckKey(key: string): string {
    const resolvedBase = path.resolve(this.basePath);
    // Sanitize leading slashes to prevent absolute path resolution bypassing the base path
    const sanitizedKey = key.replace(/^\/+/, '');
    const target = path.resolve(resolvedBase, sanitizedKey);
    if (target !== resolvedBase && !target.startsWith(resolvedBase + path.sep)) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return target;
  }

  async saveFile(key: string, buffer: Buffer): Promise<string> {
    const filePath = this.resolveAndCheckKey(key);
    await fs.writeFile(filePath, buffer);
    // Return relative path to match API contract
    return path.join(this.basePath, key);
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = this.resolveAndCheckKey(key);
      await fs.unlink(filePath);
    } catch (e) {
      this.logger.error(`Failed to delete file: ${key}`, e);
    }
  }

  async getFileStream(key: string): Promise<NodeJS.ReadableStream> {
    const { createReadStream } = require('fs');
    const filePath = this.resolveAndCheckKey(key);
    return createReadStream(filePath);
  }

  async fileExists(key: string): Promise<boolean> {
    try {
      const filePath = this.resolveAndCheckKey(key);
      await fs.access(filePath);
      return true;
    } catch (e) {
      return false;
    }
  }

  getFilePath(key: string): string {
    // Perform security check
    this.resolveAndCheckKey(key);
    return path.join(this.basePath, key);
  }
}