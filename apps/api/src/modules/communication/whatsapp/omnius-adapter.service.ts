import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { UpdateCommunicationSettingsDto } from '../dto/update-communication-settings.dto';

type CalendarStatus = {
  isConnected: boolean;
  requiresReauth: boolean;
  userEmail: string | null;
  details: string | null;
};

type OmniusSettings = {
  AI_ENGINE: 'gemini' | 'gpt';
  GEMINI_API_KEY: string;
  OPENAI_API_KEY: string;
  AI_ENABLED: boolean;
  AI_PROMPT: string;
  AI_TEMPERATURE: number;
  GOOGLE_CALENDAR_FUNCTION_CALLING: boolean;
  GOOGLE_CALENDAR_CUSTOM_MESSAGE_ENABLED: boolean;
  GOOGLE_CALENDAR_SUCCESS_MESSAGE: string;
};

@Injectable()
export class OmniusAdapterService {
  private readonly logger = new Logger(OmniusAdapterService.name);
  private readonly profileRoot = process.env.USERPROFILE ?? process.env.HOME ?? process.cwd();
  private readonly defaultSettings: OmniusSettings = {
    AI_ENGINE: 'gemini',
    GEMINI_API_KEY: '',
    OPENAI_API_KEY: '',
    AI_ENABLED: true,
    AI_PROMPT: '',
    AI_TEMPERATURE: 70,
    GOOGLE_CALENDAR_FUNCTION_CALLING: true,
    GOOGLE_CALENDAR_CUSTOM_MESSAGE_ENABLED: false,
    GOOGLE_CALENDAR_SUCCESS_MESSAGE: '',
  };

  getSettings(companyId: string) {
    const settings = this.readSettings(companyId);
    return {
      aiEngine: settings.AI_ENGINE,
      geminiApiKey: settings.GEMINI_API_KEY,
      openAiApiKey: settings.OPENAI_API_KEY,
      aiEnabled: settings.AI_ENABLED,
      automaticSchedulingEnabled: settings.GOOGLE_CALENDAR_FUNCTION_CALLING,
      customCalendarMessageEnabled: settings.GOOGLE_CALENDAR_CUSTOM_MESSAGE_ENABLED,
      prompt: settings.AI_PROMPT,
      temperature: settings.AI_TEMPERATURE,
    };
  }

  updateSettings(companyId: string, dto: UpdateCommunicationSettingsDto) {
    const current = this.readSettings(companyId);
    const next: OmniusSettings = {
      ...current,
      AI_ENGINE: dto.aiEngine ?? current.AI_ENGINE,
      GEMINI_API_KEY: dto.geminiApiKey ?? current.GEMINI_API_KEY,
      OPENAI_API_KEY: dto.openAiApiKey ?? current.OPENAI_API_KEY,
      AI_ENABLED: dto.aiEnabled ?? current.AI_ENABLED,
      AI_PROMPT: dto.prompt ?? current.AI_PROMPT,
      AI_TEMPERATURE: dto.temperature ?? current.AI_TEMPERATURE,
      GOOGLE_CALENDAR_FUNCTION_CALLING: dto.automaticSchedulingEnabled ?? current.GOOGLE_CALENDAR_FUNCTION_CALLING,
      GOOGLE_CALENDAR_CUSTOM_MESSAGE_ENABLED:
        dto.customCalendarMessageEnabled ?? current.GOOGLE_CALENDAR_CUSTOM_MESSAGE_ENABLED,
    };
    this.writeSettings(companyId, next);
    return this.getSettings(companyId);
  }

  getChats(instanceId: string) {
    const { getChatsInfo } = this.requireMessageStorage();
    return getChatsInfo(instanceId, true);
  }

  getMessages(instanceId: string, chatId: string) {
    const { getMessages } = this.requireMessageStorage();
    return getMessages(instanceId, chatId, { filterEmpty: true, limit: 200 });
  }

  async saveContact(phone: string, fields: { name?: string; email?: string }) {
    const crmDatabase = this.requireCrmDatabase();
    return crmDatabase.saveContact(phone, fields);
  }

  async getCalendarAuthUrl(instanceId: string) {
    const manager = this.createCalendarManager(instanceId);
    return {
      authUrl: manager.getAuthUrl(),
      instanceId,
    };
  }

  async getCalendarStatus(instanceId: string): Promise<CalendarStatus> {
    try {
      const manager = this.createCalendarManager(instanceId);
      const details = await manager.getDetailedAuthStatus();
      if (await manager.isAuthenticated()) {
        const userInfo = await manager.getUserInfo();
        return {
          isConnected: true,
          requiresReauth: false,
          userEmail: userInfo?.email ?? null,
          details: details?.details ?? null,
        };
      }
      return {
        isConnected: false,
        requiresReauth: true,
        userEmail: null,
        details: details?.details ?? null,
      };
    } catch (error) {
      this.logger.warn(`Failed to read Google Calendar status for ${instanceId}: ${(error as Error).message}`);
      return {
        isConnected: false,
        requiresReauth: true,
        userEmail: null,
        details: 'Calendar status unavailable',
      };
    }
  }

  async disconnectCalendar(instanceId: string) {
    const manager = this.createCalendarManager(instanceId);
    await manager.revokeAuth();
    return { disconnected: true };
  }

  private readSettings(companyId: string): OmniusSettings {
    const filePath = this.getSettingsFilePath(companyId);
    try {
      if (!existsSync(filePath)) {
        return { ...this.defaultSettings };
      }
      const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
      return { ...this.defaultSettings, ...parsed };
    } catch (error) {
      this.logger.warn(`Failed to read Omnius settings for ${companyId}: ${(error as Error).message}`);
      return { ...this.defaultSettings };
    }
  }

  private writeSettings(companyId: string, settings: OmniusSettings) {
    const filePath = this.getSettingsFilePath(companyId);
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf8');
  }

  private getSettingsFilePath(companyId: string) {
    const folder = companyId === 'default' ? 'zap-gpt-auth' : `zap-gpt-auth-${companyId}`;
    return join(this.profileRoot, folder, 'settings.json');
  }

  private createCalendarManager(instanceId: string) {
    const { createCalendarManager } = this.requireGoogleCalendar();
    const { GOOGLE_CALENDAR_BACKEND_CONFIG } = this.requireGoogleConfig();
    return createCalendarManager({
      clientId: GOOGLE_CALENDAR_BACKEND_CONFIG.CLIENT_ID,
      clientSecret: GOOGLE_CALENDAR_BACKEND_CONFIG.CLIENT_SECRET,
      redirectUri: GOOGLE_CALENDAR_BACKEND_CONFIG.REDIRECT_URI,
      instanceId,
    });
  }

  private requireMessageStorage() {
    return require(join(process.cwd(), 'WHATSAPP', 'services', 'omnius-core', 'messageStorage.js'));
  }

  private requireCrmDatabase() {
    return require(join(process.cwd(), 'WHATSAPP', 'services', 'omnius-core', 'crmDatabase.js'));
  }

  private requireGoogleCalendar() {
    return require(join(process.cwd(), 'WHATSAPP', 'services', 'omnius-core', 'google-calendar', 'index.js'));
  }

  private requireGoogleConfig() {
    return require(join(process.cwd(), 'WHATSAPP', 'services', 'omnius-core', 'config', 'googleConfig.js'));
  }
}
