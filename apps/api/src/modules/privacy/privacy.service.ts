import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { createHash, createSign } from 'crypto';
import type { JwtUser } from '../../common/types/auth.types';
import { CURRENT_TERMS_VERSION, TERMS_PURPOSE } from './privacy.constants';
import { PrivacyRepository } from './privacy.repository';
import { buildTermsDocument, formatCnpj, formatCpf, TermsDocument } from './terms-document';
const PDFDocument = require('pdfkit');

interface SignatureEvidence {
  signedAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  signature?: string | null;
}

const brDate = (date: Date) => date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/ /g, ' ');

/** Evita que uma dependência lenta (armazenamento, fila) deixe o aceite "carregando" para sempre. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly repository: PrivacyRepository,
    @InjectQueue('pdf-generation') private readonly pdfQueue: Queue,
  ) {}

  async status(user: JwtUser) {
    const consent = await this.repository.findActiveConsent(user.sub, CURRENT_TERMS_VERSION);
    return {
      required: !consent,
      accepted: Boolean(consent),
      pdfPending: consent ? !consent.pdfBase64 : false,
      termVersion: CURRENT_TERMS_VERSION,
      acceptedAt: consent?.acceptedAt ?? null,
      purpose: TERMS_PURPOSE,
    };
  }

  /** Termo completo já preenchido com os dados reais de quem vai assinar. */
  async document(user: JwtUser): Promise<TermsDocument> {
    const [userData, employee] = await Promise.all([
      this.repository.getUserData(user.sub),
      this.repository.getEmployeeData(user.sub),
    ]);
    const company = userData?.company as any;
    const address = [company?.street, company?.streetNumber, company?.neighborhood, company?.city && company?.state ? `${company.city}/${company.state}` : company?.city, company?.cep]
      .filter(Boolean)
      .join(', ') || company?.address || null;
    return buildTermsDocument({
      signer: {
        name: employee?.name || userData?.name || user.name || 'Usuário',
        email: userData?.email || user.email,
        cpf: employee?.cpf,
        rg: employee?.rg,
        position: employee?.position,
        department: employee?.department,
        registration: employee?.registration,
        profile: userData?.role || user.role,
      },
      company: {
        name: company?.name || 'Empresa',
        legalName: company?.legalName,
        document: company?.document || company?.cnpj,
        address,
      },
    });
  }

  async accept(user: JwtUser, requestMeta: { ipAddress?: string; userAgent?: string }, body?: any) {
    if (body?.faceDescriptor || body?.photoBase64) {
      throw new BadRequestException('Biometria e selfie devem ser enviadas somente pelo fluxo facial especifico, separado do aceite de privacidade.');
    }
    const doc = await this.document(user);

    const consent = await this.repository.acceptConsent({
      companyId: user.companyId,
      userId: user.sub,
      termVersion: CURRENT_TERMS_VERSION,
      purpose: TERMS_PURPOSE,
      latitude: body?.latitude,
      longitude: body?.longitude,
      address: body?.address,
      photoBase64: undefined,
      pdfBase64: undefined,
      ...requestMeta,
    });

    const payloadToSign = JSON.stringify({
      companyId: user.companyId,
      userId: user.sub,
      termVersion: CURRENT_TERMS_VERSION,
      contentHash: doc.contentHash,
      ipAddress: requestMeta.ipAddress,
      acceptedAt: consent.acceptedAt.toISOString(),
    });
    const payloadHash = createHash('sha256').update(payloadToSign).digest('hex');

    let signature: string | null = null;
    const privateKey = process.env.PRIVACY_RSA_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (privateKey) {
      try {
        const sign = createSign('SHA256');
        sign.update(payloadToSign);
        sign.end();
        signature = sign.sign(privateKey, 'base64');
      } catch (e) {
        this.logger.warn(`Assinatura RSA falhou, aceite segue sem assinatura digital: ${(e as Error).message}`);
      }
    }

    // O aceite já está gravado: nada abaixo pode travar ou derrubar a resposta.
    try {
      await this.repository.createAuditLog({
        companyId: user.companyId,
        userId: user.sub,
        action: 'PRIVACY_TERMS_ACCEPTED',
        entity: 'PrivacyConsent',
        entityId: consent.id,
        metadata: {
          termVersion: CURRENT_TERMS_VERSION,
          contentHash: doc.contentHash,
          payloadHash,
          signatureAlgorithm: signature ? 'RSA-SHA256' : 'none',
          ...(signature ? { digitalSignature: signature } : {}),
        },
        ...requestMeta,
      });
    } catch (e) {
      this.logger.error(`Falha ao registrar auditoria do aceite: ${(e as Error).message}`);
    }

    let pdfReady = false;
    try {
      const pdfBase64 = await withTimeout(
        this.generatePDFBase64(doc, {
          signedAt: brDate(consent.acceptedAt),
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
          latitude: body?.latitude,
          longitude: body?.longitude,
          address: body?.address,
          signature,
        }, payloadHash),
        10_000,
      );
      if (pdfBase64) {
        await withTimeout(this.repository.updatePdfBase64(consent.id, pdfBase64), 10_000);
        pdfReady = true;
      }
    } catch (e) {
      this.logger.error(`Falha ao gerar o PDF do termo: ${(e as Error).message}`);
    }

    return {
      id: consent.id,
      accepted: true,
      pdfReady,
      termVersion: CURRENT_TERMS_VERSION,
      acceptedAt: consent.acceptedAt,
      message: 'Termo assinado com sucesso.',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };
    return { id: job.id, status: await job.getState(), progress: job.progress() };
  }

  async updatePdfBase64(consentId: string, pdfBase64: string) {
    return this.repository.updatePdfBase64(consentId, pdfBase64);
  }

  async getTermsPdf(user: JwtUser, targetUserId: string) {
    if (user.role !== 'DEV' && user.role !== 'ADMIN' && user.role !== 'RH') {
      if (user.sub !== targetUserId) return null;
    }
    const targetUser: any = await this.repository.getUserData(targetUserId);
    if (user.role !== 'DEV' && user.sub !== targetUserId && targetUser?.companyId !== user.companyId) return null;

    const consent = await this.repository.findActiveConsent(targetUserId, CURRENT_TERMS_VERSION);
    if (!consent) return null;
    if (consent.pdfBase64) return consent.pdfBase64;

    try {
      const doc = await this.document({ ...user, sub: targetUserId, companyId: targetUser?.companyId, email: targetUser?.email, name: targetUser?.name, role: targetUser?.role } as JwtUser);
      const payloadHash = createHash('sha256').update(JSON.stringify({ userId: targetUserId, contentHash: doc.contentHash, acceptedAt: consent.acceptedAt.toISOString() })).digest('hex');
      const pdf = await this.generatePDFBase64(doc, {
        signedAt: brDate(consent.acceptedAt),
        ipAddress: consent.ipAddress,
        userAgent: consent.userAgent,
        latitude: consent.latitude,
        longitude: consent.longitude,
        address: consent.address,
      }, payloadHash);
      await this.repository.updatePdfBase64(consent.id, pdf);
      return pdf;
    } catch (e) {
      this.logger.error(`Falha ao regenerar PDF sob demanda: ${(e as Error).message}`);
      return null;
    }
  }

  public async generatePDFBase64(termDoc: TermsDocument, evidence: SignatureEvidence, payloadHash: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margins: { top: 60, bottom: 60, left: 55, right: 55 }, size: 'A4', bufferPages: true });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', reject);
        doc.on('end', () => resolve(Buffer.concat(buffers).toString('base64')));

        const width = doc.page.width - 110;
        const ink = '#0f172a';
        const muted = '#64748b';

        doc.font('Helvetica-Bold').fontSize(15).fillColor(ink).text(termDoc.title, { align: 'center' });
        doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor(muted)
          .text(`Versão ${termDoc.version} · Código de integridade do texto: ${termDoc.contentHash.slice(0, 32)}`, { align: 'center' });
        doc.moveDown(1.2);

        doc.font('Helvetica').fontSize(10).fillColor(ink).text(termDoc.preamble, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.8);

        for (const section of termDoc.sections) {
          if (doc.y > doc.page.height - 130) doc.addPage();
          doc.font('Helvetica-Bold').fontSize(10.5).fillColor(ink).text(section.title);
          doc.moveDown(0.25);
          doc.font('Helvetica').fontSize(9.5).fillColor('#1e293b');
          for (const clause of section.clauses) {
            doc.text(clause, { align: 'justify', lineGap: 1.5 });
            doc.moveDown(0.3);
          }
          doc.moveDown(0.4);
        }

        doc.font('Helvetica').fontSize(10).fillColor(ink).text(termDoc.closing, { align: 'justify', lineGap: 2 });
        doc.moveDown(1);

        if (doc.y > doc.page.height - 260) doc.addPage();
        const boxTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text('REGISTRO DA ASSINATURA ELETRÔNICA', 55, boxTop + 10, { width: width - 20, indent: 10 });
        const line = (label: string, value: string) => {
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(muted).text(label.toUpperCase(), 65, doc.y + 4, { width: width - 20 });
          doc.font('Helvetica').fontSize(9.5).fillColor(ink).text(value || '—', 65, doc.y, { width: width - 20 });
        };
        line('Assinante', `${termDoc.signer.name} · CPF ${formatCpf(termDoc.signer.cpf)} · ${termDoc.signer.email}`);
        line('Empresa', `${termDoc.company.legalName || termDoc.company.name} · ${formatCnpj(termDoc.company.document)}`);
        line('Data e hora do aceite (Brasília)', evidence.signedAt);
        line('Endereço IP', evidence.ipAddress || 'não identificado');
        line('Dispositivo', evidence.userAgent ? String(evidence.userAgent).slice(0, 140) : 'não identificado');
        if (evidence.latitude && evidence.longitude) line('Localização aproximada', `${evidence.latitude}, ${evidence.longitude}${evidence.address ? ` · ${evidence.address}` : ''}`);
        line('Código de integridade da assinatura (SHA-256)', payloadHash);
        if (evidence.signature) line('Assinatura digital da plataforma (RSA-SHA256)', evidence.signature.slice(0, 160) + '…');
        const boxHeight = doc.y - boxTop + 10;
        doc.rect(50, boxTop, width + 10, boxHeight).strokeColor('#cbd5e1').lineWidth(1).stroke();

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.font('Helvetica').fontSize(8).fillColor(muted)
            .text(`Innovation RH · ${termDoc.signer.name} · Página ${i + 1} de ${pages.count}`, 55, doc.page.height - 40, { width, align: 'center', lineBreak: false });
        }
        doc.end();
      } catch (e) {
        reject(e);
      }
    });
  }
}
