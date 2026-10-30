import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';

const execMock = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({ exec: execMock }));

import { BackupService, redactSecrets } from './backup.service';

describe('redactSecrets', () => {
  it('esconde a senha em URLs de conexao dentro de mensagens de erro', () => {
    const msg = 'Command failed: pg_dump "postgresql://innovation:S3nh4-Secreta_123@db:5432/innovation_db?schema=public" -F c -f "/x.sql"';
    const out = redactSecrets(msg);
    expect(out).not.toContain('S3nh4-Secreta_123');
    expect(out).toContain('postgresql://innovation:***@db:5432/innovation_db');
  });
  it('cobre postgres://, redis:// e varias ocorrencias; texto sem URL fica igual', () => {
    expect(redactSecrets('a postgres://u:p@h/d e redis://:x@h')).toBe('a postgres://u:***@h/d e redis://:***@h');
    expect(redactSecrets('redis://default:segredo@cache:6379')).toBe('redis://default:***@cache:6379');
    expect(redactSecrets('sem url aqui')).toBe('sem url aqui');
  });
});

// INF-05: a rotina interna rodava pg_dump dentro do container da API (onde nao existe) e dava falsa seguranca.
describe('BackupService: rotina interna desligada por padrao', () => {
  const redis = { acquireLock: vi.fn().mockResolvedValue(true), releaseLock: vi.fn() } as any;
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    execMock.mockReset();
    execMock.mockImplementation((_cmd: string, cb: (e: null, r: { stdout: string; stderr: string }) => void) => cb(null, { stdout: '', stderr: '' }));
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    process.env.DATABASE_URL = 'postgresql://u:p@db:5432/x';
    delete process.env.INTERNAL_DB_BACKUP_ENABLED;
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.INTERNAL_DB_BACKUP_ENABLED; });

  it('por padrao NAO executa pg_dump e diz que o backup oficial e scripts/backup/backup.sh', async () => {
    await new BackupService(redis).handleDailyBackup();
    expect(execMock).not.toHaveBeenCalled();
    const msgs = log.mock.calls.map((c) => String(c[0])).join('\n');
    expect(msgs).toContain('scripts/backup/backup.sh');
    expect(msgs).toContain('docs/BACKUP-REMOTO.md');
  });
  it.each(['false', '0', '', 'off', 'qualquer'])('INTERNAL_DB_BACKUP_ENABLED=%j continua desligado', async (v) => {
    process.env.INTERNAL_DB_BACKUP_ENABLED = v;
    await new BackupService(redis).handleDailyBackup();
    expect(execMock).not.toHaveBeenCalled();
  });
  it('so INTERNAL_DB_BACKUP_ENABLED=true reativa o pg_dump (uso fora de container, onde o cliente do Postgres existe)', async () => {
    process.env.INTERNAL_DB_BACKUP_ENABLED = 'true';
    await new BackupService(redis).handleDailyBackup();
    expect(execMock).toHaveBeenCalledTimes(1);
    expect(String(execMock.mock.calls[0][0])).toContain('pg_dump');
  });
});
