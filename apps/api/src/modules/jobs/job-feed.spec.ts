import 'reflect-metadata';
import { ServiceUnavailableException } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildJobFeedJson, buildJobFeedXml, splitLocation, type FeedJob } from './job-feed';
import { jobBoardPublishers } from './job-board-publisher';
import { TurnstileService } from '../../common/turnstile/turnstile.service';
import { JobsService } from './jobs.service';
import { PublicJobsController } from './public-jobs.controller';

const job = (over: Partial<FeedJob> = {}): FeedJob => ({
  id: 'j1', title: 'Analista <Sr> & "Dados"', description: '<p>Linha 1</p>\nTrabalhe com ]]> dados & café', location: 'São Paulo - SP', employmentType: 'CLT', workMode: 'REMOTO',
  salaryMin: 5000, salaryMax: 7000, salaryHidden: false, salaryRange: null, department: 'TI', seniority: 'Pleno', openings: 2, pcd: true,
  createdAt: new Date('2026-10-01T12:00:00Z'), deadline: new Date('2026-12-01T00:00:00Z'), requirements: ['SQL'], benefits: ['VR'], ...over,
});
const company = { id: 'c1', name: 'Acme & Cia', slug: 'acme' };

describe('RS-R-06 feed XML no formato Indeed e feed JSON', () => {
  const xml = buildJobFeedXml(company, [job(), job({ id: 'j2', salaryHidden: true, location: null, employmentType: 'PJ', title: 'Dev' })], 'https://app.exemplo.com', new Date('2026-10-30T10:00:00Z'));
  it('gera o cabecalho, um <job> por vaga e escapa os caracteres especiais do XML', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(xml).toContain('<source>');
    expect(xml).toContain('<publisher>Acme &amp; Cia</publisher>');
    expect(xml).toContain('<publisherurl>https://app.exemplo.com/carreiras/acme</publisherurl>');
    expect(xml.match(/<job>/g)).toHaveLength(2);
    expect(xml).toContain('<title><![CDATA[Analista <Sr> & "Dados"]]></title>');
  });
  it('campos obrigatorios, link rastreado por origem e referencia unica', () => {
    expect(xml).toContain('<referencenumber><![CDATA[j1]]></referencenumber>');
    expect(xml).toContain('<url><![CDATA[https://app.exemplo.com/carreiras/acme/j1?src=indeed]]></url>');
    expect(xml).toContain('<date><![CDATA[Thu, 01 Oct 2026 12:00:00 GMT]]></date>');
    expect(xml).toContain('<city><![CDATA[São Paulo]]></city>');
    expect(xml).toContain('<state><![CDATA[SP]]></state>');
    expect(xml).toContain('<country><![CDATA[BR]]></country>');
    expect(xml).toContain('<jobtype><![CDATA[fulltime]]></jobtype>');
    expect(xml).toContain('<jobtype><![CDATA[contract]]></jobtype>');
  });
  it('descricao em texto puro e CDATA nao quebra com "]]>"; salario oculto fica em branco', () => {
    expect(xml).not.toContain('<p>');
    expect(xml).toContain('Trabalhe com ]]]]><![CDATA[> dados');
    expect(xml).toContain('<salary><![CDATA[R$ 5.000,00 - R$ 7.000,00 por mês]]></salary>');
    expect(xml).toContain('<salary></salary>');
  });
  it('JSON traz os mesmos campos e a flag PCD', () => {
    const json = buildJobFeedJson(company, [job()], 'https://app.exemplo.com', new Date('2026-10-30T10:00:00Z'));
    expect(json).toMatchObject({ company: { name: 'Acme & Cia' }, generatedAt: '2026-10-30T10:00:00.000Z' });
    expect(json.jobs[0]).toMatchObject({ id: 'j1', url: 'https://app.exemplo.com/carreiras/acme/j1', city: 'São Paulo', state: 'SP', remote: true, pcd: true, employmentType: 'FULL_TIME', validThrough: '2026-12-01T00:00:00.000Z' });
  });
  it('splitLocation reconhece "Cidade - UF", "Cidade, UF" e texto livre', () => {
    expect(splitLocation('Campinas, SP')).toEqual({ city: 'Campinas', state: 'SP' });
    expect(splitLocation('Rio de Janeiro/RJ')).toEqual({ city: 'Rio de Janeiro', state: 'RJ' });
    expect(splitLocation('Remoto')).toEqual({ city: 'Remoto', state: '' });
    expect(splitLocation(null)).toEqual({ city: '', state: '' });
  });
});

describe('RS-R-06 adaptadores de portais (stubs documentados)', () => {
  it('sem contrato/credencial nenhum adaptador esta configurado e publicar devolve 503', async () => {
    const all = jobBoardPublishers();
    expect(all.map((item) => item.board)).toEqual(['LINKEDIN', 'GUPY', 'INDEED', 'JOOBLE']);
    for (const item of all) {
      expect(item.isConfigured()).toBe(false);
      expect(item.requires.length).toBeGreaterThan(0);
      await expect(item.publish({ id: 'j1' } as never)).rejects.toBeInstanceOf(ServiceUnavailableException);
    }
  });
});

describe('RS-R-06 rota publica do feed (Nest + Fastify reais)', () => {
  let app: NestFastifyApplication;
  const publicJobs = vi.fn(async (key: string) => {
    if (key === 'nope') throw Object.assign(new Error('x'), { status: 404, getStatus: () => 404 });
    return { company, jobs: [job()] };
  });
  beforeAll(async () => {
    process.env.APP_URL = 'https://app.exemplo.com';
    const moduleRef = await Test.createTestingModule({ controllers: [PublicJobsController], providers: [{ provide: TurnstileService, useValue: { verify: vi.fn() } }, { provide: JobsService, useValue: { publicJobs, publicFeed: JobsService.prototype.publicFeed } }] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app?.close());

  it('feed.xml e feed.json sao publicos, com tipo e cache corretos', async () => {
    const x = await app.inject({ method: 'GET', url: '/public/jobs/company/acme/feed.xml' });
    expect(x.statusCode).toBe(200);
    expect(x.headers['content-type']).toContain('application/xml');
    expect(x.headers['cache-control']).toContain('max-age');
    expect(x.body).toContain('<referencenumber>');
    const j = await app.inject({ method: 'GET', url: '/public/jobs/company/acme/feed.json' });
    expect(j.statusCode).toBe(200);
    expect(j.json().jobs).toHaveLength(1);
  });
});
