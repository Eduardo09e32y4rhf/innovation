import { describe, expect, it, vi } from 'vitest';
import { PublicJobsController } from './public-jobs.controller';

function multipartRequest(parts: any[]) {
  return {
    isMultipart: () => true,
    parts: () => (async function* () { for (const part of parts) yield part; })(),
  };
}

describe('PublicJobsController.apply', () => {
  it('separa campos de texto do arquivo e nunca repassa o arquivo como campo', async () => {
    const apply = vi.fn().mockResolvedValue({ received: true });
    const controller = new PublicJobsController({ apply } as any);
    const pdf = Buffer.from('%PDF-1.4 teste');

    await controller.apply('job-1', multipartRequest([
      { type: 'field', fieldname: 'name', value: 'Maria' },
      { type: 'field', fieldname: 'consent', value: 'true' },
      { type: 'file', fieldname: 'resume', filename: 'cv.pdf', mimetype: 'application/pdf', file: { truncated: false }, toBuffer: async () => pdf },
    ]));

    const [, fields, file] = apply.mock.calls[0];
    expect(fields).toEqual({ name: 'Maria', consent: 'true' });
    expect(fields).not.toHaveProperty('resume');
    expect(file).toMatchObject({ buffer: pdf, filename: 'cv.pdf' });
  });

  it('rejeita arquivo maior que 5 MB com mensagem clara', async () => {
    const controller = new PublicJobsController({ apply: vi.fn() } as any);
    await expect(controller.apply('job-1', multipartRequest([
      { type: 'file', fieldname: 'resume', filename: 'cv.pdf', file: { truncated: true }, toBuffer: async () => Buffer.alloc(10) },
    ]))).rejects.toThrow(/5 MB/);
  });
});
