import { createHash } from 'crypto';
import { getDistanceInMeters } from '../../../common/utils/geo.utils';

export interface FencePoint {
  id: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface FenceVerdict {
  configured: boolean;
  inside: boolean;
  distanceMeters: number | null;
  fence: FencePoint | null;
}

/** Avalia a posição contra as cercas; com várias cercas, vale a mais próxima (dentro de qualquer uma = dentro). */
export function evaluateFences(latitude: number, longitude: number, fences: FencePoint[]): FenceVerdict {
  if (!fences.length) return { configured: false, inside: true, distanceMeters: null, fence: null };
  let best: { fence: FencePoint; distance: number; margin: number } | null = null;
  for (const fence of fences) {
    const distance = getDistanceInMeters(latitude, longitude, fence.latitude, fence.longitude);
    const margin = distance - fence.radiusMeters;
    if (!best || margin < best.margin) best = { fence, distance, margin };
  }
  return {
    configured: true,
    inside: best!.margin <= 0,
    distanceMeters: Math.round(best!.distance),
    fence: best!.fence,
  };
}

export function speedKmh(
  from: { latitude: number; longitude: number; at: Date },
  to: { latitude: number; longitude: number; at: Date },
): number {
  const hours = Math.abs(to.at.getTime() - from.at.getTime()) / 3_600_000;
  if (hours <= 0) return Number.POSITIVE_INFINITY;
  const km = getDistanceInMeters(from.latitude, from.longitude, to.latitude, to.longitude) / 1000;
  return km / hours;
}

export type PunchType = 'ENTRY' | 'LUNCH_START' | 'LUNCH_RETURN' | 'EXIT';

export function nextPunchType(track?: { entry?: unknown; lunchStart?: unknown; lunchReturn?: unknown; exit?: unknown } | null): PunchType | null {
  if (!track?.entry) return 'ENTRY';
  if (!track.lunchStart) return 'LUNCH_START';
  if (!track.lunchReturn) return 'LUNCH_RETURN';
  if (!track.exit) return 'EXIT';
  return null;
}

export const PUNCH_TYPE_LABEL: Record<PunchType, string> = {
  ENTRY: 'Entrada',
  LUNCH_START: 'Saída para intervalo',
  LUNCH_RETURN: 'Volta do intervalo',
  EXIT: 'Saída',
};

/** Comprovante: hash curto e verificável da batida (não contém dados pessoais). */
export function punchReceipt(input: { companyId: string; employeeId: string; occurredAt: Date; type: string; latitude?: number | null; longitude?: number | null; nonce: string }) {
  const raw = [input.companyId, input.employeeId, input.occurredAt.toISOString(), input.type, input.latitude ?? '', input.longitude ?? '', input.nonce].join('|');
  return createHash('sha256').update(raw).digest('hex').slice(0, 24).toUpperCase();
}

export function describeDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}
