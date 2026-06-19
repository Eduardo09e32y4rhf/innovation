export type UserRole = 'DEV' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

export interface JwtUser {
  sub: string;
  email: string;
  name?: string;
  companyId: string;
  role: UserRole;
}
