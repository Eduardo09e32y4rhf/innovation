import { Logger } from '@nestjs/common';

/**
 * Dono da plataforma (DEV proprietario). A identidade e o ID do usuario (PLATFORM_OWNER_USER_ID),
 * que nao muda quando o e-mail e editado. PLATFORM_OWNER_EMAIL so vale como legado enquanto o ID
 * nao estiver configurado.
 */
const logger = new Logger('PlatformOwner');
let warned = false;

function ownerId(): string {
  return (process.env.PLATFORM_OWNER_USER_ID ?? '').trim();
}

function ownerEmail(): string {
  return (process.env.PLATFORM_OWNER_EMAIL ?? '').trim().toLowerCase();
}

export function isPlatformOwnerConfiguredById(): boolean {
  return ownerId().length > 0;
}

/** True somente para o proprio dono. Com ID configurado, e-mail nunca concede identidade. */
export function isPlatformOwner(user?: { id?: string; sub?: string; email?: string | null } | null): boolean {
  if (!user) return false;
  const id = ownerId();
  if (id) return (user.id ?? user.sub) === id;
  const email = ownerEmail();
  if (!email) return false;
  if (!warned) {
    warned = true;
    logger.warn('PLATFORM_OWNER_USER_ID nao configurado: protecao do DEV usa e-mail (legado). Configure o ID.');
  }
  return (user.email ?? '').toLowerCase() === email;
}

/** True quando o alvo e o dono e quem age nao e o proprio dono. */
export function isOwnerTargetedByOther(
  actor: { id?: string; sub?: string; email?: string | null } | null | undefined,
  target: { id?: string; email?: string | null } | null | undefined,
): boolean {
  return isPlatformOwner(target) && !isPlatformOwner(actor);
}