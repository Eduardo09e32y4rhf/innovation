import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  // In a real sovereign architecture, this key would be fetched from the KMS and kept in memory.
  // We'll use an environment variable for now, but design it to be replaceable.
  private getMasterKey(): Buffer {
    const key = process.env.KMS_MASTER_KEY;
    if (!key) {
      throw new InternalServerErrorException('KMS_MASTER_KEY is not defined. Kill switch activated?');
    }
    // Must be 32 bytes for aes-256-gcm
    return Buffer.from(key, 'hex');
  }

  encrypt(text: string): string {
    const iv = randomBytes(16);
    const key = this.getMasterKey();
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    const key = this.getMasterKey();
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
