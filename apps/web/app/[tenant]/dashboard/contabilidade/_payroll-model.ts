import type { PayrollIssue, PayrollSheetItem } from '@/app/lib/api';

export interface LinePreset { key: string; label: string; type: string; description: string; deduction: boolean }

/** Lançamentos que a contabilidade pode incluir à mão. A API valida o tipo e o motor refaz INSS, IRRF, FGTS e líquido. */
export const LINE_PRESETS: LinePreset[] = [
  { key: 'OT50', label: 'Hora extra 50%', type: 'OVERTIME', description: 'Horas extras 50%', deduction: false },
  { key: 'OT100', label: 'Hora extra 100%', type: 'OVERTIME', description: 'Horas extras 100%', deduction: false },
  { key: 'NIGHT', label: 'Adicional noturno', type: 'NIGHT_SHIFT', description: 'Adicional noturno', deduction: false },
  { key: 'BONUS', label: 'Bônus', type: 'BONUS', description: 'Bônus', deduction: false },
  { key: 'COMMISSION', label: 'Comissão', type: 'COMMISSION', description: 'Comissão', deduction: false },
  { key: 'VACATION', label: 'Adicional de férias', type: 'VACATION_ADDITION', description: 'Adicional de férias', deduction: false },
  { key: 'OTHER_EARNING', label: 'Outro provento', type: 'OTHER_EARNING', description: 'Outro provento', deduction: false },
  { key: 'ADVANCE', label: 'Adiantamento', type: 'ADVANCE', description: 'Adiantamento', deduction: true },
  { key: 'CLT_LOAN', label: 'Empréstimo CLT', type: 'CLT_LOAN', description: 'Empréstimo CLT', deduction: true },
  { key: 'CONSIGNADO', label: 'Consignado', type: 'CONSIGNADO', description: 'Consignado', deduction: true },
  { key: 'VT', label: 'Vale-transporte (máx. 6% do salário)', type: 'VALE_TRANSPORTE', description: 'Vale-transporte', deduction: true },
  { key: 'VA', label: 'Vale-alimentação', type: 'VALE_ALIMENTACAO', description: 'Vale-alimentação', deduction: true },
  { key: 'PENSAO', label: 'Pensão alimentícia', type: 'PENSAO_ALIMENTICIA', description: 'Pensão alimentícia', deduction: true },
  { key: 'PLANO', label: 'Plano de saúde', type: 'PLANO_SAUDE', description: 'Plano de saúde', deduction: true },
  { key: 'OTHER_DEDUCTION', label: 'Outro desconto', type: 'OTHER_DEDUCTION', description: 'Outro desconto', deduction: true },
];

export function presetOf(item: Pick<PayrollSheetItem, 'type' | 'description'>): LinePreset | undefined {
  const same = LINE_PRESETS.filter((p) => p.type === item.type);
  return same.find((p) => p.description === item.description) ?? same[0];
}

export function groupItems(items: PayrollSheetItem[]) {
  return {
    earnings: items.filter((i) => !i.isDeduction && i.type !== 'FGTS'),
    deductions: items.filter((i) => i.isDeduction),
    charges: items.filter((i) => i.type === 'FGTS'),
  };
}

export function validateLine(amount: string, reason: string): string | null {
  const n = Number(amount.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 'Informe um valor em R$ maior que zero.';
  if (reason.trim().length < 5) return 'Informe o motivo (mínimo 5 caracteres).';
  return null;
}

export const SEVERITY_LABEL: Record<PayrollIssue['severity'], string> = { ERROR: 'Erro', WARNING: 'Alerta' };
