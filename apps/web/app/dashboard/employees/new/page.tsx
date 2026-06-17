export default function NewEmployeePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Funcionarios</p>
        <h2 className="text-2xl font-black text-slate-950">Novo funcionario</h2>
      </header>

      <form className="ops-card grid gap-4 rounded-[8px] border border-slate-200 bg-white p-5 sm:grid-cols-2">
        {['Nome', 'CPF', 'E-mail', 'Telefone', 'Cargo', 'Departamento', 'Data de admissao', 'Salario'].map((label) => (
          <label key={label} className="space-y-1 text-xs font-medium text-slate-600">
            <span>{label}</span>
            <input className="h-10 w-full rounded-[8px] border border-slate-200 px-3 text-sm outline-none focus:border-teal-500" />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button type="button" className="crystal-button h-10 rounded-[8px] px-4 text-xs font-black text-white">
            Salvar funcionario
          </button>
        </div>
      </form>
    </div>
  );
}
