'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, FileSpreadsheet, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button, ConfirmDialog, PageHeader } from '@/app/components/ui';
import { useAuth } from '@/app/contexts/AuthContext';
import { API_URL, api } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';

type ImportValidation = Awaited<ReturnType<typeof api.employees.validateImport>>;
type ImportResult = Awaited<ReturnType<typeof api.employees.confirmImport>>;

export default function EmployeesImportPage() {
  const tenant = String(useParams()?.tenant ?? '');
  const { user } = useAuth();
  const canImport = ['DEV', 'ADMIN', 'RH'].includes(user?.profile?.toUpperCase() ?? '');
  const destination = '/' + tenant + '/dashboard/employees';
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ImportValidation | null>(null);
  const [confirmed, setConfirmed] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'validate' | 'confirm' | 'download' | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);

  async function downloadTemplate() {
    if (lock.current) return;
    lock.current = true; setBusy('download'); setError('');
    try {
      const token = readAuthSession().token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');
      const response = await fetch(API_URL + '/employees/import/template', { headers: { Authorization: 'Bearer ' + token } });
      if (!response.ok) throw new Error('Não foi possível baixar o modelo. Tente novamente.');
      const url = URL.createObjectURL(await response.blob());
      try { const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'modelo_importacao_funcionarios.xlsx'; anchor.click(); } finally { URL.revokeObjectURL(url); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao baixar modelo.'); }
    finally { setBusy(null); lock.current = false; }
  }
  function selectFile(value?: File) {
    setValidation(null); setConfirmed(null); setError(''); setFile(null);
    if (!value) return;
    if (!value.name.toLocaleLowerCase().endsWith('.xlsx')) { setError('Selecione um arquivo no formato XLSX.'); return; }
    if (value.size > 2 * 1024 * 1024) { setError('O arquivo deve ter no máximo 2 MB.'); return; }
    setFile(value);
  }
  async function validate() {
    if (!file || lock.current) return;
    lock.current = true; setBusy('validate'); setError(''); setValidation(null);
    try { setValidation(await api.employees.validateImport(file)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao validar o arquivo.'); }
    finally { setBusy(null); lock.current = false; }
  }
  async function confirm() {
    if (!validation?.valid || !validation.importToken || confirmed || lock.current) return;
    lock.current = true; setBusy('confirm'); setError('');
    try {
      const result = await api.employees.confirmImport(validation.importToken);
      setConfirmed(result); setValidation(previous => ({ ...previous, importToken: null })); setConfirmOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Falha ao confirmar a importação.'); setConfirmOpen(false); }
    finally { setBusy(null); lock.current = false; }
  }

  return <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
    <PageHeader title="Importar funcionários" subtitle="Baixe o modelo XLSX, valide o arquivo e revise os dados antes de confirmar. Limites: 2 MB e 2.000 linhas." actions={<Link href={destination} className="btn btn-outline btn-md"><ArrowLeft size={18} aria-hidden="true" /> Voltar para Funcionários</Link>} />
    {!canImport ? <p role="status" className="card-v2 p-4 text-sm">Este perfil não permite importar funcionários.</p> : <>
      <ol aria-label="Etapas da importação" className="grid gap-3 sm:grid-cols-3">{['1. Selecionar arquivo', '2. Validar e revisar', '3. Confirmar importação'].map((step, index) => <li key={step} aria-current={(confirmed ? index === 2 : validation ? index === 1 : index === 0) ? 'step' : undefined} className="card-v2 p-4 text-sm font-medium">{step}</li>)}</ol>
      <section className="card-v2 space-y-4 p-4 sm:p-6">
        <h2 className="font-semibold">Arquivo de funcionários</h2>
        <Button type="button" variant="outline" disabled={!!busy} isLoading={busy === 'download'} onClick={downloadTemplate}><Download size={18} aria-hidden="true" /> Baixar modelo XLSX</Button>
        <label className="block space-y-2 text-sm font-medium">Selecionar ou substituir arquivo<input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={!!busy} className="block w-full min-w-0 rounded-lg border border-border p-3 text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-bg-sub file:px-4 file:text-fg" onChange={event => selectFile(event.target.files?.[0])} /></label>
        {file && <p className="break-words text-sm text-fg-sub">{file.name} · {(file.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB</p>}
        <div className="flex flex-wrap gap-2"><Button type="button" disabled={!file || !!busy || !!confirmed} isLoading={busy === 'validate'} onClick={validate}><Upload size={18} aria-hidden="true" />{validation || error ? 'Validar novamente' : 'Validar arquivo'}</Button>{file && <Button type="button" variant="ghost" disabled={!!busy} onClick={() => { selectFile(); if (input.current) input.current.value = ''; }}>Remover arquivo</Button>}</div>
      </section>
      {busy && <p role="status" className="text-sm text-fg-sub">{busy === 'confirm' ? 'Importando funcionários…' : busy === 'validate' ? 'Validando arquivo…' : 'Baixando modelo…'}</p>}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
      {validation && <section className="card-v2 space-y-4 p-4 sm:p-6">
        <h2 className="font-semibold">Revisão do arquivo</h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">{[['Total', validation.totalRows], ['Válidas', validation.validRows], ['Inválidas', validation.invalidRows]].map(([label, value]) => <div key={label} className="rounded-lg border border-border p-3"><dt className="text-fg-sub">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl>
        {validation.errors.length > 0 && <div role="region" aria-label="Erros de validação por linha" tabIndex={0} className="max-h-72 overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3">{validation.errors.map((item, index) => <p key={index} className="py-1 text-sm text-rose-800">Linha {item.row} · {item.column}: {item.message}</p>)}</div>}
        {validation.preview.length > 0 && <div role="region" aria-label="Prévia dos funcionários" tabIndex={0} className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><caption className="py-3 text-left text-sm text-fg-sub">Prévia de {validation.preview.length} linhas. A confirmação considera {validation.validRows} linhas válidas.</caption><thead className="border-b border-border bg-bg-sub"><tr>{['Nome', 'CPF', 'E-mail', 'Departamento', 'Cargo', 'Matrícula'].map(label => <th scope="col" className="p-3 font-medium" key={label}>{label}</th>)}</tr></thead><tbody>{validation.preview.map((row, index) => <tr key={index} className="border-b border-border"><th scope="row" className="p-3 font-semibold">{String(row.name ?? '')}</th>{['cpf', 'email', 'department', 'position', 'registration'].map(field => <td className="p-3" key={field}>{String(row[field] || '—')}</td>)}</tr>)}</tbody></table></div>}
        {!confirmed && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-sm text-fg-sub">{validation.valid ? 'Arquivo validado. Confira a prévia antes de confirmar.' : 'Corrija os erros no XLSX e valide o arquivo novamente.'}</p><Button type="button" disabled={!validation.valid || !validation.importToken || !!busy} onClick={() => setConfirmOpen(true)}><FileSpreadsheet size={18} aria-hidden="true" />Confirmar importação ({validation.validRows})</Button></div>}
      </section>}
      {confirmed && <section aria-live="polite" className="card-v2 space-y-4 p-4 sm:p-6"><h2 className="font-semibold">Resultado da importação</h2><div className="grid gap-3 sm:grid-cols-2">{[['Importados com sucesso', confirmed.imported], ['Processados', confirmed.totalProcessed], ['Inválidos/Erros', confirmed.invalidRows]].map(([label, value]) => <div key={label} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><dt className="text-sm text-fg-sub">{label}</dt><dd className="mt-1 text-xl font-semibold text-emerald-700">{value}</dd></div>)}</div>{confirmed.results && confirmed.results.length > 0 && <div className="space-y-2"><p className="text-sm font-medium text-fg-sub">Detalhes dos resultados:</p><ul className="space-y-1 text-sm">{confirmed.results.slice(0, 10).map((r, i) => <li key={i} className="text-fg-sub">{typeof r === 'string' ? r : r.error || `${r.employeeId ?? `Linha ${i + 1}`}: sucesso`}</li>)}</ul>{confirmed.results.length > 10 && <p className="text-xs text-fg-sub">+ {confirmed.results.length - 10} resultados não exibidos</p>}</div>}<Link href={destination} className="btn btn-primary btn-md mt-2">Ver todos os funcionários</Link></section>}
      <ConfirmDialog isOpen={confirmOpen} onClose={() => !busy && setConfirmOpen(false)} onConfirm={confirm} title="Confirmar importação?" description={'Serão enviados ' + (validation?.validRows ?? 0) + ' funcionários validados do arquivo ' + (file?.name ?? '') + ' para a empresa atual.'} confirmText="Importar funcionários" variant="primary" isLoading={busy === 'confirm'} />
    </>}
  </div>;
}
