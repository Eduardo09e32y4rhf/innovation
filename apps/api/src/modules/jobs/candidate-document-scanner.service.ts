import { Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
// @ts-ignore - clamscan nao publica tipos (mesmo uso do modulo de suporte)
import NodeClam from 'clamscan';
import { Readable } from 'node:stream';

/**
 * Verificacao antivirus (ClamAV) dos documentos do candidato.
 * Em producao, scanner indisponivel BLOQUEIA o envio (falha fechada). Fora dela, permite com aviso no log.
 */
@Injectable()
export class CandidateDocumentScanner {
  private readonly logger = new Logger(CandidateDocumentScanner.name);
  private scanner: any = null;
  private lastAttempt = 0;

  private async getScanner() {
    if (this.scanner) return this.scanner;
    if (Date.now() - this.lastAttempt < 30_000) return null;
    this.lastAttempt = Date.now();
    try {
      this.scanner = await new NodeClam().init({
        clamdscan: {
          host: process.env.CLAMAV_HOST || 'localhost',
          port: parseInt(process.env.CLAMAV_PORT || '3310', 10),
          timeout: 60_000,
          local_fallback: false,
        },
      });
      return this.scanner;
    } catch (error) {
      this.logger.warn(`ClamAV indisponivel: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async assertClean(buffer: Buffer): Promise<void> {
    const production = process.env.NODE_ENV === 'production';
    const scanner = await this.getScanner();
    if (!scanner) {
      if (production) throw new ServiceUnavailableException('A verificacao de seguranca do arquivo esta indisponivel. Tente novamente em alguns minutos.');
      this.logger.warn('Documento aceito SEM scan (ambiente nao produtivo).');
      return;
    }
    let result: { isInfected?: boolean | null };
    try {
      result = await scanner.scanStream(Readable.from(buffer));
    } catch (error) {
      this.scanner = null;
      this.logger.warn(`Falha ao verificar arquivo: ${error instanceof Error ? error.message : String(error)}`);
      if (production) throw new ServiceUnavailableException('A verificacao de seguranca do arquivo falhou. Tente novamente em alguns minutos.');
      return;
    }
    if (result.isInfected) throw new UnprocessableEntityException('O arquivo foi recusado pela verificacao de seguranca.');
  }
}