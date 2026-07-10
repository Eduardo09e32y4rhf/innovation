const PDFDocument = require('pdfkit');

function generatePDFBase64(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
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

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

generatePDFBase64({
  userName: 'Test',
  userEmail: 'test@test.com',
  companyName: 'Test Corp',
  termVersion: '1.0',
  purpose: 'Test',
  date: '2026-07-09'
}).then(res => {
  console.log('Success, length:', res.length);
}).catch(e => {
  console.error('Error:', e);
});
