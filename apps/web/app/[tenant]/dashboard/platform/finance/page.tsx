'use client';

import Link from 'next/link';

export default function FinancePage({ params: { tenant } }: { params: { tenant: string } }) {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Gestão da Plataforma</h2>
          <div className="mt-4 flex gap-4 border-b border-slate-200">
            <Link href={`/${tenant}/dashboard/platform`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Empresas</Link>
            <Link href={`/${tenant}/dashboard/platform/plans`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Planos & Assinaturas</Link>
            <Link href={`/${tenant}/dashboard/platform/finance`} className="border-b-2 border-indigo-600 pb-2 text-sm font-bold text-indigo-600">Financeiro</Link>
            <Link href={`/${tenant}/dashboard/platform/permissions`} className="pb-2 text-sm font-medium text-slate-500 hover:text-slate-800">Permissões Globais</Link>
          </div>
        </div>
      </header>

      <div className="ops-card flex flex-col items-center justify-center rounded-[12px] border border-slate-200 bg-white p-12 text-center">
        <h3 className="text-xl font-black text-slate-800 mb-2">Módulo Financeiro (Em Breve)</h3>
        <p className="text-sm text-slate-500 max-w-md">Aqui você poderá ver as faturas, receita da plataforma, e integração com Asaas de forma automatizada.</p>
      </div>
    </div>
  );
}
