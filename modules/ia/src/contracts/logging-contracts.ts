export interface IALogEntry {
  action: 'parse_resume' | 'screen_candidate' | 'analyze_sentiment' | 'bridge_python';
  actor?: string;
  referenceId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
  level?: 'debug' | 'info' | 'warn' | 'error';
  timestamp?: string;
}

export interface IALogResult {
  accepted: boolean;
  provider: 'console' | 'database' | 'remote';
  id?: string;
  storedAt?: string;
}
