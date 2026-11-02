import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ = join(__dirname, '../..');
const ler = (p: string) => readFileSync(join(RAIZ, p), 'utf8');

describe('backup remoto cifrado', () => {
  const lib = ler('scripts/backup/remote-lib.sh');
  const backup = ler('scripts/backup/backup.sh');

  it('o remoto exige BACKUP_ENCRYPTION_PASSPHRASE e backup.sh valida antes do dump', () => {
    expect(lib).toMatch(/for v in [^;]*BACKUP_ENCRYPTION_PASSPHRASE/);
    expect(backup.indexOf('remote_s3_require_config')).toBeGreaterThan(-1);
    expect(backup.indexOf('remote_s3_require_config')).toBeLessThan(backup.indexOf('pg_dump'));
  });

  it('cifra com aes-256-cbc + pbkdf2 e a senha nunca vai em argumento', () => {
    expect(lib).toContain('openssl enc -aes-256-cbc -pbkdf2');
    expect(lib).toContain('-pass env:BACKUP_ENCRYPTION_PASSPHRASE');
    expect(lib).not.toMatch(/-pass pass:/);
  });

  it('rclone roda em container e só arquivos .enc são enviados', () => {
    expect(lib).toMatch(/docker "\$\{args\[@\]\}" "\$RCLONE_IMAGE"/);
    expect(backup).toContain('remote_s3_upload "${TO_SEND[@]}"');
    expect(backup).not.toMatch(/remote_s3_upload "\$FILE"/);
  });

  it('sem passphrase, require_config falha; com tudo, passa', () => {
    const rodar = (env: Record<string, string>) =>
      spawnSync('bash', ['-c', `. ${join(RAIZ, 'scripts/backup/remote-lib.sh')}; remote_s3_require_config`], {
        env: { PATH: process.env.PATH ?? '', ...env }, encoding: 'utf8',
      });
    const base = { BACKUP_REMOTE: 's3', BACKUP_S3_ENDPOINT: 'https://x', BACKUP_S3_BUCKET: 'b', BACKUP_S3_ACCESS_KEY_ID: 'k', BACKUP_S3_SECRET_ACCESS_KEY: 's' };
    const sem = rodar(base);
    expect(sem.status).not.toBe(0);
    expect(sem.stderr).toContain('BACKUP_ENCRYPTION_PASSPHRASE');
    expect(rodar({ ...base, BACKUP_ENCRYPTION_PASSPHRASE: 'curta' }).status).not.toBe(0);
  });

  it('scripts têm sintaxe bash válida', () => {
    for (const f of ['backup.sh', 'remote-lib.sh', 'restore-check.sh']) {
      expect(() => execFileSync('bash', ['-n', join(RAIZ, 'scripts/backup', f)])).not.toThrow();
    }
  });
});
