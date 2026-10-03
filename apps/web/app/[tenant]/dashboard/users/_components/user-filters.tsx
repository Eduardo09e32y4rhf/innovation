import { Search, X } from 'lucide-react';
import { Button } from '@/app/components/ui';
import { ROLE_LABEL } from '@/app/lib/format';
import type { PlatformCompany, UserRole } from '@/app/lib/api';

export interface UserFilterState { search: string; role: string; status: string; link: string; company: string; }
interface UserFiltersProps {
  filters: UserFilterState; onChange: (filters: UserFilterState) => void;
  companies: PlatformCompany[]; showCompanyFilter: boolean; availableRoles: UserRole[];
}
export function UserFilters({ filters, onChange, companies, showCompanyFilter, availableRoles }: UserFiltersProps) {
  const update = (key: keyof UserFilterState, value: string) => onChange({ ...filters, [key]: value });
  const active = Object.values(filters).filter(Boolean).length;
  const cls = 'input-v2 min-h-11 w-full text-base sm:text-sm';
  return <div className="space-y-4">
    <div className="grid items-end gap-3 md:grid-cols-2">
      <label className="block space-y-2 text-sm font-medium"><span>Buscar usuários</span>
        <div className="relative"><Search size={18} aria-hidden="true" className="absolute left-3 top-3 text-fg-mut" />
          <input type="search" value={filters.search} onChange={event => update('search', event.target.value)}
            placeholder="Nome ou e-mail" className={`${cls} pl-10`} />
        </div>
      </label>
      {showCompanyFilter && <label className="block space-y-2 text-sm font-medium"><span>Empresa</span>
        <select value={filters.company} onChange={event => update('company', event.target.value)} className={cls}>
          <option value="">Todas as empresas</option>
          {companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>}
    </div>
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="block space-y-2 text-sm font-medium"><span>Perfil</span>
        <select value={filters.role} onChange={event => update('role', event.target.value)} className={cls}>
          <option value="">Todos os perfis</option>
          {availableRoles.map(role => <option key={role} value={role}>{ROLE_LABEL[role] ?? role}</option>)}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium"><span>Situação do acesso</span>
        <select value={filters.status} onChange={event => update('status', event.target.value)} className={cls}>
          <option value="">Todas as situações</option><option value="ativos">Ativos</option>
          <option value="bloqueados">Bloqueados</option><option value="pendente">Troca de senha pendente</option>
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium"><span>Vínculo com funcionário</span>
        <select value={filters.link} onChange={event => update('link', event.target.value)} className={cls}>
          <option value="">Todos os vínculos</option><option value="com">Com funcionário</option><option value="sem">Sem funcionário</option>
        </select>
      </label>
      {active > 0 && <Button type="button" variant="outline" onClick={() => onChange({ search: '', role: '', status: '', link: '', company: '' })}>
        <X size={18} aria-hidden="true" />Limpar filtros ({active})
      </Button>}
    </div>
  </div>;
}
