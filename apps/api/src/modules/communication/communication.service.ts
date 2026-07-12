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

function normalizeChatId(id: string) {
  return String(id || '').trim();
}

function chatDigits(id: string) {
  return normalizeChatId(id).replace(/@.*$/, '').replace(/\D/g, '');
}

function isGroupChat(id: string) {
  return normalizeChatId(id).endsWith('@g.us');
}

function isTechnicalChat(id: string) {
  const chatId = normalizeChatId(id);
  return !chatId || chatId === 'status@broadcast' || chatId.endsWith('@newsletter');
}

function formatWhatsappPhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const first = digits.length === 13 ? digits.slice(4, 9) : digits.slice(4, 8);
    const last = digits.length === 13 ? digits.slice(9) : digits.slice(8);
    return `+55 ${ddd} ${first}-${last}`;
  }
  return `+${digits}`;
}

function looksLikeRawWhatsappId(value?: string | null) {
  const text = String(value || '').trim();
  if (!text) return true;
  const clean = text.replace(/@.*$/, '');
  return /^\d{10,}$/.test(clean) || /^\+?\d[\d\s().-]+$/.test(text);
}

function chatDisplayName(name: unknown, id: string, fallbackPhone?: string | null) {
  const label = String(name || '').trim();
  if (label && !looksLikeRawWhatsappId(label)) return label;
  if (isGroupChat(id)) return 'Grupo do WhatsApp';
  return formatWhatsappPhone(fallbackPhone || chatDigits(id)) || 'Contato WhatsApp';
}

