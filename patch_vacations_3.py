import re

file_path = 'apps/web/app/dashboard/vacations/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 4. Modify the Table to handle 'alerts'
old_table_section = '''      {vacations.loading ? (
        <LoadingState label="Carregando solicitações..." />
      ) : vacations.error ? (
        <ErrorState message={vacations.error} onRetry={vacations.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhuma solicitação de férias registrada." />
      ) : (
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">'''

new_table_section = '''      {tab === 'alerts' ? (
        <section className="overflow-hidden rounded-[18px] border border-amber-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
          <div className="border-b border-amber-100 bg-amber-50/50 px-5 py-4">
            <h3 className="text-sm font-black text-amber-900">Avisos de Férias Pendentes</h3>
            <p className="mt-1 text-xs text-amber-700">Funcionários que já completaram o período aquisitivo e ainda possuem saldo de férias para tirar. Evite multas programando as férias antes do vencimento do segundo período.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="bg-white text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 border-b border-slate-100">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Admissão</th>
                  <th className="px-6 py-4">Tempo de Casa</th>
                  <th className="px-6 py-4 text-right">Saldo Restante (Dias)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertEmployees.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-sm font-semibold text-slate-500">Nenhum alerta de férias pendentes.</td></tr>
                )}
                {alertEmployees.map((emp: any) => {
                  const danger = emp.el.monthsSinceAdmission >= 22; // 22 months means close to 24 (multa em dobro)
                  return (
                    <tr key={emp.id} className="group transition-all duration-200 hover:bg-slate-50/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={lex h-10 w-10 items-center justify-center rounded-[10px] text-sm font-black text-white shadow-sm }>
                            {emp.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-950">{normalizeDisplayName(emp.name) ?? '—'}</p>
                            {danger && (
                              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                                <AlertTriangle size={10} strokeWidth={2.5} />
                                Risco de multa (dobro)
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">{formatDate(emp.admissionDate)}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-600">{emp.el.remainingYearsText}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={inline-flex items-center justify-center rounded-[8px] px-3 py-1.5 text-xs font-black shadow-sm }>
                          {emp.remainingDaysTotal} dias
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : vacations.loading ? (
        <LoadingState label="Carregando solicitações..." />
      ) : vacations.error ? (
        <ErrorState message={vacations.error} onRetry={vacations.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState message="Nenhuma solicitação de férias registrada." />
      ) : (
        <section className="overflow-hidden rounded-[18px] border border-slate-200/60 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">'''

content = content.replace(old_table_section, new_table_section)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Tabs patched 3')
