import { BadRequestException } from '@nestjs/common';

export const LAUNCH_KINDS = ['FOLGA_EXTRA', 'FOLGA_BANCO', 'ATESTADO', 'FERIADO'] as const;
export type LaunchKind = (typeof LAUNCH_KINDS)[number];

export const MAX_RANGE_DAYS = 62;
export const MAX_PEOPLE = 300;
const DAY = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const LAUNCH_LABEL: Record<LaunchKind, string> = {
  FOLGA_EXTRA: 'Folga extra',
  FOLGA_BANCO: 'Folga pelo banco de horas',
  ATESTADO: 'Atestado médico',
  FERIADO: 'Feriado',
};

/** Todos os dias de start a end (AAAA-MM-DD), inclusive. Recusa datas inválidas, fim antes do início e períodos longos demais. */
export function expandDates(start: string, end: string): string[] {
  const s = String(start ?? '').slice(0, 10), e = String(end ?? '').slice(0, 10);
  if (!ISO_DAY.test(s) || !ISO_DAY.test(e)) throw new BadRequestException('Informe as datas no formato AAAA-MM-DD.');
  const from = Date.parse(`${s}T00:00:00Z`), to = Date.parse(`${e}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) throw new BadRequestException('Data inválida.');
  if (to < from) throw new BadRequestException('A data final não pode ser antes da inicial.');
  const total = Math.round((to - from) / DAY) + 1;
  if (total > MAX_RANGE_DAYS) throw new BadRequestException(`O período pode ter no máximo ${MAX_RANGE_DAYS} dias por lançamento.`);
  return Array.from({ length: total }, (_, i) => new Date(from + i * DAY).toISOString().slice(0, 10));
}

/** Folga pelo banco: precisa de saldo para todos os dias de trabalho do período. */
export function bankCheck(balanceMinutes: number, neededMinutes: number): { ok: boolean; message?: string } {
  if (neededMinutes <= 0) return { ok: false, message: 'Nenhum dia de trabalho neste período para abater do banco.' };
  if (balanceMinutes < neededMinutes) {
    const h = (m: number) => `${Math.floor(Math.max(0, m) / 60)}h${String(Math.max(0, m) % 60).padStart(2, '0')}`;
    return { ok: false, message: `Saldo do banco de horas insuficiente: tem ${h(balanceMinutes)} e o período precisa de ${h(neededMinutes)}.` };
  }
  return { ok: true };
}

/** Só aceita imagem ou PDF e confere os primeiros bytes (extensão sozinha pode ser falsa). */
export function checkCertificateFile(name: string, size: number, head: Buffer): string | null {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) return 'Envie uma foto (JPG, PNG, WEBP) ou um PDF do atestado.';
  if (size > 10 * 1024 * 1024) return 'O arquivo passa de 10 MB.';
  if (size < 100) return 'O arquivo está vazio.';
  const hex = head.subarray(0, 4).toString('hex').toUpperCase();
  const ok = ext === 'png' ? hex.startsWith('89504E47')
    : ext === 'jpg' || ext === 'jpeg' ? hex.startsWith('FFD8FF')
    : ext === 'pdf' ? head.subarray(0, 5).toString('ascii') === '%PDF-'
    : head.subarray(0, 4).toString('ascii') === 'RIFF'; // webp
  return ok ? null : 'O conteúdo do arquivo não corresponde à extensão (arquivo corrompido ou falsificado).';
}
