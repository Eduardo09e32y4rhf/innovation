const users = [
  { name: 'Admin RH', email: 'admin@innovationrhconnect.com', role: 'ADMIN', status: 'Ativo' },
  { name: 'Pessoa RH', email: 'rh@innovationrhconnect.com', role: 'RH', status: 'Ativo' },
  { name: 'Gestor Operacional', email: 'gestor@innovationrhconnect.com', role: 'GESTOR', status: 'Ativo' },
];

export default function UsersPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600">Usuarios</p>
        <h2 className="text-2xl font-black text-slate-950">Permissoes de acesso</h2>
      </header>

      <section className="ops-card overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-[11px] font-medium text-slate-500">
                <th className="pb-3 pr-4">Nome</th>
                <th className="pb-3 pr-4">E-mail</th>
                <th className="pb-3 pr-4">Perfil</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-t border-slate-100 text-xs text-slate-700">
                  <td className="py-3 pr-4 font-medium text-slate-950">{user.name}</td>
                  <td className="py-3 pr-4">{user.email}</td>
                  <td className="py-3 pr-4">{user.role}</td>
                  <td className="py-3">{user.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
