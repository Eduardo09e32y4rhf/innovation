import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { join } from 'path';
import * as QRCode from 'qrcode';
import type { IncomingWhatsappMessage, WhatsappProviderEvents } from './whatsapp.types';

type SessionSnapshot = {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED';
  qrCode: string | null;
  phone: string | null;
  displayName: string | null;
};

type StoredChat = {
  id: string;
  name: string;
  unreadCount: number;
  timestamp: number;
  lastMessage: string;
  avatarUrl?: string | null;
};

type StoredMedia = {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mimeType?: string;
  fileName?: string;
  url?: string;
};

@Injectable()
export class WhatsappProvider {
  private readonly logger = new Logger(WhatsappProvider.name);
  private readonly sessions = new Map<string, any>();
  private readonly sessionState = new Map<string, SessionSnapshot>();
  private readonly chats = new Map<string, Map<string, StoredChat>>();
  private readonly messages = new Map<string, Map<string, any[]>>();
  private readonly contacts = new Map<string, Map<string, string>>();
  private events?: WhatsappProviderEvents;

  setEvents(events: WhatsappProviderEvents) {
    this.events = events;
  }

  async connect(companyId: string) {
    await this.updateStatus(companyId, 'CONNECTING');

    try {
      const baileys = require('@whiskeysockets/baileys');
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
      const baseDir = process.env.WHATSAPP_SESSION_PATH || join(process.cwd(), 'storage', 'whatsapp');
      const authDir = join(baseDir, companyId);
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const socket = makeWASocket({ auth: state, printQRInTerminal: false, syncFullHistory: true });

      this.sessions.set(companyId, socket);
      socket.ev.on('creds.update', saveCreds);
      socket.ev.on('connection.update', async (update: any) => {
        if (update.qr) {
          const qrCode = await QRCode.toDataURL(update.qr);
          this.setSnapshot(companyId, { qrCode, status: 'QR_CODE' });
          try {
            await this.events?.onQrCode(companyId, qrCode);
          } catch (error) {
            this.logger.warn(`Failed to propagate QR code for ${companyId}: ${(error as Error).message}`);
          }
          await this.updateStatus(companyId, 'QR_CODE');
        }

        if (update.connection === 'open') {
          const rawJid = socket.user?.id ? String(socket.user.id) : null;
          const phone = rawJid ? rawJid.replace(/:\d+@.*/, '') : null;
          const displayName =
            socket.user?.name ??
            socket.user?.notify ??
            socket.authState?.creds?.me?.name ??
            null;
          this.setSnapshot(companyId, {
            status: 'CONNECTED',
            qrCode: null,
            phone,
            displayName,
          });
          await this.updateStatus(companyId, 'CONNECTED');
        }
        if (update.connection === 'close') {
          const loggedOut = update.lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
          this.sessions.delete(companyId);
          if (loggedOut) {
            try {
              const baseDir = process.env.WHATSAPP_SESSION_PATH || join(process.cwd(), 'storage', 'whatsapp');
              const authDir = join(baseDir, companyId);
              require('fs').rmSync(authDir, { recursive: true, force: true });
            } catch (e) {}
            this.setSnapshot(companyId, {
              status: 'DISCONNECTED',
              qrCode: null,
              phone: null,
              displayName: null,
            });
            await this.updateStatus(companyId, 'DISCONNECTED');
          } else {
            const current = this.sessionState.get(companyId);
            this.setSnapshot(companyId, {
              status: 'CONNECTING',
              qrCode: null,
              phone: current?.phone ?? null,
              displayName: current?.displayName ?? null,
            });
            await this.updateStatus(companyId, 'CONNECTING');
            setTimeout(() => void this.connect(companyId), 5000);
          }
        }
      });

      socket.ev.on('messages.upsert', async (payload: any) => {
        for (const message of payload.messages ?? []) {
          await this.storeMessage(companyId, message, { downloadMedia: true });
          const normalized = this.normalizeIncomingMessage(companyId, message);
          if (normalized) await this.events?.onMessage(normalized);
        }
      });

      socket.ev.on('messaging-history.set', async (payload: any) => {
        for (const chat of payload.chats ?? []) {
          this.storeChat(companyId, chat.id, {
            id: chat.id,
            name: chat.name || chat.id?.split('@')[0] || 'Contato',
            unreadCount: chat.unreadCount ?? 0,
            timestamp: Number(chat.conversationTimestamp ?? Date.now()),
            lastMessage: '',
          });
        }
        for (const message of payload.messages ?? []) {
          await this.storeMessage(companyId, message, { downloadMedia: false });
          // O histórico fica em memória, não emitimos eventos para o DB para evitar sobrecarga de lock
        }
      });

      socket.ev.on('chats.upsert', (payload: any[]) => {
        for (const chat of payload ?? []) {
          this.storeChat(companyId, chat.id, {
            id: chat.id,
            name: chat.name || chat.id?.split('@')[0] || 'Contato',
            unreadCount: chat.unreadCount ?? 0,
            timestamp: Number(chat.conversationTimestamp ?? Date.now()),
            lastMessage: '',
          });
        }
      });

      socket.ev.on('contacts.upsert', (contacts: any[]) => {
        if (!this.contacts.has(companyId)) this.contacts.set(companyId, new Map());
        for (const contact of contacts ?? []) {
          if (contact.name || contact.notify) {
            this.contacts.get(companyId)?.set(contact.id, contact.name || contact.notify);
          }
        }
      });

      socket.ev.on('contacts.update', (contacts: any[]) => {
        if (!this.contacts.has(companyId)) this.contacts.set(companyId, new Map());
        for (const contact of contacts ?? []) {
          if (contact.name || contact.notify) {
            this.contacts.get(companyId)?.set(contact.id, contact.name || contact.notify);
          }
        }
      });

      socket.ev.on('contacts.set', (payload: any) => {
        if (!this.contacts.has(companyId)) this.contacts.set(companyId, new Map());
        for (const contact of payload.contacts ?? []) {
          if (contact.name || contact.notify) {
            this.contacts.get(companyId)?.set(contact.id, contact.name || contact.notify);
          }
        }
      });

      return { status: 'CONNECTING' };
    } catch (error) {
      this.logger.error(`WhatsApp provider failed: ${(error as Error).message}`);
      this.setSnapshot(companyId, {
        status: 'DISCONNECTED',
        qrCode: null,
        phone: null,
        displayName: null,
      });
      await this.updateStatus(companyId, 'DISCONNECTED');
      throw new ServiceUnavailableException('WhatsApp engine unavailable');
    }
  }

