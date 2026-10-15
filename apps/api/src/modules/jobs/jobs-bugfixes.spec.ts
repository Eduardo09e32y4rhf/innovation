import { describe, expect, it } from 'vitest';
import { JobsService } from './jobs.service';
import { RecruitmentService } from './recruitment.service';

const jobs = new JobsService({} as any, {} as any, {} as any, {} as any, {} as any) as any;

describe('correcoes encontradas na varredura', () => {
  it('editar vaga: campo apagado limpa o banco (antes o valor antigo voltava)', () => {
    const data = jobs.normalizeJob({ title: 'X', description: 'Y', location: '', department: null, seniority: '  ', workMode: null, salaryMin: null } as any);
    expect(data).toMatchObject({ location: null, department: null, seniority: null, workMode: null, salaryMin: null });
    const untouched = jobs.normalizeJob({ title: 'X' } as any);
    expect(untouched.location).toBeUndefined();
    expect('workMode' in untouched).toBe(false);
  });
  it('curriculo: so DOCX de verdade (zip/xlsx renomeado e recusado)', () => {
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.from('....word/document.xml')]);
    const xlsx = Buffer.concat([Buffer.from([0x50, 0x4b, 3, 4]), Buffer.from('....xl/workbook.xml')]);
    expect(jobs.detectResumeFormat(docx, 'cv.docx')?.extension).toBe('docx');
    expect(jobs.detectResumeFormat(xlsx, 'cv.docx')).toBeNull();
    expect(jobs.detectResumeFormat(Buffer.from('%PDF-1.7'), 'cv.pdf')?.extension).toBe('pdf');
  });
  it('filtro de datas: horario de Brasilia e data invalida ignorada (antes dava erro 500)', () => {
    const recruitment = new RecruitmentService({} as any) as any;
    const where = recruitment.buildWhere('c1', 'j1', { from: '2026-10-01', to: '2026-10-15' });
    expect(where.createdAt.gte.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(where.createdAt.lte.toISOString()).toBe('2026-10-16T02:59:59.999Z');
    expect(recruitment.buildWhere('c1', 'j1', { from: 'ontem', to: '2026-13-45' }).createdAt).toBeUndefined();
  });
});
