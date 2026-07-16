import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import type { JwtUser } from '../../common/types/auth.types';
import { CURRENT_TERMS_VERSION, TERMS_PURPOSE } from './privacy.constants';
import { PrivacyRepository } from './privacy.repository';
import * as PDFDocumentType from 'pdfkit';
const PDFDocument = require('pdfkit');

@Injectable()
export class PrivacyService {
  constructor(
    private readonly repository: PrivacyRepository,
    @InjectQueue('pdf-generation') private readonly pdfQueue: Queue
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

  async accept(user: JwtUser, requestMeta: { ipAddress?: string; userAgent?: string }, body?: any) {
    const userData = await this.repository.getUserData(user.sub);
    const userName = userData?.name || user.name || 'Usuário';
    const companyName = userData?.company?.name || 'Empresa Cliente';
    
    const consent = await this.repository.acceptConsent({
      companyId: user.companyId,
      userId: user.sub,
      termVersion: CURRENT_TERMS_VERSION,
      purpose: TERMS_PURPOSE,
      latitude: body?.latitude,
      longitude: body?.longitude,
      address: body?.address,
      photoBase64: body?.photoBase64,
      pdfBase64: undefined,
      ...requestMeta,
    });

    if (body?.faceDescriptor && Array.isArray(body.faceDescriptor)) {
      const employee = await this.repository.getEmployeeId(user.sub);
      if (employee) {
        await this.repository.saveFaceEnrollment(user.companyId, employee.id, body.faceDescriptor);
      } else {
        console.warn(`User ${user.sub} accepted terms with faceDescriptor, but has no employee record to bind to.`);
      }
    }

    const crypto = require('crypto');
    
    // Mock KMS or process.env for RSA Private Key
    const privateKey = process.env.PRIVACY_RSA_PRIVATE_KEY || crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey;

    const payloadToSign = JSON.stringify({
      companyId: user.companyId,
      userId: user.sub,
      termVersion: CURRENT_TERMS_VERSION,
      purpose: TERMS_PURPOSE,
      ipAddress: requestMeta.ipAddress,
      acceptedAt: consent.acceptedAt.toISOString(),
    });

    const sign = crypto.createSign('SHA256');
    sign.update(payloadToSign);
    sign.end();
    const signature = sign.sign(privateKey, 'base64');

    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.sub,
      action: 'PRIVACY_TERMS_ACCEPTED',
      entity: 'PrivacyConsent',
      entityId: consent.id,
      metadata: { 
        termVersion: CURRENT_TERMS_VERSION, 
        latitude: body?.latitude, 
        longitude: body?.longitude,
        signatureAlgorithm: 'RSA-SHA256',
        payloadHash: crypto.createHash('sha256').update(payloadToSign).digest('hex'),
        digitalSignature: signature,
      },
      ...requestMeta,
    });

