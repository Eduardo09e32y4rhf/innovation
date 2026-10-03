import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function getKey() {
  const raw = process.env.KMS_MASTER_KEY;
  if (!raw) throw new Error('KMS_MASTER_KEY is required to store a temporary credential.');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) throw new Error('KMS_MASTER_KEY must contain 32 bytes encoded as hex.');
  return key;
}

export function encryptTemporaryPassword(value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptTemporaryPassword(value: string) {
  const [ivHex, tagHex, encryptedHex] = value.split(':');
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid temporary credential format.');
  const decipher = createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
}