function chatTimestamp(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric < 1e12 ? numeric * 1000 : numeric;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function chatTime(value: unknown) {
  const timestamp = chatTimestamp(value);
  return timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

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

  async listConversations(companyId: string) {
    if (this.provider.isConnected(companyId)) {
      const chats = await Promise.resolve().then(() => this.provider.getChats(companyId)).catch(() => []);
      return (Array.isArray(chats) ? chats : []).map((chat: any) => {
        const id = normalizeChatId(chat.id);
        return {
          id,
          whatsappJid: id,
          isGroup: isGroupChat(id),
          status: 'OPEN',
          lastMessage: chat.lastMessage ?? '',
          lastMessageAt: chat.timestamp ? new Date(chatTimestamp(chat.timestamp)) : null,
          contact: {
            id,
            name: chatDisplayName(chat.name, id),
            phone: isGroupChat(id) ? id : chatDigits(id),
          },
        };
      });
    }
    return this.repository.listConversations(companyId).catch(() => memoryConversations.get(companyId) ?? []);
  }

  async listChats(companyId: string) {
    const isConnected = this.provider.isConnected(companyId);
    const [sessionChats, storedConversations] = await Promise.all([
      Promise.resolve().then(() => this.provider.getChats(companyId)).catch(() => []),
      // Always load DB conversations to show history even after restart
      this.repository.listConversations(companyId).catch(() => memoryConversations.get(companyId) ?? []),
    ]);

    const safeSessionChats = Array.isArray(sessionChats) ? sessionChats : [];
    const safeStoredConversations = Array.isArray(storedConversations) ? storedConversations : [];

    const liveChats = safeSessionChats.map((chat: any) => ({
      id: normalizeChatId(chat.id),
      name: chatDisplayName(chat.name, chat.id),
      isGroup: isGroupChat(chat.id),
      unreadCount: chat.unreadCount ?? 0,
      timestamp: chatTimestamp(chat.timestamp),
      time: chatTime(chat.timestamp),
      lastMessage: chat.lastMessage ?? '',
      avatarUrl: chat.avatarUrl ?? null,
    }));

    const savedChats = safeStoredConversations.map((conversation: any) => {
      const id = normalizeChatId(conversation.whatsappJid ?? `${conversation.contact?.phone ?? conversation.id}@s.whatsapp.net`);
      return {
        id,
        name: chatDisplayName(conversation.contact?.name || conversation.name, id, conversation.contact?.phone),
        isGroup: isGroupChat(id),
        unreadCount: conversation.unreadCount ?? 0,
        timestamp: chatTimestamp(conversation.lastMessageAt ?? conversation.time),
        time: conversation.lastMessageAt ? chatTime(conversation.lastMessageAt) : conversation.time ?? '',
        lastMessage: conversation.lastMessage ?? '',
        avatarUrl: conversation.avatarUrl ?? conversation.contact?.avatarUrl ?? null,
      };
    });

    const merged = new Map<string, any>();
    // DB first (base), then live overwrites with fresher data
    [...savedChats, ...liveChats].forEach((chat) => {
      if (isTechnicalChat(chat.id)) return;
      const current = merged.get(chat.id);
      if (!current) {
        merged.set(chat.id, chat);
        return;
      }
      const newer = (chat.timestamp ?? 0) >= (current.timestamp ?? 0) ? chat : current;
      merged.set(chat.id, {
        ...current,
        ...newer,
        name: looksLikeRawWhatsappId(newer.name) ? current.name : newer.name,
        unreadCount: Math.max(current.unreadCount ?? 0, chat.unreadCount ?? 0),
      });
    });

    return Array.from(merged.values())
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      .map(({ timestamp, ...chat }) => chat);
  }

  listMessages(companyId: string, conversationId: string) {
    return this.repository.listMessages(companyId, conversationId).catch(() =>
      (memoryMessages.get(companyId) ?? []).filter((message) => message.conversationId === conversationId),
    );
  }

  async listChatMessages(companyId: string, chatId: string) {
    // First try in-memory session (most recent if connected)
    const sessionMessages = await Promise.resolve().then(() => this.provider.getMessages(companyId, chatId)).catch(() => []);
    const safeSessionMessages = Array.isArray(sessionMessages) ? sessionMessages : [];

    // Always load DB messages (persisted across restarts)
    const storedMessages = await this.repository.listMessagesByWhatsappJid(companyId, chatId).catch(() =>
      (memoryMessages.get(companyId) ?? []).filter((message) => {
        const conversationId = message.conversationId ?? '';
        const normalizedChat = chatId.replace(/@.*$/, '');
        return conversationId.includes(normalizedChat) || conversationId === chatId;
      }),
    );
    const safeStoredMessages = Array.isArray(storedMessages) ? storedMessages : [];

    // Build a map from DB messages first (as base)
    const dbMapped = safeStoredMessages.map((message: any) => ({
      id: message.externalId ?? message.id ?? `${message.createdAt ?? Date.now()}`,
      sender: message.direction === 'OUTBOUND' || message.key?.fromMe ? 'bot' : 'user',
      participantId: message.participantId ?? message.key?.participant,
      participantName: message.participantName ?? message.pushName,
      text: message.body ?? '',
      time: new Date(message.sentAt ?? message.createdAt ?? Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      read: message.status === 'SENT' || Boolean(message.key?.fromMe),
      _ts: new Date(message.sentAt ?? message.createdAt ?? 0).getTime(),
    }));

    // Session messages (in-memory, most recent)
    const sessionMapped = safeSessionMessages.map((message: any) => ({
      id: message.key?.id ?? `${message.messageTimestamp ?? Date.now()}`,
      sender: message.key?.fromMe ? 'bot' : 'user',
      participantId: message.key?.participant,
      participantName: message.pushName,
      media: message.__media ?? null,
      text:
        message.message?.conversation ??
        message.message?.extendedTextMessage?.text ??
        message.message?.imageMessage?.caption ??
        message.message?.videoMessage?.caption ??
        message.message?.documentMessage?.caption ??
        '',
      time: new Date(Number(message.messageTimestamp ?? Math.floor(Date.now() / 1000)) * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      read: Boolean(message.key?.fromMe),
      _ts: Number(message.messageTimestamp ?? 0) * 1000,
    }));

    // Merge: use session messages as override when IDs match, keep DB messages for history
    const merged = new Map<string, any>();
    [...dbMapped, ...sessionMapped].forEach((msg) => {
      if (msg.id) merged.set(msg.id, msg);
    });

    return Array.from(merged.values())
      .sort((a, b) => (a._ts ?? 0) - (b._ts ?? 0))
      .map(({ _ts, ...msg }) => msg);
  }

  async updateConversationStatus(companyId: string, id: string, dto: UpdateConversationStatusDto) {
    const conversation = await this.repository.updateConversationStatus(companyId, id, dto.status);
    this.gateway.emitToCompany(companyId, 'communication.conversation.updated', conversation);
    return conversation;
  }

  async sendMessage(companyId: string, dto: SendMessageDto) {
    const sent = await this.provider.sendMessage(companyId, dto.phone, dto.body || '', dto.media);
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
    const chatId = normalizeChatId(input.chatId || '');
    const jid = chatId || `${phone}@s.whatsapp.net`;
    const contactPhone = isGroupChat(jid) ? chatDigits(jid) : phone;
    let conversation: any;
    let message: any;
    try {
      const contact = await this.repository.upsertContact(input.companyId, contactPhone, {
        name: isGroupChat(jid) ? chatDisplayName(undefined, jid) : input.name,
      });
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
      const fallback = this.saveMemoryInboundMessage(
        input.companyId,
        jid,
        input.body,
        input.name,
        input.externalId,
        input.timestamp ?? new Date(),
        input.fromMe,
        input.participantId,
      );
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
    jid: string,
    body: string,
    contactName: string | undefined,
    externalId: string | undefined,
    sentAt: Date,
    fromMe: boolean,
    participantId?: string,
  ) {
    return this.saveMemoryMessage(companyId, jid, body, contactName, externalId, sentAt, fromMe, participantId);
  }

  private saveMemoryMessage(
    companyId: string,
    jid: string,
    body: string,
    contactName: string | undefined,
    externalId: string | undefined,
    sentAt: Date,
    fromMe: boolean,
    participantId?: string,
  ) {
    const cleanPhone = chatDigits(jid);
    const conversationId = `memory-conversation-${jid}`;
    const conversations = memoryConversations.get(companyId) ?? [];
    let conversation = conversations.find((item) => item.id === conversationId);
    if (!conversation) {
      conversation = {
        id: conversationId,
        companyId,
        whatsappJid: jid.includes('@') ? jid : `${cleanPhone}@s.whatsapp.net`,
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
      participantId,
      participantName: contactName,
      sentAt,
      createdAt: sentAt,
    };
    memoryMessages.set(companyId, [...(memoryMessages.get(companyId) ?? []), message]);
    return { conversation, message };
  }
}
