import { ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Criptografia de arquivos em repouso (RS-D-14): AES-256-GCM com chave por empresa.
 * Chave da empresa = HKDF-SHA256(KMS_MASTER_KEY, sal fixo, info = companyId). Assim a chave de uma empresa nao decifra a de outra
 * e girar a KMS_MASTER_KEY e uma decisao unica. O companyId tambem entra como dado autenticado (AAD).
 *
 * Formato do arquivo: "IRF1" | iv (12) | tag (16) | texto cifrado. Arquivo sem esse cabecalho e tratado como legado (texto plano).
 * Documentos (PDF/PNG/JPEG) nunca comecam por "IRF1", entao nao ha ambiguidade.
 */
const MAGIC = Buffer.from('IRF1');
const SALT = Buffer.from('innovation-recruitment-files-v1');
const IV_BYTES = 12;
const TAG_BYTES = 16;

function masterKey(): Buffer | null {
  const hex = (process.env.KMS_MASTER_KEY ?? '').trim();
  return /^[0-9a-fA-F]{64}$/.test(hex) ? Buffer.from(hex, 'hex') : null;
}

export function fileEncryptionAvailable(): boolean {
  return masterKey() !== null;
}

export function companyFileKey(companyId: string): Buffer {
  const master = masterKey();
  if (!master) throw new ServiceUnavailableException('Criptografia de arquivos indisponivel (KMS_MASTER_KEY).');
  if (!companyId) throw new ServiceUnavailableException('Empresa nao informada para a criptografia.');
  return Buffer.from(hkdfSync('sha256', master, SALT, Buffer.from(companyId), 32));
}

export function isEncryptedFile(data: Buffer): boolean {
  return data.length >= MAGIC.length + IV_BYTES + TAG_BYTES && data.subarray(0, MAGIC.length).equals(MAGIC);
}

export function encryptForCompany(plain: Buffer, companyId: string): Buffer {
  const key = companyFileKey(companyId);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(companyId));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), body]);
}

/** Le arquivo cifrado ou legado: sem o cabecalho devolve o proprio conteudo (texto plano antigo). Adulterado ou de outra empresa: lanca erro. */
export function decryptForCompany(data: Buffer, companyId: string): Buffer {
  if (!isEncryptedFile(data)) return data;
  const key = companyFileKey(companyId);
  const iv = data.subarray(MAGIC.length, MAGIC.length + IV_BYTES);
  const tag = data.subarray(MAGIC.length + IV_BYTES, MAGIC.length + IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(companyId));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(data.subarray(MAGIC.length + IV_BYTES + TAG_BYTES)), decipher.final()]);
  } catch {
    throw new ServiceUnavailableException('Nao foi possivel abrir o arquivo (integridade ou chave invalida).');
  }
}

/**
 * Prepara o arquivo para gravar. Com chave: cifra. Sem chave: em producao recusa (503); fora dela grava plano e avisa pelo retorno.
 */
export function sealFile(plain: Buffer, companyId: string): { data: Buffer; encrypted: boolean } {
  if (fileEncryptionAvailable()) return { data: encryptForCompany(plain, companyId), encrypted: true };
  if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Armazenamento seguro indisponivel no momento. Tente novamente mais tarde.');
  return { data: plain, encrypted: false };
}
