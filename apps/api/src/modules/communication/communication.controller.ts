import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CommunicationService } from './communication.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateCommunicationSettingsDto } from './dto/update-communication-settings.dto';
import { UpdateConversationStatusDto } from './dto/update-conversation-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RH', 'GESTOR')
@Controller('communication')
export class CommunicationController {
  constructor(private readonly service: CommunicationService) {}

  @Post('whatsapp/connect')
  connect(@CurrentCompany() companyId: string) {
    return this.service.connectWhatsapp(companyId);
  }

  @Get('whatsapp/qrcode')
  qrcode(@CurrentCompany() companyId: string) {
    return this.service.getQrCode(companyId);
  }

  @Get('whatsapp/status')
  whatsappStatus(@CurrentCompany() companyId: string) {
    return this.service.getWhatsappStatus(companyId);
  }

  @Post('whatsapp/disconnect')
  disconnect(@CurrentCompany() companyId: string) {
    return this.service.disconnectWhatsapp(companyId);
  }

  @Get('conversations')
  conversations(@CurrentCompany() companyId: string) {
    return this.service.listConversations(companyId);
  }

  @Get('chats')
  chats(@CurrentCompany() companyId: string) {
    return this.service.listChats(companyId);
  }

  @Get('chats/:chatId/messages')
  chatMessages(@CurrentCompany() companyId: string, @Param('chatId') chatId: string) {
    return this.service.listChatMessages(companyId, decodeURIComponent(chatId));
  }

  @Get('conversations/:id/messages')
  messages(@CurrentCompany() companyId: string, @Param('id') id: string) {
    return this.service.listMessages(companyId, id);
  }

  @Patch('conversations/:id/status')
  status(@CurrentCompany() companyId: string, @Param('id') id: string, @Body() dto: UpdateConversationStatusDto) {
    return this.service.updateConversationStatus(companyId, id, dto);
  }

  @Post('messages/send')
  send(@CurrentCompany() companyId: string, @Body() dto: SendMessageDto) {
    return this.service.sendMessage(companyId, dto);
  }

  @Get('settings')
  settings(@CurrentCompany() companyId: string) {
    return this.service.getSettings(companyId);
  }

  @Patch('settings')
  updateSettings(@CurrentCompany() companyId: string, @Body() dto: UpdateCommunicationSettingsDto) {
    return this.service.updateSettings(companyId, dto);
  }

  @Get('calendar/auth-url')
  calendarAuthUrl(@CurrentCompany() companyId: string) {
    return this.service.getCalendarAuthUrl(companyId);
  }

  @Get('calendar/status')
  calendarStatus(@CurrentCompany() companyId: string) {
    return this.service.getCalendarStatus(companyId);
  }

  @Post('calendar/disconnect')
  disconnectCalendar(@CurrentCompany() companyId: string) {
    return this.service.disconnectCalendar(companyId);
  }
}
