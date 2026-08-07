'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileSpreadsheet, Loader2, Upload, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { API_URL, api } from '@/app/lib/api';
import { readAuthSession } from '@/app/lib/auth-session';
import { PageHeader } from '@/app/components/platform-ui';

export default function EmployeesImportPage() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function downloadTemplate() {
    setError('');
    const response = await fetch(`${API_URL}/employees/import/template`, { headers: { Authorization: `Bearer ${readAuthSession().token || ''}` } });
    if (!response.ok) { setError('Não foi possível baixar o modelo.'); return; }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'modelo_importacao_funcionarios.xlsx'; anchor.click(); URL.revokeObjectURL(url);
  }

  async function validate(file?: File) {
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try { setResult(await api.employees.validateImport(file)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha ao validar arquivo.'); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!result?.valid || !result.importToken) return;
    setBusy(true); setError('');
    try {
      const confirmed = await api.employees.confirmImport(result.importToken);
      router.push('./');
      router.refresh();
      setResult({ ...result, confirmed });
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao confirmar importação.'); }
    finally { setBusy(false); }
  }

  return <div className="app-page">
    <div className="app-page-container flex flex-col gap-6">
      <PageHeader
        title="Importação por Excel"
        subtitle="Use somente o modelo .xlsx, com até 2 MB e 2.000 linhas."
        action={
          <Link href="./" className="btn btn-outline">
            <ArrowLeft size={15} /> Voltar
          </Link>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <button onClick={downloadTemplate} className="flex min-h-28 items-center gap-4 rounded-2xl border bg-white p-5 text-left"><Download className="text-[var(--color-brand)]" /><span><strong className="block">Baixar modelo</strong><small className="text-slate-500">Cabeçalhos e aba no formato correto</small></span></button>
        <label className="flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[var(--color-brand-300)] bg-[var(--color-brand-50)] p-5"><Upload className="text-[var(--color-brand)]" /><span><strong className="block">Selecionar arquivo .xlsx</strong><small className="text-slate-500">O arquivo será validado antes de importar</small></span><input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => validate(e.target.files?.[0])} /></label>
      </div>
    {busy && <div className="flex items-center gap-2 rounded-xl border bg-white p-4"><Loader2 className="animate-spin" /> Processando...</div>}
    {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</p>}
    {result && <div className="space-y-4 rounded-2xl border bg-white p-5">
      <div className="flex flex-wrap gap-3 text-sm"><span>Total: <b>{result.totalRows}</b></span><span className="text-emerald-700">Válidas: <b>{result.validRows}</b></span><span className="text-rose-700">Inválidas: <b>{result.invalidRows}</b></span></div>
      {result.errors?.length > 0 && <div className="max-h-72 overflow-auto rounded-xl bg-rose-50 p-3">{result.errors.map((item: any, index: number) => <p key={index} className="py-1 text-sm text-rose-700">Linha {item.row} — {item.column}: {item.message}</p>)}</div>}
      {result.preview?.length > 0 && <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Nome</th><th className="p-3">CPF</th><th className="p-3">E-mail</th><th className="p-3">Departamento</th><th className="p-3">Cargo</th><th className="p-3">Matrícula</th></tr></thead><tbody>{result.preview.map((row: any, index: number) => <tr key={index} className="border-b"><td className="p-3 font-bold">{row.name}</td><td className="p-3">{row.cpf}</td><td className="p-3">{row.email || '—'}</td><td className="p-3">{row.department}</td><td className="p-3">{row.position}</td><td className="p-3">{row.registration || '—'}</td></tr>)}</tbody></table></div>}
      {result.valid && <button disabled={busy} onClick={confirm} className="btn btn-primary h-11 w-full sm:w-auto"><FileSpreadsheet size={18} /> Confirmar importação de {result.validRows} funcionários</button>}
    </div>}
    </div>
  </div>;
}
