import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, $Enums } from '@prisma/client';
import { generateUniqueProtocol } from './support-protocol';

export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
};

@Injectable()
export class SupportRepository {
  constructor(private prisma: PrismaService) {}

  async createTicket(data: Prisma.SupportTicketUncheckedCreateInput) {
    return this.prisma.supportTicket.create({
      data,
      select: {
        id: true,
        ticketNumber: true,
        companyId: true,
        createdByUserId: true,
        affectedUserId: true,
        affectedEmployeeId: true,
        assignedToUserId: true,
        category: true,
        status: true,
        priority: true,
        title: true,
        description: true,
        firstResponseDueAt: true,
        resolutionDueAt: true,
        firstRespondedAt: true,
        resolvedAt: true,
        slaBreached: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: SAFE_USER_SELECT },
        affectedUser: { select: SAFE_USER_SELECT },
        assignedTo: { select: SAFE_USER_SELECT },
        company: { select: { id: true, name: true, document: true } },
      }
    });
  }

  async findClientTicketById(id: string, companyId: string) {
    return this.prisma.supportTicket.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        ticketNumber: true,
        companyId: true,
        createdByUserId: true,
        affectedUserId: true,
        affectedEmployeeId: true,
        assignedToUserId: true,
        category: true,
        status: true,
        priority: true,
        title: true,
        description: true,
        firstResponseDueAt: true,
        resolutionDueAt: true,
        firstRespondedAt: true,
        resolvedAt: true,
        slaBreached: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: SAFE_USER_SELECT },
        affectedUser: { select: SAFE_USER_SELECT },
        assignedTo: { select: SAFE_USER_SELECT },
        company: { select: { id: true, name: true, document: true } },
        messages: {
          where: { visibility: 'PUBLIC' },
          select: {
            id: true,
            ticketId: true,
            authorUserId: true,
            message: true,
            visibility: true,
            createdAt: true,
            author: { select: SAFE_USER_SELECT },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        events: {
          select: {
            id: true,
            ticketId: true,
            eventType: true,
            previousValue: true,
            newValue: true,
            createdAt: true,
            actor: { select: SAFE_USER_SELECT },
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async findPlatformTicketById(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        companyId: true,
        createdByUserId: true,
        affectedUserId: true,
        affectedEmployeeId: true,
        assignedToUserId: true,
        category: true,
        status: true,
        priority: true,
        title: true,
        description: true,
        firstResponseDueAt: true,
        resolutionDueAt: true,
        firstRespondedAt: true,
        resolvedAt: true,
        slaBreached: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: SAFE_USER_SELECT },
        affectedUser: { select: SAFE_USER_SELECT },
        assignedTo: { select: SAFE_USER_SELECT },
        company: { select: { id: true, name: true, document: true } },
        messages: {
          select: {
            id: true,
            ticketId: true,
            authorUserId: true,
            message: true,
            visibility: true,
            createdAt: true,
            author: { select: SAFE_USER_SELECT },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        events: {
          select: {
            id: true,
            ticketId: true,
            eventType: true,
            previousValue: true,
            newValue: true,
            createdAt: true,
            actor: { select: SAFE_USER_SELECT },
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async findTickets(where: Prisma.SupportTicketWhereInput, orderBy: Prisma.SupportTicketOrderByWithRelationInput = { createdAt: 'desc' }) {
    return this.prisma.supportTicket.findMany({
      where,
      orderBy,
      select: {
        id: true,
        ticketNumber: true,
        companyId: true,
        createdByUserId: true,
        affectedUserId: true,
        assignedToUserId: true,
        category: true,
        status: true,
        priority: true,
        title: true,
        firstResponseDueAt: true,
        resolutionDueAt: true,
        firstRespondedAt: true,
        resolvedAt: true,
        slaBreached: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: SAFE_USER_SELECT },
        affectedUser: { select: SAFE_USER_SELECT },
        assignedTo: { select: SAFE_USER_SELECT },
        company: { select: { id: true, name: true, document: true } },
      }
    });
  }

  async updateTicket(id: string, data: Prisma.SupportTicketUpdateInput) {
    return this.prisma.supportTicket.update({
      where: { id },
      data
    });
  }

  async createMessage(data: Prisma.SupportTicketMessageUncheckedCreateInput) {
    return this.prisma.supportTicketMessage.create({
      data,
      select: {
        id: true,
        ticketId: true,
        authorUserId: true,
        message: true,
        visibility: true,
        createdAt: true,
        author: { select: SAFE_USER_SELECT }
      }
    });
  }

  async createEvent(data: Prisma.SupportTicketEventUncheckedCreateInput) {
    return this.prisma.supportTicketEvent.create({ data });
  }

  async createAttachment(data: Prisma.SupportAttachmentUncheckedCreateInput) {
    return this.prisma.supportAttachment.create({ data });
  }

  async findAttachmentById(id: string) {
    return this.prisma.supportAttachment.findUnique({
      where: { id },
      select: {
        id: true,
        ticketId: true,
        messageId: true,
        uploadedByUserId: true,
        originalName: true,
        storageKey: true,
        attachmentType: true,
        declaredMimeType: true,
        detectedMimeType: true,
        sizeBytes: true,
        sha256: true,
        status: true,
        scanProvider: true,
        scanResult: true,
        rejectionReason: true,
        createdAt: true,
        scannedAt: true,
        deletedAt: true,
      },
    });
  }

  async findTicketById(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      select: { companyId: true, affectedUserId: true, requesterEmail: true, status: true, priority: true },
    });
  }

  async findAttachmentsByTicketId(ticketId: string) {
    return this.prisma.supportAttachment.findMany({
      where: { ticketId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketId: true,
        messageId: true,
        uploadedByUserId: true,
        originalName: true,
        storageKey: true,
        attachmentType: true,
        declaredMimeType: true,
        detectedMimeType: true,
        sizeBytes: true,
        sha256: true,
        status: true,
        scanProvider: true,
        scanResult: true,
        rejectionReason: true,
        createdAt: true,
        scannedAt: true,
        deletedAt: true,
      },
    });
  }

  async updateAttachmentStatus(storageKey: string, status: any, scanResult?: string) {
    return this.prisma.supportAttachment.update({
      where: { storageKey },
      data: { status, scanResult, scannedAt: new Date() }
    });
  }

  async getAttachmentById(id: string) {
    return this.prisma.supportAttachment.findUnique({ where: { id } });
  }

  async listAttachmentsByTicket(ticketId: string) {
    return this.prisma.supportAttachment.findMany({
      where: { ticketId, status: { not: 'REJECTED' } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Protocolo AAAAMMDD + 7 digitos aleatorios (ex.: 202610211020121). Chamados antigos mantem o numero SUP-AAAA-NNNNNN. */
  async generateTicketNumber(): Promise<string> {
    return generateUniqueProtocol(async (ticketNumber) => Boolean(await this.prisma.supportTicket.findUnique({ where: { ticketNumber }, select: { id: true } })));
  }

  /** Busca pelo protocolo, ja restrita ao que o usuario pode ver (where vem da autorizacao). */
  async findIdByProtocol(protocol: string, scope: Prisma.SupportTicketWhereInput = {}) {
    return this.prisma.supportTicket.findFirst({ where: { AND: [scope, { ticketNumber: protocol }] }, select: { id: true } });
  }
}
