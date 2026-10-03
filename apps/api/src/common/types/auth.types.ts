export type UserRole = 'DEV' | 'CEO' | 'CONTABIL' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

export interface JwtUser {
  sub: string;
  email: string;
  name?: string;
  companyId: string;
  role: UserRole;
  customPermissions?: any;
  ghostMode?: boolean;
  companyStatus?: string;
  billingStatus?: string;
  onboardingState?: 'INVITED' | 'PASSWORD_CHANGE' | 'FACE_ENROLLMENT' | 'PROFILE_REQUIRED' | 'CONTRACT_PENDING' | 'ACTIVE' | null;
}
