export type UserRole = 'DEV' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO';

export interface JwtUser {
  sub: string;
  email: string;
  name?: string;
  companyId: string;
  role: UserRole;
}
