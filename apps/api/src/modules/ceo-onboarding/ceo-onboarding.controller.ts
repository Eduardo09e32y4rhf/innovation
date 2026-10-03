import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { JwtUser } from '../../common/types/auth.types';
import { CeoOnboardingService } from './ceo-onboarding.service';
import { UpdateCeoProfileDto } from './dto/update-ceo-profile.dto';
import { IssueCeoContractDto } from './dto/issue-ceo-contract.dto';

@Controller('ceo-onboarding')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CeoOnboardingController {
  constructor(private readonly service: CeoOnboardingService) {}
  @Get('state') @Roles('CEO') state(@CurrentUser() actor: JwtUser) { return this.service.state(actor); }
  @Patch('profile') @Roles('CEO') profile(@CurrentUser() actor: JwtUser, @Body() dto: UpdateCeoProfileDto) { return this.service.updateProfile(actor, dto); }
  @Post(':ceoUserId/contract') @Roles('DEV') issue(@CurrentUser() actor: JwtUser, @Param('ceoUserId') ceoUserId: string, @Body() dto: IssueCeoContractDto) { return this.service.issueContract(actor, ceoUserId, dto); }
  @Post('contract/challenge') @Roles('CEO') challenge(@CurrentUser() actor: JwtUser) { return this.service.createChallenge(actor); }
  @Post('contract/:contractId/sign') @Roles('CEO') sign(@CurrentUser() actor: JwtUser, @Param('contractId') contractId: string, @Body() body: { challenge: string; contentHash: string }) { return this.service.sign(actor, contractId, body.challenge, body.contentHash); }
}
