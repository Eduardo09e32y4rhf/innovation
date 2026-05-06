import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CommunicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertWhatsappStatus(companyId: string, data: { status: string; qrCode?: string | null }) {
    return this.prisma.whatsappInstance.upsert({
      where: { sessionId: companyId },
      create: { companyId, sessionId: companyId, ...data } as any,
      update: data as any,
    });
  }

  getWhatsapp(companyId: string) {
    return this.prisma.whatsappInstance.findFirst({ where: { companyId } });
  }

  async upsertContact(companyId: string, phone: string, data: { name?: string; email?: string } = {}) {
    return this.prisma.contact.upsert({
      where: { companyId_phone: { companyId, phone } },
      create: { companyId, phone, ...data },
      update: data,
    });
  }

  async upsertConversation(companyId: string, contactId: string, whatsappJid: string, lastMessage?: string) {
    return this.prisma.conversation.upsert({
      where: { companyId_whatsappJid: { companyId, whatsappJid } },
      create: { companyId, contactId, whatsappJid, lastMessage, lastMessageAt: new Date() },
      update: { lastMessage, lastMessageAt: new Date() },
      include: { contact: true },
    });
  }

  createMessage(data: {
    companyId: string;
    conversationId: string;
    externalId?: string;
    body: string;
    direction: string;
    status: string;
    sentAt?: Date;
  }) {
    return this.prisma.message.create({ data: data as any });
  }

  listConversations(companyId: string) {
    return this.prisma.conversation.findMany({
      where: { companyId },
      include: { contact: true },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async listMessages(companyId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({ where: { id: conversationId, companyId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return this.prisma.message.findMany({ where: { companyId, conversationId }, orderBy: { createdAt: 'asc' } });
  }

  async updateConversationStatus(companyId: string, id: string, status: string) {
    const result = await this.prisma.conversation.updateMany({ where: { id, companyId }, data: { status } as any });
    if (!result.count) throw new NotFoundException('Conversation not found');
    return this.prisma.conversation.findFirst({ where: { id, companyId }, include: { contact: true } });
  }
}
