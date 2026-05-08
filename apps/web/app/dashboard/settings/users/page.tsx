import { UserPlus } from 'lucide-react';
import { SettingsHero, SettingsPanel } from '../_components/settings-ui';

const roles = ['admin_master', 'company_admin', 'hr', 'finance', 'supervisor', 'employee'];

export default function UsersSettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SettingsHero title="Usuarios e Permissoes" description="Controle membros, cargos e acessos aos modulos da empresa." />

      <SettingsPanel
        title="Usuarios e permissoes"
        description="Membros ativos e pendentes da empresa."
        action={
          <button className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#07111f] px-4 text-xs font-black text-white shadow-[0_12px_24px_rgba(2,6,23,0.22)]">
            <UserPlus size={13} />
            Convidar
          </button>
        }
      >
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="pb-3 font-bold">Usuario</th>
              <th className="pb-3 font-bold">Cargo</th>
              <th className="pb-3 font-bold">Status</th>
              <th className="pb-3 text-right font-bold">Acoes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200">
              <td className="py-3 text-xs text-slate-800">
                <p className="font-bold">local-user</p>
                <p className="text-slate-500">local-user</p>
              </td>
              <td className="py-3">
                <select className="h-9 w-80 rounded-[10px] border border-slate-300 bg-white px-3 text-xs text-slate-800 shadow-inner">
                  {roles.map((role) => (
                    <option key={role}>{role}</option>
                  ))}
                </select>
              </td>
              <td className="py-3">
                <span className="rounded-full bg-[#07111f] px-2 py-1 text-[10px] font-black text-white">active</span>
              </td>
              <td className="py-3 text-right">
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm">Desativar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </SettingsPanel>
    </div>
  );
}
