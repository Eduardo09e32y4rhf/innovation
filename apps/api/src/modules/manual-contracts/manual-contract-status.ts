export const MANUAL_CONTRACT_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'PENDING_ACCEPTANCE',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATION_SCHEDULED',
  'ENDED',
  'CANCELED',
  'EXPIRED',
] as const;

export type ManualContractStatus = (typeof MANUAL_CONTRACT_STATUSES)[number];

export const MANUAL_CONTRACT_TRANSITIONS: Record<ManualContractStatus, readonly ManualContractStatus[]> = {
  DRAFT: ['IN_REVIEW', 'CANCELED'],
  IN_REVIEW: ['DRAFT', 'PENDING_ACCEPTANCE', 'CANCELED'],
  PENDING_ACCEPTANCE: ['IN_REVIEW', 'ACTIVE', 'CANCELED'],
  ACTIVE: ['SUSPENDED', 'TERMINATION_SCHEDULED', 'ENDED', 'CANCELED', 'EXPIRED'],
  SUSPENDED: ['ACTIVE', 'TERMINATION_SCHEDULED', 'ENDED', 'CANCELED', 'EXPIRED'],
  TERMINATION_SCHEDULED: ['ACTIVE', 'SUSPENDED', 'ENDED', 'CANCELED', 'EXPIRED'],
  ENDED: [],
  CANCELED: [],
  EXPIRED: [],
};

export const IMMUTABLE_CONTRACT_STATUSES = new Set<ManualContractStatus>([
  'PENDING_ACCEPTANCE',
  'ACTIVE',
  'SUSPENDED',
  'TERMINATION_SCHEDULED',
  'ENDED',
  'CANCELED',
  'EXPIRED',
]);

export function isManualContractStatus(value: string): value is ManualContractStatus {
  return MANUAL_CONTRACT_STATUSES.includes(value as ManualContractStatus);
}
