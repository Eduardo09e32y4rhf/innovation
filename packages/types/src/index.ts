export type ID = string;

export type ISODateString = string;

export interface BaseEntity {
  id: ID;
  createdAt?: ISODateString;
  updatedAt?: ISODateString;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SessionId = ID;

export type RoleName = string;

export type PermissionKey = string;

export interface UserRole {
  id?: ID;
  name: RoleName;
  label?: string;
}

export interface Permission {
  key: PermissionKey;
  label?: string;
  description?: string;
}

export interface UserProfile {
  id: ID;
  name: string;
  email: string;
  profile?: string;
  companyId?: ID;
  roles?: UserRole[];
  permissions?: Permission[];
}

export interface CompanyProfile {
  id: ID;
  name: string;
}

export interface SessionInfo {
  sessionId: SessionId;
  userId: ID;
  expiresAt?: ISODateString;
}

export interface AuthSession extends SessionInfo {
  accessToken: string;
  refreshToken?: string;
  tokenType?: 'bearer';
  user: UserProfile;
  company?: CompanyProfile;
  roles?: UserRole[];
  permissions?: Permission[];
}

export interface PermissionGrant {
  key: PermissionKey;
  granted: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: ISODateString;
}

export interface AuthResponse {
  user: UserProfile;
  company?: CompanyProfile;
  session?: AuthSession;
  tokens?: AuthTokens;
}
