import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AnalyzeCandidateDto, GenerateMessageDto, SummarizeConversationDto } from './dto/ai.dto';

@ApiBearerAuth()
@ApiTags('ai')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('generate-message')
  generateMessage(@CurrentCompany() companyId: string, @Body() dto: GenerateMessageDto) {
    return this.service.generateMessage(companyId, dto);
  }

  @Post('summarize-conversation')
  summarizeConversation(@CurrentCompany() companyId: string, @Body() dto: SummarizeConversationDto) {
    return this.service.summarizeConversation(companyId, dto);
  }

  @Post('analyze-candidate')
  analyzeCandidate(@CurrentCompany() companyId: string, @Body() dto: AnalyzeCandidateDto) {
    return this.service.analyzeCandidate(companyId, dto);
  }
}
