import { Search, Building2, Shield, Activity, Link as LinkIcon, X } from 'lucide-react';
import { ROLE_LABEL } from '@/app/lib/format';
import type { UserRole } from '@/app/lib/api';

export interface UserFilterState {
  search: string;
  role: string;
  status: string;
  link: string;
  company: string;
}

interface UserFiltersProps {
  filters: UserFilterState;
  onChange: (filters: UserFilterState) => void;
  uniqueCompanies: string[];
  showCompanyFilter: boolean;
  availableRoles: UserRole[];
}

export function UserFilters({
  filters,
  onChange,
  uniqueCompanies,
  showCompanyFilter,
  availableRoles,
}: UserFiltersProps) {
  const update = (key: keyof UserFilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search || filters.role || filters.status || filters.link || filters.company;

  const clearFilters = () => {
    onChange({
      search: '',
      role: '',
      status: '',
      link: '',
      company: '',
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="form-control pl-10"
          />
        </div>

        {showCompanyFilter && uniqueCompanies.length > 0 && (
          <div className="relative sm:w-56">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filters.company}
              onChange={(e) => update('company', e.target.value)}
              className="form-control pl-10"
            >
              <option value="">Todas as empresas</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-48">
          <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={filters.role}
            onChange={(e) => update('role', e.target.value)}
            className="form-control pl-10"
          >
            <option value="">Todos os perfis</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role] ?? role}
              </option>
            ))}
          </select>
        </div>

        <div className="relative sm:w-56">
          <Activity size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={filters.status}
            onChange={(e) => update('status', e.target.value)}
            className="form-control pl-10"
          >
            <option value="">Todos os status</option>
            <option value="ativos">Ativos</option>
            <option value="bloqueados">Bloqueados</option>
            <option value="pendente">Troca de senha pendente</option>
          </select>
        </div>

        <div className="relative sm:w-56">
          <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={filters.link}
            onChange={(e) => update('link', e.target.value)}
            className="form-control pl-10"
          >
            <option value="">Todos (Vínculo)</option>
            <option value="com">Com funcionário</option>
            <option value="sem">Sem funcionário</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="btn-outline ml-auto inline-flex h-10 items-center gap-2 px-4 text-xs"
          >
            <X size={14} />
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
