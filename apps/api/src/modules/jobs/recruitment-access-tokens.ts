import { GoneException, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { appBase } from './recruitment-tokens';

/**
 * RS-C-16. Links secretos do candidato (acompanhar e confirmar entrevista) guardados so como HASH (SHA-256) em
 * RecruitmentAccessToken, com expiracao. O valor bruto existe apenas no e-mail/URL. Cada e-mail emite um token novo
 * (rotacao): links antigos continuam validos ate expirar. Valores brutos antigos (colunas Application.trackingToken e
 * ApplicationInterview.responseToken) ainda sao aceitos na transicao e, ao serem usados, viram hash.
 */
export const DEFAULT_TRACKING_TOKEN_DAYS = 90;
export const MIN_TRACKING_TOKEN_DAYS = 7;
export const MAX_TRACKING_TOKEN_DAYS = 365;
/** O link da entrevista vale ate o fim do dia seguinte ao horario marcado (depois disso a pagina ja bloqueia respostas). */
export const INTERVIEW_TOKEN_GRACE_MS = 24 * 3_600_000;

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const clampTrackingDays = (value: unknown) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.min(MAX_TRACKING_TOKEN_DAYS, Math.max(MIN_TRACKING_TOKEN_DAYS, n)) : DEFAULT_TRACKING_TOKEN_DAYS;
};
const newRawToken = () => randomBytes(24).toString('hex'); // 48 hex

/** Aceita o formato novo (48 hex) e o antigo de acompanhamento (40 hex) e de entrevista (32 base64url). */
export const isAccessTokenShape = (value: unknown): value is string => typeof value === 'string' && (/^[a-f0-9]{40}$/.test(value) || /^[a-f0-9]{48}$/.test(value) || /^[A-Za-z0-9_-]{32}$/.test(value));

type Db = any;

export async function trackingDaysFor(prisma: Db, companyId: string): Promise<number> {
  const row = await prisma.recruitmentSetting?.findUnique?.({ where: { companyId }, select: { trackingTokenDays: true } });
  return clampTrackingDays(row?.trackingTokenDays ?? DEFAULT_TRACKING_TOKEN_DAYS);
}

/** Emite um token de acompanhamento novo para a candidatura e devolve o valor bruto (para o e-mail) e a URL. */
export async function issueTrackingToken(prisma: Db, applicationId: string, companyId: string) {
  const raw = newRawToken();
  const days = await trackingDaysFor(prisma, companyId);
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  await prisma.recruitmentAccessToken.create({ data: { applicationId, kind: 'TRACKING', tokenHash: sha256(raw), expiresAt } });
  return { raw, expiresAt, url: appBase() ? `${appBase()}/carreiras/acompanhar/${raw}` : null };
}

/** Emite um token de resposta de entrevista (vale ate 24 h depois do horario marcado). */
export async function issueInterviewToken(prisma: Db, interview: { id: string; applicationId: string; scheduledAt: Date }) {
  const raw = newRawToken();
  const expiresAt = new Date(interview.scheduledAt.getTime() + INTERVIEW_TOKEN_GRACE_MS);
  await prisma.recruitmentAccessToken.create({ data: { applicationId: interview.applicationId, interviewId: interview.id, kind: 'INTERVIEW', tokenHash: sha256(raw), expiresAt } });
  return { raw, expiresAt, url: appBase() ? `${appBase()}/carreiras/entrevista/${raw}` : null };
}

/** Resolve o token de acompanhamento para o id da candidatura. 404 se nao existe, 410 se expirou. */
export async function resolveTrackingToken(prisma: Db, token: string): Promise<string> {
  if (!isAccessTokenShape(token)) throw new NotFoundException('Candidatura não encontrada.');
  const row = await prisma.recruitmentAccessToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (row && row.kind === 'TRACKING') {
    if (row.expiresAt.getTime() < Date.now()) throw new GoneException('Este link de acompanhamento expirou. Entre na sua conta ou peça um novo link à empresa.');
    prisma.recruitmentAccessToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    return row.applicationId;
  }
  // Transicao: valor bruto antigo. Aceita e passa a guardar so o hash.
  if (/^[a-f0-9]{40}$/.test(token)) {
    const legacy = await prisma.application.findUnique({ where: { trackingToken: token }, select: { id: true, companyId: true } });
    if (legacy) {
      const expiresAt = new Date(Date.now() + (await trackingDaysFor(prisma, legacy.companyId)) * 86_400_000);
      await prisma.recruitmentAccessToken.create({ data: { applicationId: legacy.id, kind: 'TRACKING', tokenHash: sha256(token), expiresAt } });
      await prisma.application.update({ where: { id: legacy.id }, data: { trackingToken: null } });
      return legacy.id;
    }
  }
  throw new NotFoundException('Candidatura não encontrada.');
}

/** Resolve o token da entrevista para o id da entrevista. 404 se nao existe, 410 se passou do prazo. */
export async function resolveInterviewToken(prisma: Db, token: string): Promise<string> {
  if (!isAccessTokenShape(token)) throw new NotFoundException('Convite não encontrado.');
  const row = await prisma.recruitmentAccessToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (row && row.kind === 'INTERVIEW' && row.interviewId) {
    if (row.expiresAt.getTime() < Date.now()) throw new GoneException('Este link de entrevista expirou.');
    return row.interviewId;
  }
  if (/^[A-Za-z0-9_-]{32}$/.test(token)) {
    const legacy = await prisma.applicationInterview.findUnique({ where: { responseToken: token }, select: { id: true, applicationId: true, scheduledAt: true } });
    if (legacy) {
      const expiresAt = new Date(legacy.scheduledAt.getTime() + INTERVIEW_TOKEN_GRACE_MS);
      if (expiresAt.getTime() < Date.now()) throw new GoneException('Este link de entrevista expirou.');
      await prisma.recruitmentAccessToken.create({ data: { applicationId: legacy.applicationId, interviewId: legacy.id, kind: 'INTERVIEW', tokenHash: sha256(token), expiresAt } });
      await prisma.applicationInterview.update({ where: { id: legacy.id }, data: { responseToken: null } });
      return legacy.id;
    }
  }
  throw new NotFoundException('Convite não encontrado.');
}