  async disconnect(companyId: string) {
    const socket = this.sessions.get(companyId);
    if (socket) {
      await socket.logout();
      this.sessions.delete(companyId);
    }
    this.setSnapshot(companyId, {
      status: 'DISCONNECTED',
      qrCode: null,
      phone: null,
      displayName: null,
    });
    await this.updateStatus(companyId, 'DISCONNECTED');
    return { status: 'DISCONNECTED' };
  }

  async sendText(companyId: string, phone: string, body: string) {
    const socket = this.sessions.get(companyId);
    if (!socket) throw new ServiceUnavailableException('WhatsApp session is not connected');
    const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
    const sent = await socket.sendMessage(jid, { text: body });
    const externalId = sent?.key?.id;
    if (!externalId) {
      throw new BadGatewayException('WhatsApp did not confirm the message send');
    }
    await this.storeMessage(companyId, {
      key: { id: externalId, remoteJid: jid, fromMe: true },
      message: { conversation: body },
      messageTimestamp: Math.floor(Date.now() / 1000),
    });
    return { externalId, jid };
  }

  async getChats(companyId: string) {
    const chats = Array.from(this.chats.get(companyId)?.values() ?? []).sort((a, b) => b.timestamp - a.timestamp);
    return chats;
  }

  getMessages(companyId: string, chatId: string) {
    return this.messages.get(companyId)?.get(chatId) ?? [];
  }

  isConnected(companyId: string) {
    return Boolean(this.sessions.get(companyId)) && this.getSnapshot(companyId).status === 'CONNECTED';
  }

  getSnapshot(companyId: string): SessionSnapshot {
    return (
      this.sessionState.get(companyId) ?? {
        status: 'DISCONNECTED',
        qrCode: null,
        phone: null,
        displayName: null,
      }
    );
  }

  private async updateStatus(companyId: string, status: 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED') {
    this.setSnapshot(companyId, {
      status,
      qrCode: status === 'CONNECTED' || status === 'DISCONNECTED' ? null : this.getSnapshot(companyId).qrCode,
    });
    try {
      await this.events?.onStatus(companyId, status);
    } catch (error) {
      this.logger.warn(`Failed to propagate status for ${companyId}: ${(error as Error).message}`);
    }
  }

  private setSnapshot(companyId: string, partial: Partial<SessionSnapshot>) {
    const current = this.getSnapshot(companyId);
    this.sessionState.set(companyId, {
      ...current,
      ...partial,
    });
  }

