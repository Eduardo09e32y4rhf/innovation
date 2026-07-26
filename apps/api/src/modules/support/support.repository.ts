import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SupportTicket, SupportTicketMessage, SupportTicketEvent, Prisma, SupportAttachment } from '@prisma/client';

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

  async generateTicketNumber(year: number): Promise<string> {
    const counter = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.supportTicketCounter.findUnique({ where: { year } });
      if (existing) {
        return tx.supportTicketCounter.update({
          where: { year },
          data: { lastNumber: { increment: 1 } }
        });
      }
      return tx.supportTicketCounter.create({
        data: { year, lastNumber: 1 }
      });
    });
    return `SUP-${year}-${String(counter.lastNumber).padStart(6, '0')}`;
  }
}
