export type UserRole = 'DEV' | 'CEO' | 'CONTABIL' | 'COMERCIAL' | 'ADMIN' | 'RH' | 'RH_RS' | 'GESTOR' | 'FUNCIONARIO' | 'CONSULTA';

export interface JwtUser {
  sub: string;
  email: string;
  name?: string;
  companyId: string;
  role: UserRole;
  customPermissions?: any;
  ghostMode?: boolean;
  /** Perfil que exige MFA e ainda não configurou: só acessa /auth/* até concluir. */
  mfaPending?: boolean;
  companyStatus?: string;
  billingStatus?: string;
  onboardingState?: 'INVITED' | 'PASSWORD_CHANGE' | 'FACE_ENROLLMENT' | 'PROFILE_REQUIRED' | 'CONTRACT_PENDING' | 'ACTIVE' | null;
}
