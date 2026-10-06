import { buildTimeSheetPdf, formatCpf, formatMinutes, incidentLabel, payslipLines, type TimeSheetData } from './time-sheet-pdf';

const base: TimeSheetData = {
  id: 'closing-1',
  status: 'APPROVED',
  periodStart: new Date('2026-09-01T00:00:00Z'),
  periodEnd: new Date('2026-09-30T00:00:00Z'),
  company: { name: 'Empresa Teste', document: '12.345.678/0001-90' },
  employee: { name: 'Maria da Silva', cpf: '12345678909', registration: '0042', position: 'Analista', department: 'RH' },
  tracks: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 8, i + 1)),
    entry: new Date(Date.UTC(2026, 8, i + 1, 11, 0)),
    exit: new Date(Date.UTC(2026, 8, i + 1, 20, 0)),
    totalWorked: 480,
    dailyBalance: i % 5 === 0 ? -30 : 0,
    incidentType: i % 5 === 0 ? 'atraso' : 'normal',
  })),
  salaryBase: 3000, overtime50: 4, overtime50Value: 81.82, absenceDiscount: 40, inssDiscount: 250, irrfDiscount: 0, netPay: 2791.82, grossPay: 3081.82,
  payableWorkdays: 22, monthlyDivisor: 220, hourlyRate: 13.64, normalHours: 176, fgtsAmount: 246.55,
};

describe('folha de ponto em formato de holerite', () => {
  it('lista so proventos e descontos que existem, sempre com o salario base', () => {
    const lines = payslipLines(base);
    expect(lines.map((line) => line.description)).toEqual(['Salário base', 'Hora extra 50%', 'Faltas e atrasos', 'INSS']);
    expect(lines[0].earning).toBe(3000);
    expect(lines.find((line) => line.description === 'INSS')?.deduction).toBe(250);
  });

  it('formata minutos, CPF e ocorrencias sem expor codigos internos', () => {
    expect(formatMinutes(-90)).toBe('-1:30');
    expect(formatMinutes(null)).toBe('--');
    expect(formatCpf('12345678909')).toBe('123.456.789-09');
    expect(formatCpf(null)).toBe('Não informado');
    expect(incidentLabel('hora_extra_50')).toBe('Hora extra 50%');
    expect(incidentLabel('atraso_saida_antecipada')).toBe('Atraso e saída antecip.');
    expect(incidentLabel(null)).toBe('Normal');
  });

  it('gera um PDF valido com mais de uma pagina (holerite + espelho)', async () => {
    const pdf = await buildTimeSheetPdf(base);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length ?? 0).toBe(2); // holerite + espelho, sem paginas em branco do rodape
  });
});
