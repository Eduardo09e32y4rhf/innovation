import { describe, expect, it } from 'vitest';
import { redactSecrets } from './backup.service';

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