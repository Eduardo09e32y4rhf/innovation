import { ServiceUnavailableException } from '@nestjs/common';
import type { FeedCompany, FeedJob } from './job-feed';

/**
 * Ponto de extensao para publicar vagas diretamente em portais por API (RS-R-06, fase 2).
 * Hoje os portais leem o feed publico (`/public/jobs/company/:empresa/feed.xml|json`). Cada adaptador abaixo e um STUB:
 * so passa a funcionar quando o usuario fornece o que esta em `requires`. Nenhuma credencial e lida do ambiente aqui
 * (se vierem a existir, precisam ser variaveis OPCIONAIS repassadas em docker-compose.prod.yml, .env.example e COMPOSE_API_PASSTHROUGH_ENV).
 */
export type JobBoard = 'LINKEDIN' | 'GUPY' | 'INDEED' | 'JOOBLE';

export interface JobBoardPublisher {
  readonly board: JobBoard;
  /** O que o usuario precisa providenciar (contrato, parceria, credencial) para ativar. */
  readonly requires: string[];
  isConfigured(): boolean;
  publish(job: FeedJob, company?: FeedCompany): Promise<{ externalId: string; url?: string }>;
  close(externalId: string): Promise<void>;
}

class StubPublisher implements JobBoardPublisher {
  constructor(readonly board: JobBoard, readonly requires: string[]) {}
  isConfigured() { return false; }
  private unavailable(): never {
    throw new ServiceUnavailableException(`A publicação direta no ${this.board} ainda não está ativada: depende de ${this.requires.join('; ')}. Enquanto isso, use o feed público de vagas.`);
  }
  async publish(): Promise<{ externalId: string }> { return this.unavailable(); }
  async close(): Promise<void> { return this.unavailable(); }
}

export const jobBoardPublishers = (): JobBoardPublisher[] => [
  new StubPublisher('LINKEDIN', ['parceria LinkedIn Talent Solutions (Job Posting API / Limited Listings) aprovada', 'credenciais OAuth da aplicacao e id da pagina da empresa']),
  new StubPublisher('GUPY', ['contrato com a Gupy e chave de API de parceiro', 'mapeamento das etapas do funil com o suporte da Gupy']),
  new StubPublisher('INDEED', ['conta de empregador/ATS aprovada no Indeed (Job Sync)', 'cadastro da URL do feed XML no painel do Indeed']),
  new StubPublisher('JOOBLE', ['cadastro do feed XML na Jooble (solicitar ao time de parceiros)']),
];