    const pdfData = {
      userName,
      userEmail: user.email,
      companyName,
      termVersion: CURRENT_TERMS_VERSION,
      purpose: TERMS_PURPOSE,
      ipAddress: requestMeta.ipAddress,
      latitude: body?.latitude,
      longitude: body?.longitude,
      address: body?.address,
      photoBase64: body?.photoBase64,
      date: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\u202F/g, ' '),
    };

    const job = await this.pdfQueue.add({
      consentId: consent.id,
      userEmail: user.email,
      pdfData
    }, {
      delay: 0,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return { 
      id: consent.id, 
      status: 'QUEUED',
      jobId: job.id,
      accepted: true, 
      termVersion: CURRENT_TERMS_VERSION, 
      acceptedAt: consent.acceptedAt,
      message: 'Seu termo está sendo gerado. Você receberá um aviso quando pronto.'
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.pdfQueue.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress(),
      data: job.data,
    };
  }

  async updatePdfBase64(consentId: string, pdfBase64: string) {
    return this.repository.updatePdfBase64(consentId, pdfBase64);
  }

  async getTermsPdf(user: JwtUser, targetUserId: string) {
    // Basic authorization check: DEV can download any, Admin/RH can download from their company
    if (user.role !== 'DEV' && user.role !== 'ADMIN' && user.role !== 'RH') {
      if (user.sub !== targetUserId) return null;
    }
    
    let targetUser: any;
    if (user.role !== 'DEV' && user.sub !== targetUserId) {
      targetUser = await this.repository.getUserData(targetUserId);
      if (targetUser?.companyId !== user.companyId) return null;
    } else {
      targetUser = await this.repository.getUserData(targetUserId);
    }

    const consent = await this.repository.findActiveConsent(targetUserId, CURRENT_TERMS_VERSION);
    if (!consent) return null;

    if (consent.pdfBase64) {
      return consent.pdfBase64;
    }

    // PDF is missing, let's regenerate it on demand
    try {
      const userName = targetUser?.name || 'Usuário';
      const companyName = targetUser?.company?.name || 'Empresa Cliente';
      
      const newPdfBase64 = await this.generatePDFBase64({
        userName,
        userEmail: targetUser?.email || '',
        companyName,
        termVersion: consent.termVersion,
        purpose: consent.purpose || TERMS_PURPOSE,
        ipAddress: consent.ipAddress,
        latitude: consent.latitude,
        longitude: consent.longitude,
        address: consent.address,
        photoBase64: consent.photoBase64,
        date: consent.acceptedAt ? consent.acceptedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\u202F/g, ' ') : new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }).replace(/\u202F/g, ' '),
      });
      
      if (newPdfBase64) {
        await this.repository.updatePdfBase64(consent.id, newPdfBase64);
        return newPdfBase64;
      }
    } catch (e) {
      console.error('Falha ao regenerar PDF sob demanda:', e);
    }

    return null;
  }

  public async generatePDFBase64(data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 0, size: 'A4' });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err: any) => {
          console.error('PDFKit Stream Error:', err);
          reject(err);
        });
        doc.on('end', () => {
          resolve(Buffer.concat(buffers).toString('base64'));
        });

        // Cores
        const primaryColor = '#1e293b'; // Slate 800
        const secondaryColor = '#64748b'; // Slate 500
        const accentColor = '#3b82f6'; // Blue 500
        const lightGray = '#f8fafc'; // Slate 50
        const borderColor = '#e2e8f0'; // Slate 200

        // ==========================================
        // HEADER
        // ==========================================
        doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
        doc.fillColor('#ffffff')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('TERMO DE USO E PRIVACIDADE', 50, 35);
        doc.fillColor('#94a3b8')
           .fontSize(10)
           .font('Helvetica')
           .text(`Innovation System - Em conformidade com a LGPD`, 50, 65);

        // ==========================================
        // BODY CONFIG
        // ==========================================
        let cursorY = 130;
        const leftMargin = 50;
        const contentWidth = doc.page.width - 100;

        const drawLabelValue = (label: string, value: string, x: number, y: number, w: number) => {
          doc.fontSize(9).font('Helvetica-Bold').fillColor(secondaryColor).text(label.toUpperCase(), x, y);
          doc.fontSize(11).font('Helvetica').fillColor('#0f172a').text(value, x, y + 12, { width: w });
        };

        const drawSectionTitle = (title: string, y: number) => {
          doc.rect(leftMargin, y, contentWidth, 24).fill(lightGray);
          doc.rect(leftMargin, y, 4, 24).fill(accentColor);
          doc.fontSize(12).font('Helvetica-Bold').fillColor(primaryColor).text(title, leftMargin + 15, y + 6);
          return y + 40;
        };

        // ==========================================
        // SEÇÃO: DADOS DO TITULAR E EMPRESA
        // ==========================================
        cursorY = drawSectionTitle('DADOS DO TITULAR E CONTROLADORA', cursorY);
        
        drawLabelValue('Nome do Titular', data.userName, leftMargin, cursorY, 250);
        drawLabelValue('E-mail', data.userEmail, leftMargin + 260, cursorY, 200);
        cursorY += 40;
        
        drawLabelValue('Empresa (Controladora)', data.companyName, leftMargin, cursorY, 250);
        drawLabelValue('Operadora de Dados', 'Innovation System e consultoria', leftMargin + 260, cursorY, 200);
        cursorY += 50;

        // ==========================================
        // SEÇÃO: DADOS TÉCNICOS DO ACEITE
        // ==========================================
        cursorY = drawSectionTitle('DADOS TÉCNICOS DO ACEITE ELETRÔNICO', cursorY);
        
        drawLabelValue('Data e Hora do Registro', data.date, leftMargin, cursorY, 250);
        drawLabelValue('Endereço IP', data.ipAddress || 'Não identificado', leftMargin + 260, cursorY, 200);
        cursorY += 40;

        drawLabelValue('Versão do Termo', data.termVersion, leftMargin, cursorY, 250);
        
        if (data.latitude && data.longitude) {
          drawLabelValue('Coordenadas (Lat/Lon)', `${data.latitude}, ${data.longitude}`, leftMargin + 260, cursorY, 200);
          cursorY += 40;
        } else {
          drawLabelValue('Localização', 'Não capturada', leftMargin + 260, cursorY, 200);
          cursorY += 40;
        }

        if (data.address) {
          drawLabelValue('Endereço Aproximado', data.address, leftMargin, cursorY, contentWidth);
          cursorY += (doc.heightOfString(data.address, { width: contentWidth, font: 'Helvetica', size: 11 }) + 20);
        }

        // ==========================================
        // SEÇÃO: DECLARAÇÃO E FINALIDADE
        // ==========================================
        cursorY = drawSectionTitle('TERMOS DA DECLARAÇÃO DE ACEITE', cursorY);
        
        const declaration = `Declaro que li, compreendi e aceito integralmente os Termos de Uso e a Política de Privacidade (incluindo cláusulas LGPD e ferramentas de IA da Innovation System). Estou ciente de que esta é uma assinatura eletrônica com validade legal e que descumprimentos das regras da empresa podem acarretar em medidas disciplinares como advertência e suspensão.\n\nFinalidade do Tratamento: ${data.purpose}`;
        
        doc.rect(leftMargin, cursorY, contentWidth, doc.heightOfString(declaration, { width: contentWidth - 30, font: 'Helvetica', size: 10 }) + 30)
           .strokeColor(borderColor)
           .lineWidth(1)
           .stroke();
           
        doc.fontSize(10).font('Helvetica').fillColor('#334155').text(declaration, leftMargin + 15, cursorY + 15, { width: contentWidth - 30, align: 'justify', lineGap: 3 });
        
        cursorY += doc.heightOfString(declaration, { width: contentWidth - 30, font: 'Helvetica', size: 10 }) + 50;

        // ==========================================
        // SEÇÃO: BIOMETRIA FACIAL (SE HOUVER)
        // ==========================================
        if (data.photoBase64) {
          // Checar se há espaço na página atual, senão quebrar página
          if (cursorY + 180 > doc.page.height - 50) {
            doc.addPage();
            cursorY = 50;
          }

          cursorY = drawSectionTitle('EVIDÊNCIA BIOMÉTRICA FACIAL (FACE ID)', cursorY);
          
          try {
            const base64Data = data.photoBase64.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            
            // Fundo da imagem
            doc.rect(leftMargin, cursorY, 120, 160).fillAndStroke(lightGray, borderColor);
            
            // Centralizar a imagem no quadro
            doc.image(imgBuffer, leftMargin + 5, cursorY + 5, { fit: [110, 150], align: 'center', valign: 'center' });
            
            doc.fontSize(8).font('Helvetica-Oblique').fillColor(secondaryColor).text('Imagem capturada no momento exato do aceite para fins de auditoria e validação de identidade (Art. 10, II da LGPD).', leftMargin + 140, cursorY + 20, { width: contentWidth - 140, align: 'justify' });
            
          } catch (e) {
            console.error('Falha ao inserir foto no PDF', e);
            doc.fontSize(10).font('Helvetica-Oblique').fillColor('#ef4444').text('A imagem biométrica foi recebida, mas ocorreu um erro ao anexá-la no documento físico.', leftMargin, cursorY + 10);
          }
        }

        // ==========================================
        // FOOTER
        // ==========================================
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(lightGray);
          doc.fontSize(8).font('Helvetica').fillColor(secondaryColor)
             .text(`Gerado por Innovation System - Autenticação Digital segura.`, leftMargin, doc.page.height - 25);
          doc.fontSize(8)
             .text(`Página ${i + 1} de ${pageCount}`, doc.page.width - leftMargin - 50, doc.page.height - 25, { width: 50, align: 'right' });
        }

        doc.end();
      } catch (e: any) {
        console.error('CRITICAL PDF ERROR:', e);
        reject(e);
      }
    });
  }
}
