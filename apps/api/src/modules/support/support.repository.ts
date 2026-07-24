import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SupportTicket, SupportTicketMessage, SupportTicketEvent, Prisma, SupportAttachment } from '@prisma/client';

@Injectable()
export class SupportRepository {
  constructor(private prisma: PrismaService) {}

  async createTicket(data: Prisma.SupportTicketUncheckedCreateInput) {
    return this.prisma.supportTicket.create({
      data,
      include: {
        company: true,
        createdBy: true,
        affectedUser: true,
        affectedEmployee: true,
        assignedTo: true,
      }
    });
  }

  async findTicketById(id: string) {
    return this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        company: true,
        createdBy: true,
        affectedUser: true,
        affectedEmployee: true,
        assignedTo: true,
        messages: {
          include: { author: true, attachments: true },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        events: {
          include: { actor: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async findTickets(where: Prisma.SupportTicketWhereInput, orderBy: Prisma.SupportTicketOrderByWithRelationInput = { createdAt: 'desc' }) {
    return this.prisma.supportTicket.findMany({
      where,
      orderBy,
      include: {
        company: true,
        createdBy: true,
        affectedUser: true,
        assignedTo: true,
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
      include: { author: true }
    });
  }

  async createEvent(data: Prisma.SupportTicketEventUncheckedCreateInput) {
    return this.prisma.supportTicketEvent.create({ data });
  }

  async createAttachment(data: Prisma.SupportAttachmentUncheckedCreateInput) {
    return this.prisma.supportAttachment.create({ data });
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