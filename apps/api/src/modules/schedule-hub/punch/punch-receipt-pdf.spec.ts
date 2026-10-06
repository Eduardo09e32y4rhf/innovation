import { buildPunchReceiptPdf, describeDevice, maskCpf } from './punch-receipt-pdf';

describe('comprovante de ponto em PDF', () => {
  it('mascara o CPF e descreve o dispositivo', () => {
    expect(maskCpf('123.456.789-09')).toBe('***.456.789-**');
    expect(maskCpf(null)).toBe('—');
    expect(describeDevice('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36')).toBe('Chrome em Android');
    expect(describeDevice('')).toBe('—');
  });

  it('gera um PDF valido com os dados do registro', async () => {
    const pdf = await buildPunchReceiptPdf({
      company: { name: 'Empresa Teste Ltda', document: '12.345.678/0001-90' },
      employee: { name: 'Maria da Silva', registration: '0042', cpf: '12345678909', position: 'Analista' },
      event: { receipt: 'ABCDEF1234567890ABCDEF12', typeLabel: 'Entrada', occurredAt: new Date('2026-10-06T11:03:09Z'), origin: 'APP', address: 'Av. Paulista, 1000, São Paulo', latitude: -23.5614, longitude: -46.6559, withinFence: true, distanceMeters: 12, ipAddress: '203.0.113.7', userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36' },
      issuedAt: new Date('2026-10-06T12:00:00Z'),
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1500);
  });
});
