import type { IABaseResponse } from '../contracts/common.js';
import type { IALogEntry, IALogResult } from '../contracts/logging-contracts.js';
import type { ResumeParseInput, ResumeParseResult } from '../contracts/resume-contracts.js';
import type { ScreeningInput, ScreeningResult } from '../contracts/screening-contracts.js';
import type { SentimentInput, SentimentResult } from '../contracts/sentiment-contracts.js';

export interface IABridgePorts {
  parseResume(input: ResumeParseInput): Promise<IABaseResponse<ResumeParseResult>>;
  screenCandidate(input: ScreeningInput): Promise<IABaseResponse<ScreeningResult>>;
  analyzeSentiment(input: SentimentInput): Promise<IABaseResponse<SentimentResult>>;
  log(entry: IALogEntry): Promise<IABaseResponse<IALogResult>>;
}

export class IAOrchestrator {
  constructor(private readonly ports: IABridgePorts) {}

  parseResume(input: ResumeParseInput) {
    return this.ports.parseResume(input);
  }

  screenCandidate(input: ScreeningInput) {
    return this.ports.screenCandidate(input);
  }

  analyzeSentiment(input: SentimentInput) {
    return this.ports.analyzeSentiment(input);
  }

  log(entry: IALogEntry) {
    return this.ports.log(entry);
  }
}