  private storeChat(companyId: string, chatId: string, chat: StoredChat) {
    if (!chatId || chatId === 'status@broadcast') return;
    if (!this.chats.has(companyId)) this.chats.set(companyId, new Map());
    const current = this.chats.get(companyId)?.get(chatId);
    const realName = this.contacts.get(companyId)?.get(chatId);
    this.chats.get(companyId)?.set(chatId, {
      id: chatId,
      name: realName || chat.name || current?.name || chatId.split('@')[0],
      unreadCount: chat.unreadCount ?? current?.unreadCount ?? 0,
      timestamp: chat.timestamp || current?.timestamp || Date.now(),
      lastMessage: chat.lastMessage ?? current?.lastMessage ?? '',
      avatarUrl: chat.avatarUrl ?? current?.avatarUrl ?? null,
    });
  }

  private async storeMessage(companyId: string, message: any, options: { downloadMedia?: boolean } = {}) {
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') return;
    const isGroup = String(jid).endsWith('@g.us');
    const body = this.getMessageText(message);
    const media = await this.extractMedia(companyId, message, Boolean(options.downloadMedia));
    message.__media = media;
    const timestamp = Number(message.messageTimestamp ?? Math.floor(Date.now() / 1000));
    const currentChatName = this.chats.get(companyId)?.get(jid)?.name;
    this.storeChat(companyId, jid, {
      id: jid,
      name: isGroup ? message.message?.conversationName || currentChatName || jid.split('@')[0] : message.pushName || jid.split('@')[0],
      unreadCount: message.key?.fromMe ? 0 : 1,
      timestamp,
      lastMessage: body || this.mediaLabel(media),
    });
    if (!this.messages.has(companyId)) this.messages.set(companyId, new Map());
    const current = this.messages.get(companyId)?.get(jid) ?? [];
    const id = message.key?.id ?? `${timestamp}-${current.length}`;
    if (current.some((item) => item.key?.id === id)) return;
    this.messages.get(companyId)?.set(jid, [...current, { ...message, __media: media }].slice(-200));
  }

  private normalizeIncomingMessage(companyId: string, message: any): IncomingWhatsappMessage | null {
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') return null;
    const participant = message.key?.participant;
    const body = this.getMessageText(message);
    if (!body && !message.__media) return null;
    return {
      companyId,
      externalId: message.key?.id,
      chatId: String(jid),
      participantId: participant ? String(participant) : undefined,
      phone: String(participant || jid).replace(/@.*$/, ''),
      name: message.pushName,
      body: body || this.mediaLabel(message.__media),
      fromMe: Boolean(message.key?.fromMe),
      timestamp: message.messageTimestamp ? new Date(Number(message.messageTimestamp) * 1000) : new Date(),
    };
  }

  private getMessageText(message: any) {
    return (
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      message.message?.imageMessage?.caption ??
      message.message?.videoMessage?.caption ??
      message.message?.documentMessage?.caption ??
      ''
    );
  }

  private getMediaPayload(message: any): { mediaMessage: any; type: StoredMedia['type'] } | null {
    if (message.message?.imageMessage) return { mediaMessage: message.message.imageMessage, type: 'image' };
    if (message.message?.videoMessage) return { mediaMessage: message.message.videoMessage, type: 'video' };
    if (message.message?.audioMessage) return { mediaMessage: message.message.audioMessage, type: 'audio' };
    if (message.message?.documentMessage) return { mediaMessage: message.message.documentMessage, type: 'document' };
    if (message.message?.stickerMessage) return { mediaMessage: message.message.stickerMessage, type: 'sticker' };
    return null;
  }

  private async extractMedia(companyId: string, message: any, downloadMedia: boolean): Promise<StoredMedia | null> {
    const payload = this.getMediaPayload(message);
    if (!payload) return null;
    const media: StoredMedia = {
      type: payload.type,
      mimeType: payload.mediaMessage?.mimetype,
      fileName: payload.mediaMessage?.fileName,
    };

    if (!downloadMedia) return media;

    try {
      const baileys = require('@whiskeysockets/baileys');
      const buffer = await baileys.downloadMediaMessage(
        message,
        'buffer',
        {},
        { reuploadRequest: this.sessions.get(companyId)?.updateMediaMessage },
      );
      const mimeType = media.mimeType || 'application/octet-stream';
      media.url = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
    } catch (error) {
      this.logger.warn(`Failed to download WhatsApp media: ${(error as Error).message}`);
    }

    return media;
  }

  private mediaLabel(media?: StoredMedia | null) {
    if (!media) return '';
    if (media.type === 'image') return '[Foto]';
    if (media.type === 'video') return '[Video]';
    if (media.type === 'audio') return '[Audio]';
    if (media.type === 'sticker') return '[Figurinha]';
    return media.fileName ? `[Anexo] ${media.fileName}` : '[Anexo]';
  }

  private async getProfilePicture(companyId: string, jid: string) {
    const socket = this.sessions.get(companyId);
    if (!socket || !jid) return null;
    try {
      return await socket.profilePictureUrl(jid, 'image');
    } catch {
      return null;
    }
  }
}
