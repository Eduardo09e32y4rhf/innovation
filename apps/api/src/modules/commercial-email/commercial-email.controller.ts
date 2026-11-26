import { Body, Controller, Get, Headers, Param, Post, Query, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/types/auth.types';
import { CreateCampaignDto, CreateNoticeDto, PreviewRecipientsDto } from './dto/create-campaign.dto';
import { CommercialEmailService } from './commercial-email.service';

@Controller('commercial/email')
export class CommercialEmailController {
  constructor(private readonly service: CommercialEmailService) {}

  @Post('preview') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('COMERCIAL')
  preview(@Body() body: PreviewRecipientsDto) { return this.service.previewRecipients(body.recipients, body.type); }

  @Post('campaigns') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('COMERCIAL')
  create(@CurrentUser() actor: JwtUser, @Body() dto: CreateCampaignDto, @Req() req: any) { return this.service.createAndDispatchCampaign(actor.sub, dto, req.ip); }

  @Get('campaigns') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('COMERCIAL')
  campaigns(@CurrentUser() actor: JwtUser) { return this.service.campaignHistory(actor.sub); }

  @Get('trial-token/:token') @Throttle({ default: { limit: 10, ttl: 60000 } })
  validate(@Param('token') token: string) { return this.service.validateTrialToken(token); }

  @Get('unsubscribe') unsubscribe(@Query('e') email: string) { return this.service.unsubscribeEmail(email); }

  @Post('webhooks/resend')
  webhook(@Req() request: RawBodyRequest<any>, @Headers('svix-id') id?: string, @Headers('svix-timestamp') timestamp?: string, @Headers('svix-signature') signature?: string) {
    return this.service.handleResendWebhook(request.rawBody?.toString('utf8') ?? JSON.stringify(request.body), { id, timestamp, signature });
  }

  @Post('notices') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('DEV', 'CEO', 'COMERCIAL')
  createNotice(@CurrentUser() actor: JwtUser, @Body() dto: CreateNoticeDto) { return this.service.createPlatformNotice(actor.sub, dto); }

  @Get('notices') @UseGuards(JwtAuthGuard)
  notices(@CurrentUser() actor: JwtUser) { return this.service.listNoticesForAdmin(actor.sub); }

  @Post('notices/:id/ack') @UseGuards(JwtAuthGuard)
  acknowledge(@Param('id') id: string, @CurrentUser() actor: JwtUser, @Req() req: any) { return this.service.acknowledgeNotice(id, actor.sub, actor.companyId, req.ip); }
}
