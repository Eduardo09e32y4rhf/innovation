import { describe, expect, it } from 'vitest';
import { RecruitmentService } from '../../modules/jobs/recruitment.service';
import { OverviewService } from '../../modules/schedule-hub/overview/overview.service';
import { buildCsv, csvCell, CSV_BOM } from './csv';

/** Leitor de CSV mínimo (separador ';', aspas duplicadas) para conferir que o arquivo volta igual ao que entrou. */
function ler(csv: string): string[][] {
  const linhas: string[][] = [];
  let campo = ''; let linha: string[] = []; let aspas = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (aspas) { if (c === '"' && csv[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c; }
    else if (c === '"') aspas = true;
    else if (c === ';') { linha.push(campo); campo = ''; }
    else if (c === '\r' && csv[i + 1] === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; i++; }
    else campo += c;
  }
  linha.push(campo); linhas.push(linha);
  return linhas;
}

describe('csvCell / buildCsv', () => {
  it('abre com BOM UTF-8 e usa ; e CRLF (Excel pt-BR sem estragar acentos)', () => {
    const csv = buildCsv(['Funcionário', 'Cargo'], [['José', 'Analista']]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv).toContain('"Funcionário";"Cargo"\r\n"José";"Analista"');
    expect(csv).not.toMatch(/Ã|Â|ï»¿/); // nenhum mojibake
  });

  it('vai e volta sem perder nada: aspas, ponto e vírgula, vírgula, acentos e emojis', () => {
    const linha = ['Ana "A." Souza', 'a;b,c', 'Ação ç ã é — 😀', '', null, undefined, 0, 12.5];
    const lido = ler(buildCsv(['x', 'x', 'x', 'x', 'x', 'x', 'x', 'x'], [linha]).slice(1));
    expect(lido[1]).toEqual(['Ana "A." Souza', 'a;b,c', 'Ação ç ã é — 😀', '', '', '', '0', '12.5']);
  });

  it('quebras de linha dentro da célula não quebram a linha do arquivo', () => {
    const csv = buildCsv(['a'], [['linha1\nlinha2\r\nlinha3\rfim']]);
    expect(ler(csv.slice(1))).toEqual([['a'], ['linha1 linha2 linha3 fim']]);
  });

  it('protege contra injeção de fórmula (=, +, -, @ e TAB)', () => {
    for (const perigoso of ['=HYPERLINK("http://x","clique")', '+cmd|calc', '-2+3+cmd', '@SUM(A1)', '\t=1+1', '=1+1']) {
      expect(csvCell(perigoso)).toMatch(/^"'/);
    }
  });

  it('NÃO estraga números, horas e saldos negativos que parecem fórmula ("-1:30", "-10", "-0,5")', () => {
    for (const legitimo of ['-1:30', '-0:05', '-10', '-0,5', '-12.75', '8:15', 42, -3]) {
      expect(csvCell(legitimo)).toBe(`"${legitimo}"`);
    }
  });

  it('texto comum que só contém o sinal no meio fica intacto', () => {
    expect(csvCell('a=b')).toBe('"a=b"');
    expect(csvCell('Maria-Clara')).toBe('"Maria-Clara"');
    expect(csvCell('rh@empresa.com')).toBe('"rh@empresa.com"');
  });
});

describe('CSVs reais do sistema', () => {
  it('relatório de escalas: saldo e banco de horas negativos saem sem apóstrofo, nome malicioso é protegido', async () => {
    const servico = Object.create(OverviewService.prototype) as OverviewService & { reportRows: unknown };
    (servico as any).reportRows = async () => [
      { name: '=cmd|calc', department: 'Operação', position: 'Auxiliar', days: 20, worked: 9600, balance: -90, late: 15, overtime50: 0, overtime100: 0, night: 0, bank: -125 },
      { name: 'José "Zé" da Silva', department: 'Logística', position: 'Gestor', days: 22, worked: 10560, balance: 30, late: 0, overtime50: 60, overtime100: 0, night: 0, bank: 0 },
    ];
    const csv = await servico.reportCsv({ role: 'RH' } as never, '2026-10');
    const linhas = ler(csv.slice(1));
    expect(linhas[0]).toContain('Funcionário');
    expect(linhas[1][0]).toBe("'=cmd|calc");
    expect(linhas[1][5]).toBe('-1:30'); // saldo
    expect(linhas[1][10]).toBe('-2:05'); // banco de horas
    expect(linhas[2][0]).toBe('José "Zé" da Silva');
    expect(csv).not.toContain("'-");
  });

  it('candidatos: pontuação negativa (eliminatória) não ganha apóstrofo e respostas com fórmula são protegidas', async () => {
    const servico = Object.create(RecruitmentService.prototype) as any;
    servico.listApplications = async () => ({
      pipeline: { stages: [{ id: 's1', name: 'Triagem' }] },
      questions: [{ id: 'q1', label: 'Pretensão salarial' }],
      applications: [{
        candidate: { name: 'Bruno', email: 'b@x.com', phone: '11 99999-0000' }, stageId: 's1', status: 'SUBMITTED', score: -10, evaluationScore: 4.5, source: 'SITE',
        createdAt: new Date('2026-10-05T12:00:00Z'), tags: [{ name: 'urgente' }, { name: 'junior' }], answers: [{ questionId: 'q1', value: '=1+1' }],
      }],
    });
    const csv = await servico.exportCsv('empresa', 'vaga', {});
    const linhas = ler(csv.slice(1));
    expect(linhas[1][4]).toBe('-10');
    expect(linhas[1][8]).toBe('urgente, junior');
    expect(linhas[1][9]).toBe("'=1+1");
  });
});
