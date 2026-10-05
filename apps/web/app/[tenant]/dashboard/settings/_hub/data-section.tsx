'use client';

import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui';
import { api } from '@/app/lib/api';
import { downloadFile } from '@/app/lib/download';

type Row = Record<string, unknown>;
type Validation = Awaited<ReturnType<typeof api.employees.validateImport>>;

const text = (value: unknown) => (value === null || value === undefined ? '' : typeof value === 'object' ? '' : String(value));
const nested = (row: Row, key: string) => text((row[key] as Row | undefined)?.name);

const EXPORTS: { id: string; label: string; hint: string; load: () => Promise<Row[]>; columns: [string, (row: Row) => string][] }[] = [
  { id: 'funcionarios', label: 'Funcionários', hint: 'Cadastro completo', load: async () => (await api.employees.list()) as unknown as Row[], columns: [
    ['Nome', (r) => text(r.name)], ['CPF', (r) => text(r.cpf)], ['E-mail', (r) => text(r.email)], ['Matrícula', (r) => text(r.registrationNumber ?? r.registration)],
    ['Departamento', (r) => text(r.department) || nested(r, 'department')], ['Cargo', (r) => text(r.position) || text(r.role)], ['Status', (r) => text(r.status)], ['Admissão', (r) => text(r.admissionDate ?? r.hireDate).slice(0, 10)],
  ] },
  { id: 'ferias', label: 'Férias', hint: 'Pedidos e períodos', load: async () => (await api.vacations.list()) as unknown as Row[], columns: [
    ['Funcionário', (r) => nested(r, 'employee') || text(r.employeeName)], ['Início', (r) => text(r.startDate).slice(0, 10)], ['Fim', (r) => text(r.endDate).slice(0, 10)], ['Dias', (r) => text(r.days)], ['Status', (r) => text(r.status)],
  ] },
];

function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function saveCsv(name: string, header: string[], lines: string[][]) {
  const body = [header, ...lines].map((line) => line.map(csvCell).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function DataSection() {
  const [busy, setBusy] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<Validation | null>(null);

  async function exportData(item: (typeof EXPORTS)[number]) {
    setBusy(item.id);
    try {
      const rows = await item.load();
      if (!rows.length) return void toast.info('Não há dados para exportar.');
      saveCsv(item.id, item.columns.map(([label]) => label), rows.map((row) => item.columns.map(([, get]) => get(row))));
      toast.success(`${rows.length} registro(s) exportados.`);
    } catch (cause) { toast.error(cause instanceof Error && cause.message ? cause.message : 'Não foi possível exportar.'); }
    finally { setBusy(null); }
  }

  async function template() {
    setBusy('template');
    try { await downloadFile('/employees/import/template', 'modelo-funcionarios.xlsx'); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível baixar o modelo.'); }
    finally { setBusy(null); }
  }

  async function validate() {
    if (!file) return;
    setBusy('validate'); setValidation(null);
    try { setValidation(await api.employees.validateImport(file)); }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível validar o arquivo.'); }
    finally { setBusy(null); }
  }

  async function confirm() {
    if (!validation?.importToken) return;
    setBusy('confirm');
    try {
      const result = await api.employees.confirmImport(validation.importToken);
      toast.success(`${result.imported} funcionário(s) importados.`);
      setValidation(null); setFile(null);
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Não foi possível concluir a importação.'); }
    finally { setBusy(null); }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-bg p-5 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-fg">Exportar planilhas</h3><p className="text-xs text-fg-sub">Abre no Excel. Contém dados pessoais: guarde com cuidado.</p>
        <ul className="space-y-2">
          {EXPORTS.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <span><span className="block text-sm font-medium">{item.label}</span><span className="block text-xs text-fg-sub">{item.hint} · CSV</span></span>
              <Button variant="outline" size="sm" isLoading={busy === item.id} onClick={() => exportData(item)}><Download size={14} aria-hidden="true" /> Baixar</Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-bg p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-fg">Importar funcionários</h3>
          <Button variant="ghost" size="sm" isLoading={busy === 'template'} onClick={template}><FileSpreadsheet size={14} aria-hidden="true" /> Modelo XLSX</Button>
        </div>
        <p className="text-xs text-fg-sub">1. Baixe o modelo · 2. Preencha · 3. Envie e valide · 4. Confirme a importação.</p>
        <input type="file" accept=".xlsx" aria-label="Arquivo XLSX" className="input-v2 w-full text-sm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setValidation(null); }} />
        <Button variant="outline" disabled={!file} isLoading={busy === 'validate'} onClick={validate}><Upload size={14} aria-hidden="true" /> Validar arquivo</Button>

        {validation && (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm" role="status">
            <p><strong>{validation.validRows}</strong> válida(s) de {validation.totalRows}{validation.invalidRows > 0 && <> · <span className="text-rose-700">{validation.invalidRows} com erro</span></>}</p>
            {validation.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-auto text-xs text-rose-700">
                {validation.errors.slice(0, 30).map((item, index) => <li key={index}>Linha {item.row} · {item.column}: {item.message}</li>)}
              </ul>
            )}
            {validation.importToken && validation.validRows > 0
              ? <Button isLoading={busy === 'confirm'} onClick={confirm}>Importar {validation.validRows} funcionário(s)</Button>
              : <p className="text-xs text-fg-sub">Corrija o arquivo e valide novamente.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
