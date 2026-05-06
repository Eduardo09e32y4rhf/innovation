import { BadRequestException, Injectable } from '@nestjs/common';
import { CommunicationService } from '../communication/communication.service';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import { CreateCandidateDto, UpdateCandidateDto } from './dto/candidate.dto';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { PublicApplyToJobDto } from './dto/public-application.dto';
import { SendCandidateMessageDto } from './dto/send-candidate-message.dto';
import { RecruitmentRepository } from './recruitment.repository';

const DEFAULT_PUBLIC_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly repository: RecruitmentRepository,
    private readonly communication: CommunicationService,
  ) {}

  listJobs(companyId: string) { return this.repository.listJobs(companyId); }
  createJob(companyId: string, dto: CreateJobDto) { return this.repository.createJob(companyId, dto); }
  getJob(companyId: string, id: string) { return this.repository.getJob(companyId, id); }
  updateJob(companyId: string, id: string, dto: UpdateJobDto) { return this.repository.updateJob(companyId, id, dto); }
  deleteJob(companyId: string, id: string) { return this.repository.deleteJob(companyId, id); }

  listCandidates(companyId: string) { return this.repository.listCandidates(companyId); }
  async createCandidate(companyId: string, dto: CreateCandidateDto) {
    const analysis = this.buildCandidateAnalysis(dto);
    const contact = await this.repository.upsertCandidateContact(companyId, dto.phone, dto.name, dto.email);
    return this.repository.createCandidate(companyId, {
      ...dto,
      contactId: contact?.id,
      ...analysis,
    });
  }
  getCandidate(companyId: string, id: string) { return this.repository.getCandidate(companyId, id); }
  async updateCandidate(companyId: string, id: string, dto: UpdateCandidateDto) {
    const current = (await this.repository.getCandidate(companyId, id)) as any;
    const nextData = {
      ...dto,
      ...(dto.name || dto.email || dto.phone || dto.linkedinUrl || dto.coverLetter || dto.resumeUrl
        ? this.buildCandidateAnalysis({
            name: dto.name ?? current.name,
            email: dto.email ?? current.email ?? undefined,
            phone: dto.phone ?? current.phone ?? undefined,
            linkedinUrl: dto.linkedinUrl ?? current.linkedinUrl ?? undefined,
            coverLetter: dto.coverLetter ?? current.coverLetter ?? undefined,
            resumeUrl: dto.resumeUrl ?? current.resumeUrl ?? undefined,
          })
        : {}),
    };
    const contact = await this.repository.upsertCandidateContact(
      companyId,
      dto.phone ?? current.phone ?? undefined,
      dto.name ?? current.name,
      dto.email ?? current.email ?? undefined,
    );
    return this.repository.updateCandidate(companyId, id, {
      ...nextData,
      contactId: contact?.id ?? current.contactId,
    });
  }
  deleteCandidate(companyId: string, id: string) { return this.repository.deleteCandidate(companyId, id); }

  listApplications(companyId: string) { return this.repository.listApplications(companyId); }
  createApplication(companyId: string, dto: CreateApplicationDto) {
    return this.repository.createApplication(companyId, dto.candidateId, dto.jobId);
  }
  updateApplicationStatus(companyId: string, id: string, dto: UpdateApplicationStatusDto) {
    return this.repository.updateApplicationStatus(companyId, id, dto.status);
  }

  async sendCandidateMessage(companyId: string, id: string, dto: SendCandidateMessageDto) {
    const candidate = await this.repository.getCandidate(companyId, id);
    if (!candidate.phone) throw new BadRequestException('Candidate has no phone');
    return this.communication.sendMessage(companyId, {
      phone: candidate.phone,
      body: dto.body,
      contactName: candidate.name,
    });
  }

  listPublicJobs(companyId?: string) {
    return this.repository.listPublicJobs(this.resolvePublicCompanyId(companyId));
  }

  getPublicJob(id: string, companyId?: string) {
    return this.repository.getPublicJob(this.resolvePublicCompanyId(companyId), id);
  }

  async applyToJob(jobId: string, dto: PublicApplyToJobDto, companyId?: string) {
    const resolvedCompanyId = this.resolvePublicCompanyId(companyId);
    const job = await this.repository.getPublicJob(resolvedCompanyId, jobId);
    const existingCandidate = await this.repository.findCandidateForPublicApplication(
      resolvedCompanyId,
      dto.email,
      dto.phone,
    );
    const analysis = this.buildCandidateAnalysis(dto, job);

    const contact = await this.repository.upsertCandidateContact(
      resolvedCompanyId,
      dto.phone,
      dto.name,
      dto.email,
    );

    const candidate: any = existingCandidate
      ? await this.repository.updateCandidate(resolvedCompanyId, existingCandidate.id, {
          ...dto,
          contactId: contact?.id ?? existingCandidate.contactId,
          ...analysis,
        })
      : await this.repository.createCandidate(resolvedCompanyId, {
          ...dto,
          contactId: contact?.id,
          ...analysis,
        });

    const application = await this.repository.createApplication(resolvedCompanyId, candidate.id, job.id);

    return {
      candidate,
      application,
      analysis: {
        score: candidate.aiScore,
        summary: candidate.aiSummary,
        skills: candidate.aiSkills,
        sentiment: candidate.lastSentiment,
      },
    };
  }

  private resolvePublicCompanyId(companyId?: string) {
    return companyId || process.env.DEFAULT_PUBLIC_COMPANY_ID || DEFAULT_PUBLIC_COMPANY_ID;
  }

  private buildCandidateAnalysis(
    candidate: Pick<CreateCandidateDto, 'name' | 'email' | 'phone' | 'linkedinUrl' | 'coverLetter' | 'resumeUrl'>,
    job?: { title?: string; description?: string | null },
  ) {
    const sourceText = [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.linkedinUrl,
      candidate.coverLetter,
      candidate.resumeUrl,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const jobKeywords = [
      ...(job?.title?.toLowerCase().split(/\W+/) ?? []),
      ...(job?.description?.toLowerCase().split(/\W+/) ?? []),
    ].filter((token) => token.length > 3);

    const matchedKeywords = Array.from(
      new Set(
        jobKeywords.filter((keyword) => sourceText.includes(keyword)),
      ),
    ).slice(0, 8);

    let score = 45;
    if (candidate.email) score += 10;
    if (candidate.phone) score += 10;
    if (candidate.linkedinUrl) score += 8;
    if (candidate.resumeUrl) score += 12;
    if (candidate.coverLetter) score += 10;
    score += Math.min(matchedKeywords.length * 4, 25);
    score = Math.max(40, Math.min(98, score));

    const positiveTerms = ['lider', 'resultado', 'proativo', 'colabor', 'crescimento', 'inov', 'experiencia'];
    const attentionTerms = ['junior', 'iniciante', 'aprend', 'transicao'];
    const lowerLetter = (candidate.coverLetter ?? '').toLowerCase();

    const positiveHits = positiveTerms.filter((term) => lowerLetter.includes(term)).length;
    const attentionHits = attentionTerms.filter((term) => lowerLetter.includes(term)).length;

    const sentiment =
      positiveHits >= attentionHits + 1 ? 'POSITIVE' : attentionHits > positiveHits ? 'ATTENTION' : 'NEUTRAL';

    const summary = job
      ? `Perfil analisado para ${job.title}. Compatibilidade inicial de ${score}% com base nas informacoes enviadas e aderencia aos termos da vaga.`
      : `Perfil analisado automaticamente. Score inicial de ${score}% com base nas informacoes preenchidas.`;

    const notes = [
      `Sentimento detectado na apresentacao: ${sentiment}.`,
      matchedKeywords.length
        ? `Palavras aderentes encontradas: ${matchedKeywords.join(', ')}.`
        : 'Ainda sem palavras-chave suficientes para aderencia forte com a vaga.',
      candidate.resumeUrl ? 'Curriculo informado para triagem.' : 'Curriculo ainda nao anexado.',
    ].join(' ');

    return {
      aiScore: score,
      aiSummary: summary,
      aiNotes: notes,
      aiSkills: matchedKeywords,
      lastSentiment: sentiment,
    };
  }
}
