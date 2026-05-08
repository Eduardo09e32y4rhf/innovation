import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommunicationGateway } from './realtime/communication.gateway';
import { CommunicationRepository } from './communication.repository';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateCommunicationSettingsDto } from './dto/update-communication-settings.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';
import { WhatsappProvider } from './whatsapp/whatsapp.provider';
import { OmniusAdapterService } from './whatsapp/omnius-adapter.service';
import type { IncomingWhatsappMessage, WhatsappConnectionStatus } from './whatsapp/whatsapp.types';

const memoryWhatsapp = new Map<string, { status: string; qrCode?: string | null; phone?: string | null; displayName?: string | null }>();
const memoryConversations = new Map<string, any[]>();
const memoryMessages = new Map<string, any[]>();

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
    try {
      const snapshot = this.provider.getSnapshot(companyId);
      const instance = await this.getStoredWhatsapp(companyId);
      return {
        qrCode: snapshot.qrCode ?? instance?.qrCode ?? null,
        status: snapshot.status ?? instance?.status ?? 'DISCONNECTED',
        phone: snapshot.phone ?? instance?.phone ?? null,
        displayName: snapshot.displayName ?? null,
      };
    } catch {
      return { qrCode: null, status: 'DISCONNECTED', phone: null, displayName: null };
    }
  }

  async getWhatsappStatus(companyId: string) {
    try {
      const snapshot = this.provider.getSnapshot(companyId);
      const instance = await this.getStoredWhatsapp(companyId);
      const settings = this.safeSettings(companyId);
      const calendar = await this.safeCalendarStatus(companyId);
      return {
        status: snapshot.status ?? instance?.status ?? 'DISCONNECTED',
        qrCode: snapshot.qrCode ?? instance?.qrCode ?? null,
        phone: snapshot.phone ?? instance?.phone ?? null,
        displayName: snapshot.displayName ?? null,
        config: settings,
        calendar,
      };
    } catch {
      return {
        status: 'DISCONNECTED',
        qrCode: null,
        phone: null,
        displayName: null,
        config: this.safeSettings(companyId),
        calendar: await this.safeCalendarStatus(companyId),
        warning: 'WhatsApp status returned in degraded mode',
      };
    }
  }

  disconnectWhatsapp(companyId: string) {
    return this.provider.disconnect(companyId);
  }

  listConversations(companyId: string) {
    return this.repository.listConversations(companyId).catch(() => memoryConversations.get(companyId) ?? []);
  }

  async listChats(companyId: string) {
    const chats = await this.omnius.getChats(companyId).catch(() => memoryConversations.get(companyId) ?? []);
    return chats.map((chat: any) => ({
      id: chat.id,
      name: chat.name,
      unreadCount: chat.unreadCount ?? 0,
      time: chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      lastMessage: chat.lastMessage ?? '',
    }));
  }

  listMessages(companyId: string, conversationId: string) {
    return this.repository.listMessages(companyId, conversationId).catch(() =>
      (memoryMessages.get(companyId) ?? []).filter((message) => message.conversationId === conversationId),
    );
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
    let conversation: any;
    let message: any;
    try {
      const contact = await this.repository.upsertContact(companyId, dto.phone.replace(/\D/g, ''), { name: dto.contactName });
      await this.omnius.saveContact(dto.phone.replace(/\D/g, ''), { name: dto.contactName });
      conversation = await this.repository.upsertConversation(companyId, contact.id, sent.jid, dto.body);
      message = await this.repository.createMessage({
        companyId,
        conversationId: conversation.id,
        externalId: sent.externalId,
        body: dto.body,
        direction: 'OUTBOUND',
        status: 'SENT',
        sentAt: new Date(),
      });
    } catch {
      const fallback = this.saveMemoryOutboundMessage(companyId, dto.phone, dto.body, dto.contactName, sent);
      conversation = fallback.conversation;
      message = fallback.message;
    }
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
    const jid = `${phone}@s.whatsapp.net`;
    let conversation: any;
    let message: any;
    try {
      const contact = await this.repository.upsertContact(input.companyId, phone, { name: input.name });
      conversation = await this.repository.upsertConversation(input.companyId, contact.id, jid, input.body);
      message = await this.repository.createMessage({
        companyId: input.companyId,
        conversationId: conversation.id,
        externalId: input.externalId,
        body: input.body,
        direction: input.fromMe ? 'OUTBOUND' : 'INBOUND',
        status: input.fromMe ? 'SENT' : 'RECEIVED',
        sentAt: input.timestamp,
      });
    } catch {
      const fallback = this.saveMemoryInboundMessage(input.companyId, phone, input.body, input.name, input.externalId, input.timestamp ?? new Date(), input.fromMe);
      conversation = fallback.conversation;
      message = fallback.message;
    }
    this.gateway.emitToCompany(input.companyId, 'communication.message.created', message);
    this.gateway.emitToCompany(input.companyId, 'communication.conversation.updated', conversation);
    return message;
  }

  private async handleQrCode(companyId: string, qrCode: string) {
    try {
      await this.repository.upsertWhatsappStatus(companyId, { status: 'QR_CODE', qrCode });
    } catch {}
    memoryWhatsapp.set(companyId, { ...(memoryWhatsapp.get(companyId) ?? {}), status: 'QR_CODE', qrCode });
    this.gateway.emitToCompany(companyId, 'communication.whatsapp.qrcode', { qrCode });
  }

  private async handleStatus(companyId: string, status: WhatsappConnectionStatus) {
    try {
      await this.repository.upsertWhatsappStatus(companyId, { status, qrCode: status === 'QR_CODE' ? undefined : null });
    } catch {}
    memoryWhatsapp.set(companyId, {
      ...(memoryWhatsapp.get(companyId) ?? {}),
      status,
      qrCode: status === 'QR_CODE' ? memoryWhatsapp.get(companyId)?.qrCode : null,
    });
    this.gateway.emitToCompany(companyId, 'communication.whatsapp.status', { status });
  }

  private async getStoredWhatsapp(companyId: string) {
    try {
      return await this.repository.getWhatsapp(companyId);
    } catch {
      return memoryWhatsapp.get(companyId) ?? null;
    }
  }

  private safeSettings(companyId: string) {
    try {
      return this.omnius.getSettings(companyId);
    } catch {
      return {
        aiEngine: 'gemini',
        geminiApiKey: '',
        openAiApiKey: '',
        aiEnabled: true,
        automaticSchedulingEnabled: false,
        customCalendarMessageEnabled: false,
        prompt: '',
        temperature: 70,
      };
    }
  }

  private async safeCalendarStatus(companyId: string) {
    try {
      return await this.omnius.getCalendarStatus(companyId);
    } catch {
      return {
        isConnected: false,
        requiresReauth: true,
        userEmail: null,
        details: 'Calendar status unavailable',
      };
    }
  }

  private saveMemoryOutboundMessage(companyId: string, phone: string, body: string, contactName: string | undefined, sent: any) {
    return this.saveMemoryMessage(companyId, phone, body, contactName, sent?.externalId, new Date(), true);
  }

  private saveMemoryInboundMessage(
    companyId: string,
    phone: string,
    body: string,
    contactName: string | undefined,
    externalId: string | undefined,
    sentAt: Date,
    fromMe: boolean,
  ) {
    return this.saveMemoryMessage(companyId, phone, body, contactName, externalId, sentAt, fromMe);
  }

  private saveMemoryMessage(
    companyId: string,
    phone: string,
    body: string,
    contactName: string | undefined,
    externalId: string | undefined,
    sentAt: Date,
    fromMe: boolean,
  ) {
    const cleanPhone = phone.replace(/\D/g, '');
    const conversationId = `memory-conversation-${cleanPhone}`;
    const conversations = memoryConversations.get(companyId) ?? [];
    let conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      conversation = {
        id: conversationId,
        companyId,
        whatsappJid: `${cleanPhone}@s.whatsapp.net`,
        status: 'OPEN',
        contact: { id: `memory-contact-${cleanPhone}`, name: contactName, phone: cleanPhone },
        unreadCount: 0,
        name: contactName || cleanPhone,
      };
      conversations.unshift(conversation);
    }
    conversation.lastMessage = body;
    conversation.lastMessageAt = sentAt;
    conversation.time = sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    memoryConversations.set(companyId, conversations);

    const message = {
      id: externalId || `memory-message-${Date.now()}`,
      companyId,
      conversationId,
      externalId,
      body,
      direction: fromMe ? 'OUTBOUND' : 'INBOUND',
      status: fromMe ? 'SENT' : 'RECEIVED',
      sentAt,
      createdAt: sentAt,
    };
    memoryMessages.set(companyId, [...(memoryMessages.get(companyId) ?? []), message]);
    return { conversation, message };
  }
}
