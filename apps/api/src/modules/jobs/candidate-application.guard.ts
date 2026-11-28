import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CandidateAssessmentsService } from './candidate-assessments.service';
import { REQUIRED_ASSESSMENTS } from './candidate-assessment.rules';

@Injectable()
export class CandidateApplicationGuard implements CanActivate {
  constructor(private readonly assessments: CandidateAssessmentsService) {}
  async canActivate(context: ExecutionContext) {
    const account = context.switchToHttp().getRequest().candidateAccount;
    if (!account) throw new UnauthorizedException('Entre na sua conta para se candidatar.');
    if (!account.verifiedAt) throw new ForbiddenException('Confirme seu e-mail antes de enviar a candidatura.');
    const rows = await this.assessments.list(account.id);
    if (REQUIRED_ASSESSMENTS.some(kind => !rows.some(row => row.kind === kind && row.status === 'COMPLETED'))) {
      throw new ForbiddenException({ message: 'Conclua português, matemática e redação antes de enviar a candidatura.', fields: { assessments: 'Avaliações obrigatórias pendentes' }, next: '/carreira/avaliacoes' });
    }
    return true;
  }
}
