export type AuthRole = string;

export type AuthPermission = string;

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  roles?: AuthRole[];
  permissions?: AuthPermission[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface RouteProtectionRule {
  requiresAuth?: boolean;
  roles?: AuthRole[];
  permissions?: AuthPermission[];
}

export function createAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    roles: user.roles ?? [],
    permissions: user.permissions ?? [],
  };
}

export function createAuthSession(session: AuthSession): AuthSession {
  return {
    ...session,
    user: createAuthUser(session.user),
  };
}

export function hasAnyRole(user: Pick<AuthUser, "roles">, roles: AuthRole[]): boolean {
  if (!roles.length) {
    return true;
  }

  const userRoles = user.roles ?? [];
  return roles.some((role) => userRoles.includes(role));
}

export function hasAnyPermission(
  user: Pick<AuthUser, "permissions">,
  permissions: AuthPermission[],
): boolean {
  if (!permissions.length) {
    return true;
  }

  const userPermissions = user.permissions ?? [];
  return permissions.some((permission) => userPermissions.includes(permission));
}

export function canAccessRoute(
  user: AuthUser | null | undefined,
  rule: RouteProtectionRule,
): boolean {
  if (!rule.requiresAuth) {
    return true;
  }

  if (!user) {
    return false;
  }

  return hasAnyRole(user, rule.roles ?? []) && hasAnyPermission(user, rule.permissions ?? []);
}
