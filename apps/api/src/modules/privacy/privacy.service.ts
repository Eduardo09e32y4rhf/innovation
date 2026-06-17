import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CURRENT_TERMS_VERSION, TERMS_PURPOSE } from './privacy.constants';
import { PrivacyRepository } from './privacy.repository';

@Injectable()
export class PrivacyService {
  constructor(private readonly repository: PrivacyRepository) {}

  async status(user: JwtUser) {
    const consent = await this.repository.findActiveConsent(user.sub, CURRENT_TERMS_VERSION);
    return {
      required: !consent,
      accepted: Boolean(consent),
      termVersion: CURRENT_TERMS_VERSION,
      acceptedAt: consent?.acceptedAt ?? null,
      purpose: TERMS_PURPOSE,
    };
  }

  async accept(user: JwtUser, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const consent = await this.repository.acceptConsent({
      companyId: user.companyId,
      userId: user.sub,
      termVersion: CURRENT_TERMS_VERSION,
      purpose: TERMS_PURPOSE,
      ...requestMeta,
    });

    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.sub,
      action: 'PRIVACY_TERMS_ACCEPTED',
      entity: 'PrivacyConsent',
      entityId: consent.id,
      metadata: { termVersion: CURRENT_TERMS_VERSION },
      ...requestMeta,
    });

    return { accepted: true, termVersion: CURRENT_TERMS_VERSION, acceptedAt: consent.acceptedAt };
  }
}
