export type UserRole = 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

export interface JwtUser {
  sub: string;
  email: string;
  companyId: string;
  role: UserRole;
}
