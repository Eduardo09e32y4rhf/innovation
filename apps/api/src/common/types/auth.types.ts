export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface JwtUser {
  sub: string;
  email: string;
  companyId: string;
  role: UserRole;
}
