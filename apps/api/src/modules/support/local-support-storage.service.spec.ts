import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LocalSupportStorageService } from './local-support-storage.service';

describe('armazenamento local de arquivos gerados', () => {
  const base = mkdtempSync(join(tmpdir(), 'storage-'));
  const previous = process.env.SUPPORT_ATTACHMENTS_PATH;
  beforeAll(() => { process.env.SUPPORT_ATTACHMENTS_PATH = base; });
  afterAll(() => { if (previous === undefined) delete process.env.SUPPORT_ATTACHMENTS_PATH; else process.env.SUPPORT_ATTACHMENTS_PATH = previous; rmSync(base, { recursive: true, force: true }); });

  it('grava docs/<empresa>/<arquivo>.pdf mesmo quando a subpasta ainda não existe', async () => {
    const storage = new LocalSupportStorageService();
    const key = 'docs/05708c06-5fca-40c1-a837-c5d2994a55ba/1792518870554-005b76ea.pdf';
    const filePath = await storage.saveFile(key, Buffer.from('%PDF-1.3 teste'));
    expect(readFileSync(filePath).toString()).toBe('%PDF-1.3 teste');
    expect(await storage.fileExists(key)).toBe(true);
  });
});
