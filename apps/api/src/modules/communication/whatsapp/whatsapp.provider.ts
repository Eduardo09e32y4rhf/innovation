import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { join } from 'path';
import * as QRCode from 'qrcode';
import type { IncomingWhatsappMessage, WhatsappProviderEvents } from './whatsapp.types';

type SessionSnapshot = {
  status: 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE' | 'CONNECTED';
  qrCode: string | null;
  phone: string | null;
  displayName: string | null;
};

@Injectable()
export class WhatsappProvider {
  private readonly logger = new Logger(WhatsappProvider.name);
  private readonly sessions = new Map<string, any>();
  private readonly sessionState = new Map<string, SessionSnapshot>();
  private events?: WhatsappProviderEvents;

  setEvents(events: WhatsappProviderEvents) {
    this.events = events;
  }

  async connect(companyId: string) {
    await this.updateStatus(companyId, 'CONNECTING');

    try {
      const baileys = require('@whiskeysockets/baileys');
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = baileys;
      const authDir = join(process.cwd(), 'storage', 'whatsapp', companyId);
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const socket = makeWASocket({ auth: state, printQRInTerminal: false });

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
          this.setSnapshot(companyId, {
            status: 'DISCONNECTED',
            qrCode: null,
            phone: null,
            displayName: null,
          });
          await this.updateStatus(companyId, 'DISCONNECTED');
          if (!loggedOut) setTimeout(() => void this.connect(companyId), 5000);
        }
      });

      socket.ev.on('messages.upsert', async (payload: any) => {
        for (const message of payload.messages ?? []) {
          const normalized = this.normalizeIncomingMessage(companyId, message);
          if (normalized) await this.events?.onMessage(normalized);
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
    return { externalId: sent?.key?.id, jid };
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

  private normalizeIncomingMessage(companyId: string, message: any): IncomingWhatsappMessage | null {
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') return null;
    const body =
      message.message?.conversation ??
      message.message?.extendedTextMessage?.text ??
      message.message?.imageMessage?.caption ??
      message.message?.videoMessage?.caption;
    if (!body) return null;
    return {
      companyId,
      externalId: message.key?.id,
      phone: String(jid).replace(/@.*$/, ''),
      name: message.pushName,
      body,
      fromMe: Boolean(message.key?.fromMe),
      timestamp: message.messageTimestamp ? new Date(Number(message.messageTimestamp) * 1000) : new Date(),
    };
  }
}
