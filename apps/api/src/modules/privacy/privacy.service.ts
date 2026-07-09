import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type { JwtUser } from '../../common/types/auth.types';
import { CURRENT_TERMS_VERSION, TERMS_PURPOSE } from './privacy.constants';
import { PrivacyRepository } from './privacy.repository';
import * as PDFDocumentType from 'pdfkit';
const PDFDocument = require('pdfkit');

@Injectable()
export class PrivacyService {
  constructor(private readonly repository: PrivacyRepository) {}

  async status(user: JwtUser) {
    const consent = await this.repository.findActiveConsent(user.sub, CURRENT_TERMS_VERSION);
    return {
      required: !consent,
      accepted: Boolean(consent),
      termVersion: CURRENT_TERMS_VERSION,
      acceptedAt: consent?.acceptedAt ?? null,
      purpose: TERMS_PURPOSE,
    };
  }

  async accept(user: JwtUser, requestMeta: { ipAddress?: string; userAgent?: string }, body?: any) {
    const userData = await this.repository.getUserData(user.sub);
    const userName = userData?.name || user.name || 'Usuário';
    const companyName = userData?.company?.name || 'Empresa Cliente';
    
    let pdfBase64: string | undefined;
    try {
      pdfBase64 = await this.generatePDFBase64({
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
        date: new Date().toLocaleString('pt-BR'),
      });
    } catch (e) {
      console.error('Erro gerando PDF', e);
    }

    const consent = await this.repository.acceptConsent({
      companyId: user.companyId,
      userId: user.sub,
      termVersion: CURRENT_TERMS_VERSION,
      purpose: TERMS_PURPOSE,
      latitude: body?.latitude,
      longitude: body?.longitude,
      address: body?.address,
      photoBase64: body?.photoBase64,
      pdfBase64,
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

    await this.repository.createAuditLog({
      companyId: user.companyId,
      userId: user.sub,
      action: 'PRIVACY_TERMS_ACCEPTED',
      entity: 'PrivacyConsent',
      entityId: consent.id,
      metadata: { termVersion: CURRENT_TERMS_VERSION, latitude: body?.latitude, longitude: body?.longitude },
      ...requestMeta,
    });

    return { accepted: true, termVersion: CURRENT_TERMS_VERSION, acceptedAt: consent.acceptedAt };
  }

  async getTermsPdf(user: JwtUser, targetUserId: string) {
    // Basic authorization check: DEV can download any, Admin/RH can download from their company
    if (user.role !== 'DEV' && user.role !== 'ADMIN' && user.role !== 'RH') {
      if (user.sub !== targetUserId) return null;
    }
    
    if (user.role !== 'DEV' && user.sub !== targetUserId) {
      const targetUser = await this.repository.getUserData(targetUserId);
      if (targetUser?.companyId !== user.companyId) return null;
    }

    const consent = await this.repository.findActiveConsent(targetUserId, CURRENT_TERMS_VERSION);
    return consent?.pdfBase64 || null;
  }

  private generatePDFBase64(data: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err: any) => {
          console.error('PDFKit Stream Error:', err);
          reject(err);
        });
        doc.on('end', () => {
          resolve(Buffer.concat(buffers).toString('base64'));
        });

        doc.fontSize(20).font('Helvetica-Bold').text('Termo de Uso e Privacidade', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).font('Helvetica').text(`Versão: ${data.termVersion}`);
        doc.text(`Data e Hora: ${data.date}`);
        doc.text(`IP: ${data.ipAddress || 'Não identificado'}`);
        if (data.latitude && data.longitude) {
          doc.text(`Localização: Lat ${data.latitude}, Lon ${data.longitude}`);
        }
        if (data.address) {
          doc.text(`Endereço Aproximado: ${data.address}`);
        }
        doc.moveDown();
        
        doc.fontSize(14).font('Helvetica-Bold').text('Dados do Titular:');
        doc.fontSize(12).font('Helvetica');
        doc.text(`Nome: ${data.userName}`);
        doc.text(`E-mail: ${data.userEmail}`);
        doc.text(`Empresa (Controladora): ${data.companyName}`);
        doc.text(`Operadora: Innovation System e consultoria`);
        doc.moveDown();

        doc.fontSize(14).font('Helvetica-Bold').text('Declaração de Aceite:');
        doc.fontSize(12).font('Helvetica');
        const declaration = `Declaro que li, compreendi e aceito integralmente os Termos de Uso e a Política de Privacidade (incluindo cláusulas LGPD e ferramentas de IA da Innovation System). Estou ciente de que esta é uma assinatura eletrônica com validade legal e que descumprimentos das regras da empresa podem acarretar em medidas disciplinares como advertência e suspensão. Finalidade: ${data.purpose}`;
        doc.text(declaration, { align: 'justify' });
        doc.moveDown(2);

        if (data.photoBase64) {
          try {
            const base64Data = data.photoBase64.replace(/^data:image\/\w+;base64,/, '');
            const imgBuffer = Buffer.from(base64Data, 'base64');
            doc.text('Registro Biomêtrico Facial (Face ID):');
            doc.moveDown(0.5);
            doc.image(imgBuffer, { width: 150 });
          } catch (e) {
            console.error('Falha ao inserir foto no PDF', e);
          }
        }

        doc.end();
      } catch (e: any) {
        console.error('CRITICAL PDF ERROR:', e);
        reject(e);
      }
    });
  }
}
