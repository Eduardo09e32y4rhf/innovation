import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

export interface BackendRoute {
  file: string;
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  /** Perfis aceitos pelo RolesGuard; `null` = qualquer usuário autenticado. DEV sempre passa. */
  roles: string[] | null;
}

const API_SRC = resolve(__dirname, '../../../apps/api/src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function parseRoles(text: string): string[] {
  return [...text.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
}

function joinPath(...parts: string[]): string {
  const joined = parts.map((p) => p.replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
  return `/${joined}`;
}

/** Lê os controllers NestJS e devolve rota, método e perfis efetivos (método sobrepõe classe, como o RolesGuard). */
export function loadBackendRoutes(): BackendRoute[] {
  const routes: BackendRoute[] = [];
  for (const file of walk(API_SRC)) {
    const source = readFileSync(file, 'utf8');
    const lines = source.split('\n');
    let prefix = '';
    let classRoles: string[] | null = null;
    let pendingRoles: string[] | null = null;
    let classPending: string[] | null = null;
    let inClass = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const controller = line.match(/@Controller\(\s*(?:'([^']*)'|"([^"]*)")?/);
      const roles = line.match(/^\s*@Roles\(([^)]*)\)/);
      if (controller) prefix = controller[1] ?? controller[2] ?? '';
      if (roles) {
        if (!inClass) classPending = parseRoles(roles[1]);
        else pendingRoles = parseRoles(roles[1]);
      }
      if (/^export (default )?(abstract )?class /.test(line)) {
        inClass = true;
        classRoles = classPending;
        continue;
      }
      if (!inClass) continue;
      const verb = line.match(/^\s*@(Get|Post|Patch|Put|Delete)\(\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)?/);
      if (verb) {
        // @Roles pode vir depois do verbo, antes da assinatura do método
        let methodRoles = pendingRoles;
        for (let j = i + 1; j < Math.min(i + 6, lines.length) && methodRoles === pendingRoles; j += 1) {
          const later = lines[j].match(/^\s*@Roles\(([^)]*)\)/);
          if (later) { methodRoles = parseRoles(later[1]); break; }
          if (/^\s*(async\s+)?[a-zA-Z_]+\s*\(/.test(lines[j]) && !lines[j].includes('@')) break;
        }
        routes.push({
          file: file.replace(`${API_SRC}/`, ''),
          method: verb[1].toUpperCase() as BackendRoute['method'],
          path: joinPath(prefix, verb[2] ?? verb[3] ?? verb[4] ?? ''),
          roles: methodRoles ?? classRoles,
        });
        pendingRoles = null;
      }
    }
  }
  return routes;
}

export function backendAllows(route: BackendRoute, role: string): boolean {
  if (role === 'DEV') return true;
  if (route.roles === null) return true;
  return route.roles.includes(role);
}

export function findRoute(routes: BackendRoute[], method: string, pathPattern: RegExp): BackendRoute[] {
  return routes.filter((route) => route.method === method && pathPattern.test(route.path));
}
