export type DunningStage = 'NONE' | 'REMINDER' | 'WARNING' | 'BLOCK' | 'CANCEL';

export interface DunningConfig {
  /** Dias de atraso em que se envia o aviso de bloqueio iminente. */
  warnDay: number;
  /** Dia de atraso em que o acesso e bloqueado (reversivel ao pagar). */
  blockDay: number;
  /** Dia de atraso em que o cancelamento e efetivado. */
  cancelDay: number;
}

export function dunningConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DunningConfig {
  const n = (v: string | undefined, d: number) => (v != null && v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) > 0 ? Math.max(1, Math.floor(Number(v))) : d);
  const cfg = { warnDay: n(env.DUNNING_WARN_DAY, 3), blockDay: n(env.DUNNING_BLOCK_DAY, 5), cancelDay: n(env.DUNNING_CANCEL_DAY, 30) };
  // Garante a ordem aviso < bloqueio < cancelamento.
  if (cfg.blockDay < 2) cfg.blockDay = 2; // com bloqueio no dia 1 nao sobraria dia para lembrete e aviso
  if (cfg.warnDay >= cfg.blockDay) cfg.warnDay = Math.max(1, cfg.blockDay - 1);
  if (cfg.cancelDay <= cfg.blockDay) cfg.cancelDay = cfg.blockDay + 25;
  return cfg;
}

/** Regua de inadimplencia: estagio em que a fatura esta, pelos dias de atraso (>=1). Lembrete (antes do vencimento) e enviado em outra rotina. */
export function dunningStage(daysOverdue: number, cfg: DunningConfig): DunningStage {
  if (daysOverdue >= cfg.cancelDay) return 'CANCEL';
  if (daysOverdue >= cfg.blockDay) return 'BLOCK';
  if (daysOverdue >= cfg.warnDay) return 'WARNING';
  if (daysOverdue >= 1) return 'REMINDER';
  return 'NONE';
}