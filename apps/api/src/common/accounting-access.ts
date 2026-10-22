import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { JwtUser } from './types/auth.types';

/**
 * Escopo do contador: DEV e CEO enxergam todas as empresas; CONTABIL só as empresas em que é o responsável
 * (AccountingClient.responsibleId). Não existe modelo de "equipe do escritório" por empresa — o que existe em
 * `office/team` é só a lista de usuários DEV/CEO/CONTABIL —, então o vínculo é exclusivamente o responsibleId.
 * Qualquer outro perfil não tem acesso. Sem acesso => 404 (não revela que a empresa existe).
 */
@Injectable()
export class AccountingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** `null` = sem restrição (DEV/CEO); lista = só essas empresas (vazia = nenhuma). */
  async accessibleCompanyIds(user: Pick<JwtUser, 'sub' | 'role'>): Promise<string[] | null> {
    if (user.role === 'DEV' || user.role === 'CEO') return null;
    if (user.role !== 'CONTABIL') return [];
    const rows = await this.prisma.accountingClient.findMany({ where: { responsibleId: user.sub }, select: { companyId: true }, take: 5000 });
    return rows.map((row) => row.companyId);
  }

  async canAccess(user: Pick<JwtUser, 'sub' | 'role'>, companyId: string): Promise<boolean> {
    if (user.role === 'DEV' || user.role === 'CEO') return true;
    if (user.role !== 'CONTABIL' || !companyId) return false;
    const link = await this.prisma.accountingClient.findFirst({ where: { companyId, responsibleId: user.sub }, select: { id: true } });
    return !!link;
  }

  /** Lança 404 (mesma mensagem de "não existe") quando o usuário não atende a empresa. */
  async assertAccountantCanAccess(user: Pick<JwtUser, 'sub' | 'role'>, companyId: string, notFoundMessage = 'Empresa não encontrada.'): Promise<void> {
    if (!(await this.canAccess(user, companyId))) throw new NotFoundException(notFoundMessage);
  }
}
