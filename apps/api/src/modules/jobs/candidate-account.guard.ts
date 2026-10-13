import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { CandidateAccountService } from './candidate-account.service';

/** Autentica a Área do candidato: `Authorization: Bearer <token>` da sessão criada pelo código no e-mail. Não mistura com o login de empresa. */
@Injectable()
export class CandidateAuthGuard implements CanActivate {
  constructor(private readonly service: CandidateAccountService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const header = String(request.headers?.authorization ?? '');
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    const account = token ? await this.service.findAccountBySession(token) : null;
    if (!account) throw new UnauthorizedException('Sessão expirada. Entre novamente na Área do candidato.');
    request.candidateAccount = account;
    request.candidateToken = token;
    return true;
  }
}
