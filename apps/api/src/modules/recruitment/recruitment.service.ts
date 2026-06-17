import { BadRequestException, Injectable } from '@nestjs/common';
import { CommunicationService } from '../communication/communication.service';
import { CreateApplicationDto, UpdateApplicationStatusDto } from './dto/application.dto';
import {
  ConfirmApplicationTransitionDto,
  ReviewApplicationTransitionDto,
  type ApplicationStatusValue,
} from './dto/application-transition.dto';
import { CreateCandidateDto, UpdateCandidateDto } from './dto/candidate.dto';
import { CreateJobDto, UpdateJobDto } from './dto/job.dto';
import { PublicApplyToJobDto } from './dto/public-application.dto';
import { SendCandidateMessageDto } from './dto/send-candidate-message.dto';
import { RecruitmentRepository } from './recruitment.repository';

const DEFAULT_PUBLIC_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const memoryRecruitmentApplications = new Map<string, any[]>();

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
    let current: any;
    try {
      current = await this.repository.getCandidate(companyId, id);
    } catch {
      const updated = this.updateMemoryCandidate(companyId, id, dto);
      if (updated) return updated.candidate;
      throw new BadRequestException('Database unavailable and candidate was not found in local fallback');
    }
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

  async listApplications(companyId: string) {
    try {
      return await this.repository.listApplications(companyId);
    } catch {
      return memoryRecruitmentApplications.get(companyId) ?? [];
    }
  }
  createApplication(companyId: string, dto: CreateApplicationDto) {
    return this.repository.createApplication(companyId, dto.candidateId, dto.jobId);
  }
  updateApplicationStatus(companyId: string, id: string, dto: UpdateApplicationStatusDto) {
    return this.repository.updateApplicationStatus(companyId, id, dto.status);
  }

  async createRecruitmentExamples(companyId: string) {
    const candidateSeeds = [
      {
        jobIndex: 0,
        status: 'SCREENING' as ApplicationStatusValue,
        candidate: {
          name: 'Marina Costa',
          email: 'marina.costa@talentos.com',
          phone: '+55 11 98888-1201',
          linkedinUrl: 'https://linkedin.com/in/marina-costa-rh',
          resumeUrl: 'https://example.com/curriculos/marina-costa.pdf',
          coverLetter: 'Experiencia em recrutamento, people analytics, onboarding e parceria com liderancas.',
        },
        analysis: {
          aiScore: 91,
          aiSummary: 'Perfil forte para operacao de RH, com experiencia em triagem, indicadores e comunicacao com liderancas.',
          aiNotes: 'Boa comunicacao na primeira conversa. Disponivel para entrevista esta semana.',
          aiSkills: ['People Analytics', 'Recrutamento', 'Onboarding'],
          lastSentiment: 'POSITIVE',
        },
      },
      {
        jobIndex: 1,
        status: 'APPLIED' as ApplicationStatusValue,
        candidate: {
          name: 'Renan Alves',
          email: 'renan.alves@talentos.com',
          phone: '+55 21 97777-3322',
          linkedinUrl: 'https://linkedin.com/in/renan-alves-dev',
          resumeUrl: 'https://example.com/curriculos/renan-alves.pdf',
          coverLetter: 'Desenvolvedor com experiencia em React, Node.js, PostgreSQL e produtos SaaS.',
        },
        analysis: {
          aiScore: 84,
          aiSummary: 'Bom alinhamento tecnico com a vaga, portfolio consistente e experiencia recente em produtos SaaS.',
          aiNotes: 'Validar disponibilidade e pretensao salarial.',
          aiSkills: ['React', 'Node.js', 'PostgreSQL'],
          lastSentiment: 'POSITIVE',
        },
      },
      {
        jobIndex: 2,
        status: 'INTERVIEW' as ApplicationStatusValue,
        candidate: {
          name: 'Bianca Rocha',
          email: 'bianca.rocha@talentos.com',
          phone: '+55 31 96666-8765',
          resumeUrl: 'https://example.com/curriculos/bianca-rocha.pdf',
          coverLetter: 'Atuei com CRM, outbound, cadencias e acompanhamento de oportunidades comerciais.',
        },
        analysis: {
          aiScore: 78,
          aiSummary: 'Perfil aderente para prospeccao, com energia comercial boa. Precisa validar maturidade em metas agressivas.',
          aiNotes: 'Pedir exemplos de cadencia e objecoes.',
          aiSkills: ['CRM', 'Outbound', 'Follow-up'],
          lastSentiment: 'NEUTRAL',
        },
      },
      {
        jobIndex: 1,
        status: 'SCREENING' as ApplicationStatusValue,
        candidate: {
          name: 'Leticia Nunes',
          email: 'leticia.nunes@talentos.com',
          coverLetter: 'Estou em transicao de suporte para desenvolvimento e tenho base em JavaScript e SQL.',
        },
        analysis: {
          aiScore: 61,
          aiSummary: 'Tem base tecnica util, mas a experiencia ainda parece mais voltada a suporte do que desenvolvimento.',
          aiNotes: 'Sem telefone. Confirmar contato por e-mail antes de avancar.',
          aiSkills: ['JavaScript', 'Suporte', 'SQL'],
          lastSentiment: 'ATTENTION',
        },
      },
      {
        jobIndex: 0,
        status: 'HIRED' as ApplicationStatusValue,
        candidate: {
          name: 'Juliana Ferraz',
          email: 'juliana.ferraz@talentos.com',
          phone: '+55 11 93333-1122',
          linkedinUrl: 'https://linkedin.com/in/juliana-ferraz',
          resumeUrl: 'https://example.com/curriculos/juliana-ferraz.pdf',
          coverLetter: 'Experiencia em employer branding, entrevistas por competencia e gestao de vagas.',
        },
        analysis: {
          aiScore: 95,
          aiSummary: 'Contratada com alto alinhamento cultural e tecnico para estruturar a esteira de recrutamento.',
          aiNotes: 'Onboarding preparado.',
          aiSkills: ['Employer Branding', 'Entrevistas', 'Gestao de vagas'],
          lastSentiment: 'POSITIVE',
        },
      },
    ];

    try {
      await this.repository.ensureCompany(companyId);
      const existingApplications = await this.repository.listApplications(companyId);
      if (existingApplications.length > 0) {
        return {
          created: false,
          message: 'Recruitment already has applications for this company',
          applications: existingApplications,
        };
      }

      const jobs = await Promise.all([
        this.repository.createJob(companyId, {
          title: 'Analista de RH Pleno',
          description: 'Conduzir triagem, entrevistas, indicadores de recrutamento e comunicacao com liderancas.',
          location: 'Sao Paulo / Hibrido',
          employmentType: 'CLT',
          salaryRange: 'R$ 4.500 - R$ 6.500',
          benefits: ['Vale refeicao', 'Plano de saude', 'Day off'],
          status: 'OPEN',
        }),
        this.repository.createJob(companyId, {
          title: 'Desenvolvedor Full Stack',
          description: 'Atuar com React, Node.js, PostgreSQL, APIs e produtos SaaS.',
          location: 'Remoto',
          employmentType: 'PJ',
          salaryRange: 'R$ 8.000 - R$ 12.000',
          benefits: ['Horario flexivel', 'Ajuda de custo'],
          status: 'OPEN',
        }),
        this.repository.createJob(companyId, {
          title: 'SDR Comercial',
          description: 'Prospeccao outbound, CRM, cadencias comerciais e qualificacao de oportunidades.',
          location: 'Belo Horizonte',
          employmentType: 'CLT',
          salaryRange: 'R$ 2.800 + variavel',
          benefits: ['Comissao', 'Vale transporte'],
          status: 'OPEN',
        }),
      ]) as any[];

      // ⚡ Bolt: Replaced sequential for...of loop with concurrent Promise.all to reduce database I/O wait times during seeding
      await Promise.all(candidateSeeds.map(async (seed: any) => {
        const candidate = await this.createCandidate(companyId, seed.candidate);
        await this.repository.updateCandidate(companyId, (candidate as any).id, seed.analysis);
        const application = await this.repository.createApplication(companyId, (candidate as any).id, jobs[seed.jobIndex].id) as any;
        await this.repository.updateApplicationStatus(companyId, application.id, seed.status);
        await this.repository.updateCandidateStatus(companyId, (candidate as any).id, this.toCandidateStatus(seed.status));
      }));

      return {
        created: true,
        message: 'Recruitment examples created',
        applications: await this.repository.listApplications(companyId),
      };
    } catch {
      const applications = this.createMemoryRecruitmentExamples(companyId, candidateSeeds);
      return {
        created: true,
        fallback: 'memory',
        message: 'Database unavailable. Recruitment examples created in local API memory',
        applications,
      };
    }
  }

  async reviewApplicationTransition(companyId: string, id: string, dto: ReviewApplicationTransitionDto) {
    const application = await this.getApplicationForTransition(companyId, id) as any;
    const recommendation = this.buildTransitionRecommendation(application, dto.status);
    const message = this.buildCandidateStageMessage(application, recommendation.status);

    return {
      applicationId: application.id,
      currentStatus: application.status,
      recommendedStatus: recommendation.status,
      requiresConfirmation: true,
      ai: {
        score: application.candidate.aiScore ?? 0,
        confidence: recommendation.confidence,
        reasons: recommendation.reasons,
        summary: application.candidate.aiSummary || 'Analise automatica pendente.',
      },
      whatsapp: {
        enabled: Boolean(application.candidate.phone),
        phone: application.candidate.phone ?? null,
        preview: message,
      },
      candidate: {
        id: application.candidate.id,
        name: application.candidate.name,
        email: application.candidate.email,
        phone: application.candidate.phone,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
      },
    };
  }

  async confirmApplicationTransition(companyId: string, id: string, dto: ConfirmApplicationTransitionDto) {
    if (!dto.confirmed) {
      throw new BadRequestException('Transition must be confirmed before changing status or sending WhatsApp');
    }

    const application = await this.getApplicationForTransition(companyId, id) as any;
    const nextStatus = dto.status;
    let updated = application as any;
    let usingMemoryFallback = false;
    try {
      updated = await this.repository.updateApplicationStatus(companyId, id, nextStatus) as any;
      await this.repository.updateCandidateStatus(companyId, application.candidate.id, this.toCandidateStatus(nextStatus));
    } catch {
      updated = this.updateMemoryApplicationStatus(companyId, id, nextStatus);
      usingMemoryFallback = true;
    }

    let whatsapp: null | { sent: boolean; messageId?: string; error?: string; preview: string } = null;
    const shouldNotify = dto.notifyCandidate !== false;
    const message = dto.message?.trim() || this.buildCandidateStageMessage(updated, nextStatus);

    if (shouldNotify) {
      if (!application.candidate.phone) {
        whatsapp = { sent: false, error: 'Candidate has no phone', preview: message };
      } else if (usingMemoryFallback) {
        whatsapp = { sent: false, error: 'Database unavailable. Message was previewed but not sent in fallback mode', preview: message };
      } else {
        try {
          const sent = await this.communication.sendMessage(companyId, {
            phone: application.candidate.phone,
            body: message,
            contactName: application.candidate.name,
          });
          whatsapp = { sent: true, messageId: sent.id, preview: message };
        } catch (error) {
          whatsapp = { sent: false, error: (error as Error).message, preview: message };
        }
      }
    }

    return {
      application: updated,
      whatsapp,
      audit: {
        confirmed: true,
        previousStatus: application.status,
        nextStatus,
        notifiedCandidate: Boolean(whatsapp?.sent),
        fallback: usingMemoryFallback ? 'memory' : undefined,
      },
    };
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

  private createMemoryRecruitmentExamples(companyId: string, seeds: any[]) {
    const existing = memoryRecruitmentApplications.get(companyId);
    if (existing?.length) return existing;

    const jobs = [
      { id: `memory-job-rh-${companyId}`, title: 'Analista de RH Pleno' },
      { id: `memory-job-dev-${companyId}`, title: 'Desenvolvedor Full Stack' },
      { id: `memory-job-sdr-${companyId}`, title: 'SDR Comercial' },
    ];

    const applications = seeds.map((seed, index) => {
      const candidate = {
        id: `memory-candidate-${index + 1}`,
        companyId,
        contactId: null,
        status: this.toCandidateStatus(seed.status),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...seed.candidate,
        ...seed.analysis,
      };

      return {
        id: `memory-application-${index + 1}`,
        companyId,
        candidateId: candidate.id,
        jobId: jobs[seed.jobIndex].id,
        status: seed.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'Fallback API local',
        lastAction: 'Criado pelo backend em memoria enquanto o banco esta indisponivel',
        candidate,
        job: jobs[seed.jobIndex],
      };
    });

    memoryRecruitmentApplications.set(companyId, applications);
    return applications;
  }

  private getMemoryApplication(companyId: string, id: string) {
    return memoryRecruitmentApplications.get(companyId)?.find((application) => application.id === id);
  }

  private async getApplicationForTransition(companyId: string, id: string) {
    try {
      return await this.repository.getApplication(companyId, id);
    } catch {
      const application = this.getMemoryApplication(companyId, id);
      if (!application) throw new BadRequestException('Application not found');
      return application;
    }
  }

  private updateMemoryApplicationStatus(companyId: string, id: string, status: ApplicationStatusValue) {
    const applications = memoryRecruitmentApplications.get(companyId) ?? [];
    const application = applications.find((item) => item.id === id);
    if (!application) throw new BadRequestException('Application not found');
    application.status = status;
    application.updatedAt = new Date().toISOString();
    application.lastAction = `Etapa alterada para ${status} no fallback local`;
    application.candidate.status = this.toCandidateStatus(status);
    return application;
  }

  private updateMemoryCandidate(companyId: string, id: string, dto: UpdateCandidateDto) {
    const applications = memoryRecruitmentApplications.get(companyId) ?? [];
    const application = applications.find((item) => item.candidate.id === id);
    if (!application) return null;
    application.candidate = {
      ...application.candidate,
      ...dto,
      updatedAt: new Date().toISOString(),
    };
    return application;
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

  private buildTransitionRecommendation(
    application: any,
    requestedStatus?: ApplicationStatusValue,
  ): { status: ApplicationStatusValue; confidence: number; reasons: string[] } {
    const score = application.candidate.aiScore ?? 0;
    const currentStatus = application.status as ApplicationStatusValue;
    const reasons = [
      `Score IA atual: ${score}.`,
      application.candidate.lastSentiment ? `Sentimento: ${application.candidate.lastSentiment}.` : 'Sentimento ainda neutro.',
    ];

    if (requestedStatus) {
      reasons.push(`Recrutador solicitou mover de ${currentStatus} para ${requestedStatus}.`);
      return {
        status: requestedStatus,
        confidence: this.transitionConfidence(score, requestedStatus),
        reasons,
      };
    }

    if (score >= 82 && ['APPLIED', 'SCREENING'].includes(currentStatus)) {
      reasons.push('Perfil acima do corte para proxima fase.');
      return { status: 'INTERVIEW', confidence: 92, reasons };
    }
    if (score >= 65 && currentStatus === 'APPLIED') {
      reasons.push('Perfil suficiente para triagem assistida.');
      return { status: 'SCREENING', confidence: 78, reasons };
    }
    if (score < 45) {
      reasons.push('Perfil abaixo do corte configurado.');
      return { status: 'REJECTED', confidence: 74, reasons };
    }

    reasons.push('Manter etapa atual e revisar manualmente.');
    return { status: currentStatus, confidence: 62, reasons };
  }

  private transitionConfidence(score: number, status: ApplicationStatusValue) {
    if (status === 'REJECTED') return score < 50 ? 84 : 54;
    if (status === 'INTERVIEW' || status === 'OFFER') return Math.max(55, Math.min(96, score + 8));
    if (status === 'HIRED') return Math.max(50, Math.min(92, score));
    return Math.max(60, Math.min(90, score));
  }

  private toCandidateStatus(status: ApplicationStatusValue) {
    if (status === 'APPLIED') return 'NEW';
    return status;
  }

  private buildCandidateStageMessage(application: any, status: ApplicationStatusValue) {
    const candidateName = application.candidate.name?.split(' ')[0] || application.candidate.name || 'tudo bem';
    const jobTitle = application.job.title;
    const companyName = 'Innovation IA';

    const messages: Record<ApplicationStatusValue, string> = {
      APPLIED: `Oi, ${candidateName}! Recebemos sua candidatura para ${jobTitle}. Vamos analisar seu perfil e te avisamos sobre os proximos passos. - ${companyName}`,
      SCREENING: `Oi, ${candidateName}! Seu perfil para ${jobTitle} avancou para a etapa de triagem. Em breve nossa equipe compartilha os proximos passos. - ${companyName}`,
      INTERVIEW: `Oi, ${candidateName}! Boa noticia: voce passou para a proxima fase do processo de ${jobTitle}. Vamos seguir com a etapa de entrevista. - ${companyName}`,
      OFFER: `Oi, ${candidateName}! Seu processo para ${jobTitle} avancou para a etapa de proposta. Nossa equipe entrara em contato com os detalhes. - ${companyName}`,
      HIRED: `Oi, ${candidateName}! Parabens, seu processo para ${jobTitle} foi aprovado. Nossa equipe entrara em contato para os proximos passos. - ${companyName}`,
      REJECTED: `Oi, ${candidateName}! Obrigado por participar do processo para ${jobTitle}. Neste momento seguiremos com outros perfis, mas manteremos seus dados para futuras oportunidades. - ${companyName}`,
    };

    return messages[status];
  }
}
