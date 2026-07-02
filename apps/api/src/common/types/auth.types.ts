export type UserRole = 'DEV' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONÁRIO' | 'CONSULTA';

export interface JwtUser {
  sub: string;
  email: string;
  name?: string;
  companyId: string;
  role: UserRole;
}
