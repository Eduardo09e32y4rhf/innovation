import type { AccountingPeriodStatus } from '@/app/lib/api';
import { statusLabel, statusTone } from './_model';

export function StatusBadge({ status }: { status: AccountingPeriodStatus | null | undefined }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(status)}`}>{statusLabel(status)}</span>;
}
