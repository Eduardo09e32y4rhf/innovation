import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyzeCandidateDto, GenerateMessageDto, SummarizeConversationDto } from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  generateMessage(companyId: string, dto: GenerateMessageDto) {
    return this.post('/generate-message', { companyId, ...dto });
  }

  async summarizeConversation(companyId: string, dto: SummarizeConversationDto) {
    const messages = await this.prisma.message.findMany({
      where: { companyId, conversationId: dto.conversationId },
      orderBy: { createdAt: 'asc' },
    });
    return this.post('/summarize-conversation', { companyId, conversationId: dto.conversationId, messages });
  }

  async analyzeCandidate(companyId: string, dto: AnalyzeCandidateDto) {
    const candidate = await this.prisma.candidate.findFirst({ where: { companyId, id: dto.candidateId } });
    return this.post('/analyze-candidate', { companyId, candidate });
  }

  private async post(path: string, body: unknown) {
    const baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:8001';
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`AI service returned ${response.status}`);
      return response.json();
    } catch (error) {
      throw new ServiceUnavailableException(`AI service unavailable: ${(error as Error).message}`);
    }
  }
}
