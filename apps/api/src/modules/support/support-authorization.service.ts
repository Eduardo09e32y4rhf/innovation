import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SupportAuthorizationService {
  constructor(private prisma: PrismaService) {}

  async assertCanCreateTicket(actor: any, affectedUserId?: string, affectedEmployeeId?: string) {
    if (['FUNCIONARIO', 'CONSULTA', 'COMERCIAL'].includes(actor.role)) {
      throw new ForbiddenException('Seu perfil não tem permissão para abrir chamados.');
    }
    if (actor.role === 'DEV') return true;

    if (actor.role === 'GESTOR') {
      const actorEmployee = await this.prisma.employee.findFirst({
        where: { userId: actor.id, companyId: actor.companyId }
      });
      if (!actorEmployee) {
        throw new ForbiddenException('Seu usuário não está vinculado a um cadastro de funcionário. Solicite ao RH a correção do vínculo.');
      }
      
      let targetEmployeeId = affectedEmployeeId;
      if (!targetEmployeeId && affectedUserId) {
        const targetEmployee = await this.prisma.employee.findFirst({
          where: { userId: affectedUserId, companyId: actor.companyId }
        });
        if (targetEmployee) targetEmployeeId = targetEmployee.id;
      }

      if (affectedUserId === actor.id) return true; // Para si mesmo
      if (affectedEmployeeId === actorEmployee.id) return true; // Para si mesmo via employee

      if (targetEmployeeId) {
        const isDirectReport = await this.prisma.employee.findFirst({
          where: { id: targetEmployeeId, managerId: actorEmployee.id, companyId: actor.companyId }
        });
        if (!isDirectReport) {
          throw new ForbiddenException('O funcionário informado não faz parte da sua equipe direta.');
        }
        return true;
      }
      
      if (affectedUserId || affectedEmployeeId) {
        throw new ForbiddenException('Você só pode abrir chamados para si ou para sua equipe direta.');
      }
    }

    if (actor.role === 'ADMIN' || actor.role === 'RH') {
      if (affectedUserId) {
        const userInCompany = await this.prisma.user.findFirst({ where: { id: affectedUserId, companyId: actor.companyId } });
        if (!userInCompany) throw new ForbiddenException('Usuário não pertence à sua empresa.');
      }
      if (affectedEmployeeId) {
        const empInCompany = await this.prisma.employee.findFirst({ where: { id: affectedEmployeeId, companyId: actor.companyId } });
        if (!empInCompany) throw new ForbiddenException('Funcionário não pertence à sua empresa.');
      }
    }
    
    return true;
  }

  async buildTicketListWhere(actor: any) {
    if (actor.role === 'DEV') return {};
    
    const baseWhere: any = { companyId: actor.companyId };
    
    if (actor.role === 'ADMIN' || actor.role === 'RH') {
      return baseWhere;
    }
    
    if (actor.role === 'GESTOR') {
      const actorEmployee = await this.prisma.employee.findFirst({
        where: { userId: actor.id, companyId: actor.companyId }
      });
      
      const teamIds = [];
      if (actorEmployee) {
        const team = await this.prisma.employee.findMany({
          where: { managerId: actorEmployee.id, companyId: actor.companyId },
          select: { id: true }
        });
        teamIds.push(...team.map(e => e.id));
      }
      
      return {
        ...baseWhere,
        OR: [
          { createdByUserId: actor.id },
          { affectedUserId: actor.id },
          teamIds.length > 0 ? { affectedEmployeeId: { in: teamIds } } : undefined
        ].filter(Boolean)
      };
    }
    
    if (actor.role === 'FUNCIONARIO' || actor.role === 'CONSULTA') {
      const actorEmployee = await this.prisma.employee.findFirst({
        where: { userId: actor.id, companyId: actor.companyId },
        select: { id: true }
      });
      return {
        ...baseWhere,
        OR: [
          { affectedUserId: actor.id },
          actorEmployee ? { affectedEmployeeId: actorEmployee.id } : undefined
        ].filter(Boolean)
      };
    }
    
    throw new ForbiddenException('Perfil sem acesso ao suporte.');
  }

  async assertCanViewTicket(actor: any, ticket: any) {
    if (actor.role === 'DEV') return true;
    if (ticket.companyId !== actor.companyId) throw new ForbiddenException('Chamado pertence a outra empresa.');
    
    if (actor.role === 'ADMIN' || actor.role === 'RH') return true;
    
    if (actor.role === 'GESTOR') {
      if (ticket.createdByUserId === actor.id || ticket.affectedUserId === actor.id) return true;
      if (ticket.affectedEmployeeId) {
        const actorEmployee = await this.prisma.employee.findFirst({ where: { userId: actor.id, companyId: actor.companyId } });
        if (actorEmployee) {
          const isDirectReport = await this.prisma.employee.findFirst({
            where: { id: ticket.affectedEmployeeId, managerId: actorEmployee.id }
          });
          if (isDirectReport) return true;
        }
      }
    }
    
    if (actor.role === 'FUNCIONARIO' || actor.role === 'CONSULTA') {
      if (ticket.affectedUserId === actor.id) return true;
      if (ticket.affectedEmployeeId) {
        const actorEmployee = await this.prisma.employee.findFirst({ where: { userId: actor.id, companyId: actor.companyId } });
        if (actorEmployee && actorEmployee.id === ticket.affectedEmployeeId) return true;
      }
    }
    
    throw new ForbiddenException('Você não tem permissão para visualizar este chamado.');
  }

  async assertCanReplyTicket(actor: any, ticket: any) {
    if (actor.role === 'CONSULTA' || actor.role === 'COMERCIAL') {
      throw new ForbiddenException('Perfil somente leitura.');
    }
    await this.assertCanViewTicket(actor, ticket);
    return true;
  }

  async assertCanUploadAttachment(actor: any, ticket: any) {
    return this.assertCanReplyTicket(actor, ticket);
  }

  async assertCanCloseTicket(actor: any, ticket: any) {
    if (actor.role === 'DEV') return true;
    if (actor.role === 'ADMIN' || actor.role === 'RH') {
      await this.assertCanViewTicket(actor, ticket);
      return true;
    }
    throw new ForbiddenException('Somente ADMIN, RH ou DEV podem fechar ou solicitar fechamento de um chamado.');
  }

  assertCanManageTicket(actor: any) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Apenas DEV pode administrar chamados.');
    return true;
  }

  assertCanCreateInternalNote(actor: any) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Apenas DEV pode criar notas internas.');
    return true;
  }

  assertCanResetPassword(actor: any) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Apenas DEV pode resetar senhas temporárias.');
    return true;
  }

  assertCanExport(actor: any) {
    if (actor.role !== 'DEV') throw new ForbiddenException('Exportação permitida apenas para DEV.');
    return true;
  }
}