import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommunicationGateway } from './realtime/communication.gateway';
import { CommunicationRepository } from './communication.repository';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateCommunicationSettingsDto } from './dto/update-communication-settings.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { WhatsappProvider } from './whatsapp/whatsapp.provider';
import { OmniusAdapterService } from './whatsapp/omnius-adapter.service';
import type { IncomingWhatsappMessage, WhatsappConnectionStatus } from './whatsapp/whatsapp.types';

@Injectable()
export class CommunicationService implements OnModuleInit {
  constructor(
    private readonly repository: CommunicationRepository,
    private readonly provider: WhatsappProvider,
    private readonly gateway: CommunicationGateway,
    private readonly omnius: OmniusAdapterService,
  ) {}

  onModuleInit() {
    this.provider.setEvents({
      onQrCode: (companyId, qrCode) => this.handleQrCode(companyId, qrCode),
      onStatus: (companyId, status) => this.handleStatus(companyId, status),
      onMessage: async (message) => {
        await this.handleIncomingMessage(message);
      },
    });
  }

  connectWhatsapp(companyId: string) {
    return this.provider.connect(companyId);
  }

  async getQrCode(companyId: string) {
    const snapshot = this.provider.getSnapshot(companyId);
    const instance = await this.repository.getWhatsapp(companyId);
    return {
      qrCode: snapshot.qrCode ?? instance?.qrCode ?? null,
      status: snapshot.status ?? instance?.status ?? 'DISCONNECTED',
      phone: snapshot.phone ?? instance?.phone ?? null,
      displayName: snapshot.displayName ?? null,
    };
  }

  async getWhatsappStatus(companyId: string) {
    const snapshot = this.provider.getSnapshot(companyId);
    const instance = await this.repository.getWhatsapp(companyId);
    const settings = this.omnius.getSettings(companyId);
    const calendar = await this.omnius.getCalendarStatus(companyId);
    return {
      status: snapshot.status ?? instance?.status ?? 'DISCONNECTED',
      qrCode: snapshot.qrCode ?? instance?.qrCode ?? null,
      phone: snapshot.phone ?? instance?.phone ?? null,
      displayName: snapshot.displayName ?? null,
      config: settings,
      calendar,
    };
  }

  disconnectWhatsapp(companyId: string) {
    return this.provider.disconnect(companyId);
  }

  listConversations(companyId: string) {
    return this.repository.listConversations(companyId);
  }

  async listChats(companyId: string) {
    const chats = await this.omnius.getChats(companyId);
    return chats.map((chat: any) => ({
      id: chat.id,
      name: chat.name,
      unreadCount: chat.unreadCount ?? 0,
      time: chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      lastMessage: chat.lastMessage ?? '',
    }));
  }

  listMessages(companyId: string, conversationId: string) {
    return this.repository.listMessages(companyId, conversationId);
  }

  async listChatMessages(companyId: string, chatId: string) {
    const messages = await this.omnius.getMessages(companyId, chatId);
    return messages.map((message: any) => ({
      id: message.key?.id ?? `${message.timestamp ?? Date.now()}`,
      sender: message.key?.fromMe ? 'bot' : 'user',
      text:
        message.message?.conversation ??
        message.message?.extendedTextMessage?.text ??
        message.message?.imageMessage?.caption ??
        message.message?.videoMessage?.caption ??
        '',
      time: new Date((message.timestamp ?? Date.now()) * (message.timestamp < 1e12 ? 1000 : 1)).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      read: Boolean(message.key?.fromMe),
    }));
  }

  async updateConversationStatus(companyId: string, id: string, dto: UpdateConversationStatusDto) {
    const conversation = await this.repository.updateConversationStatus(companyId, id, dto.status);
    this.gateway.emitToCompany(companyId, 'communication.conversation.updated', conversation);
    return conversation;
  }

  async sendMessage(companyId: string, dto: SendMessageDto) {
    const sent = await this.provider.sendText(companyId, dto.phone, dto.body);
    const contact = await this.repository.upsertContact(companyId, dto.phone.replace(/\D/g, ''), { name: dto.contactName });
    await this.omnius.saveContact(dto.phone.replace(/\D/g, ''), { name: dto.contactName });
    const conversation = await this.repository.upsertConversation(companyId, contact.id, sent.jid, dto.body);
    const message = await this.repository.createMessage({
      companyId,
      conversationId: conversation.id,
      externalId: sent.externalId,
      body: dto.body,
      direction: 'OUTBOUND',
      status: 'SENT',
      sentAt: new Date(),
    });
    this.gateway.emitToCompany(companyId, 'communication.message.created', message);
    this.gateway.emitToCompany(companyId, 'communication.conversation.updated', conversation);
    return message;
  }

  getSettings(companyId: string) {
    return this.omnius.getSettings(companyId);
  }

  updateSettings(companyId: string, dto: UpdateCommunicationSettingsDto) {
    return this.omnius.updateSettings(companyId, dto);
  }

  getCalendarAuthUrl(companyId: string) {
    return this.omnius.getCalendarAuthUrl(companyId);
  }

  getCalendarStatus(companyId: string) {
    return this.omnius.getCalendarStatus(companyId);
  }

  disconnectCalendar(companyId: string) {
    return this.omnius.disconnectCalendar(companyId);
  }

  async handleIncomingMessage(input: IncomingWhatsappMessage) {
    const phone = input.phone.replace(/\D/g, '');
    const contact = await this.repository.upsertContact(input.companyId, phone, { name: input.name });
    const jid = `${phone}@s.whatsapp.net`;
    const conversation = await this.repository.upsertConversation(input.companyId, contact.id, jid, input.body);
    const message = await this.repository.createMessage({
      companyId: input.companyId,
      conversationId: conversation.id,
      externalId: input.externalId,
      body: input.body,
      direction: input.fromMe ? 'OUTBOUND' : 'INBOUND',
      status: input.fromMe ? 'SENT' : 'RECEIVED',
      sentAt: input.timestamp,
    });
    this.gateway.emitToCompany(input.companyId, 'communication.message.created', message);
    this.gateway.emitToCompany(input.companyId, 'communication.conversation.updated', conversation);
    return message;
  }

  private async handleQrCode(companyId: string, qrCode: string) {
    try {
      await this.repository.upsertWhatsappStatus(companyId, { status: 'QR_CODE', qrCode });
    } catch {}
    this.gateway.emitToCompany(companyId, 'communication.whatsapp.qrcode', { qrCode });
  }

  private async handleStatus(companyId: string, status: WhatsappConnectionStatus) {
    try {
      await this.repository.upsertWhatsappStatus(companyId, { status, qrCode: status === 'QR_CODE' ? undefined : null });
    } catch {}
    this.gateway.emitToCompany(companyId, 'communication.whatsapp.status', { status });
  }
}
