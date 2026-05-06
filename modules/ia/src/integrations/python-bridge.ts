import type { IABaseResponse } from '../contracts/common.js';
import type { IALogEntry, IALogResult } from '../contracts/logging-contracts.js';
import type { ResumeParseInput, ResumeParseResult } from '../contracts/resume-contracts.js';
import type { ScreeningInput, ScreeningResult } from '../contracts/screening-contracts.js';
import type { SentimentInput, SentimentResult } from '../contracts/sentiment-contracts.js';

export interface PythonIAConfig {
  baseUrl: string;
  timeoutMs?: number;
  endpoints?: {
    parseResume?: string;
    screenCandidate?: string;
    analyzeSentiment?: string;
    logEvent?: string;
  };
}

export interface PythonIAClient {
  parseResume(input: ResumeParseInput): Promise<IABaseResponse<ResumeParseResult>>;
  screenCandidate(input: ScreeningInput): Promise<IABaseResponse<ScreeningResult>>;
  analyzeSentiment(input: SentimentInput): Promise<IABaseResponse<SentimentResult>>;
  log(entry: IALogEntry): Promise<IABaseResponse<IALogResult>>;
}

export class ConsolePythonIAClient implements PythonIAClient {
  constructor(private readonly config: PythonIAConfig) {}

  async parseResume(input: ResumeParseInput): Promise<IABaseResponse<ResumeParseResult>> {
    return this.respond('parseResume', input as unknown as Record<string, unknown>);
  }

  async screenCandidate(input: ScreeningInput): Promise<IABaseResponse<ScreeningResult>> {
    return this.respond('screenCandidate', input as unknown as Record<string, unknown>);
  }

  async analyzeSentiment(input: SentimentInput): Promise<IABaseResponse<SentimentResult>> {
    return this.respond('analyzeSentiment', input as unknown as Record<string, unknown>);
  }

  async log(entry: IALogEntry): Promise<IABaseResponse<IALogResult>> {
    return this.respond('log', entry as unknown as Record<string, unknown>);
  }

  private async respond<T>(operation: string, payload: Record<string, unknown>): Promise<IABaseResponse<T>> {
    const traceId = `py-bridge-${operation}-${Date.now()}`;
    console.info('[IA bridge]', { baseUrl: this.config.baseUrl, operation, traceId, payload });
    return {
      ok: true,
      traceId,
      data: {
        accepted: true,
        provider: 'console',
      } as unknown as T,
      meta: {
        operation,
        bridge: 'console',
      },
    };
  }
}
