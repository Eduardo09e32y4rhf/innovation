import type { Employee } from '@/app/lib/api';

export const searchText = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function matchesEmployee(employee: Employee, query: string, managerName = '') {
  const term = searchText(query.trim());
  if (!term) return true;
  const digits = query.replace(/\D/g, '');
  return [employee.name, employee.registration, employee.department, managerName].some(value => searchText(value).includes(term))
    || (!!digits && (employee.cpf ?? '').replace(/\D/g, '').includes(digits));
}
