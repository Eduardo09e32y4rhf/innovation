/**
 * ORÁCULO INDEPENDENTE da folha CLT 2026 (versão CLT_2026_1).
 *
 * Reimplementa as regras de docs/CLT_PAYROLL_RULES_2026.md SEM importar nada do sistema, para o robô comparar o
 * resultado do sistema com um cálculo feito por outro caminho. Se o oráculo e o sistema divergirem, um dos dois
 * está errado: o relatório aponta o caso e o campo, e quem decide é a contabilidade.
 *
 * Fontes das tabelas: INSS e IRRF 2026 (gov.br), Lei 15.270/2025 (redução do IRRF), citadas no documento de regras.
 * Todo valor em R$ é arredondado em centavos, componente a componente (igual ao fechamento).
 */

export const TABELAS = {
  versao: 'CLT_2026_1',
  inss: { faixas: [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]], teto: 8475.55 },
  irrf: {
    faixas: [[2428.8, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]],
    descontoSimplificado: 607.2, deducaoPorDependente: 189.59,
    isencaoTotalAte: 5000, reducaoParcialAte: 7350, reducaoBase: 978.62, reducaoFator: 0.133145,
  },
  fgts: 0.08,
  adicionalNoturno: 0.2, he50: 1.5, he100: 2, fatorDivisor: 5,
};

/** Arredonda em centavos, meio para cima, descartando o ruído de ponto flutuante (121,57499999999999 vale 121,575). */
export const centavos = (v) => (Math.sign(v) * Math.round(Number((Math.abs(v) * 100).toPrecision(14)))) / 100 || 0;

export function inss(base) {
  const { faixas, teto } = TABELAS.inss;
  const b = Math.min(Math.max(0, base), teto);
  let anterior = 0;
  let total = 0;
  for (const [limite, aliquota] of faixas) {
    if (b <= anterior) break;
    total += (Math.min(b, limite) - anterior) * aliquota;
    anterior = limite;
  }
  return centavos(total);
}

export function irrf(rendimentoBruto, inssPago, dependentes = 0) {
  const t = TABELAS.irrf;
  const deducaoLegal = inssPago + dependentes * t.deducaoPorDependente;
  const base = centavos(Math.max(0, rendimentoBruto - Math.max(t.descontoSimplificado, deducaoLegal)));
  const [, aliquota, parcela] = t.faixas.find(([limite]) => base <= limite);
  const imposto = Math.max(0, base * aliquota - parcela);
  let reducao = 0;
  if (rendimentoBruto <= t.isencaoTotalAte) reducao = imposto;
  else if (rendimentoBruto <= t.reducaoParcialAte) reducao = Math.max(0, t.reducaoBase - t.reducaoFator * rendimentoBruto);
  return { base, imposto: centavos(Math.max(0, imposto - Math.min(imposto, reducao))) };
}

/**
 * @param {{salario:number, minutosSemana:number, he50:number, he100:number, noturno:number, faltas:number, atrasos?:number, saidasAntecipadas?:number,
 *          diasUteis:number, diasDescanso:number, dependentes?:number, dsr?:boolean}} e  (minutos nos campos de tempo)
 */
export function folhaOraculo(e) {
  const T = TABELAS;
  const salario = centavos(Math.max(0, e.salario));
  const divisor = Math.max(1, (e.minutosSemana / 60) * T.fatorDivisor);
  const valorHora = salario / divisor;
  const he50 = centavos((e.he50 / 60) * valorHora * T.he50);
  const he100 = centavos((e.he100 / 60) * valorHora * T.he100);
  const noturno = centavos((e.noturno / 60) * valorHora * T.adicionalNoturno);
  const variavel = he50 + he100 + noturno;
  const dsr = e.dsr !== false && e.diasUteis > 0 ? centavos((variavel / e.diasUteis) * Math.max(0, e.diasDescanso)) : 0;
  const desc = (min) => centavos((Math.max(0, min ?? 0) / 60) * valorHora);
  const faltas = desc(e.faltas), atrasos = desc(e.atrasos), saidas = desc(e.saidasAntecipadas);
  const bruto = centavos(Math.max(0, salario + variavel + dsr - (faltas + atrasos + saidas)));
  const inssValor = inss(bruto);
  const ir = irrf(bruto, inssValor, e.dependentes ?? 0);
  return {
    salaryBase: salario, monthlyDivisor: divisor, overtime50Value: he50, overtime100Value: he100, nightShiftValue: noturno, dsrValue: dsr,
    absenceDiscount: faltas, lateDiscount: atrasos, earlyLeaveDiscount: saidas, grossPay: bruto,
    inssDiscount: inssValor, irrfBase: ir.base, irrfDiscount: ir.imposto,
    fgtsAmount: centavos(bruto * T.fgts), netPay: centavos(Math.max(0, bruto - inssValor - ir.imposto)),
  };
}

/** Compara o resultado do sistema com o do oráculo, campo a campo (tolerância de 1 centavo por arredondamento em cadeia). */
export function compararFolha(sistema, oraculo, tolerancia = 0.011) {
  const divergencias = [];
  for (const [campo, esperado] of Object.entries(oraculo)) {
    const obtido = Number(sistema?.[campo]);
    if (!Number.isFinite(obtido) || Math.abs(obtido - esperado) > tolerancia) divergencias.push({ campo, esperado, obtido: sistema?.[campo] });
  }
  return divergencias;
}

/** Regras que valem para qualquer entrada, sem precisar de oráculo: se quebrarem, é defeito do sistema. */
export function invariantes(r) {
  const erros = [];
  const igual = (a, b) => Math.abs(a - b) <= 0.011;
  if (r.netPay > r.grossPay + 0.005) erros.push('líquido maior que o bruto');
  if (!igual(r.netPay, Math.max(0, r.grossPay - r.inssDiscount - r.irrfDiscount))) erros.push('líquido ≠ bruto − INSS − IRRF (o FGTS não pode ser descontado do empregado)');
  if (r.inssDiscount > inss(TABELAS.inss.teto) + 0.011) erros.push('INSS acima do máximo do teto (R$ 988,09 em 2026)');
  if (r.inssDiscount < 0 || r.irrfDiscount < 0 || r.fgtsAmount < 0) erros.push('valor negativo');
  if (!igual(r.fgtsAmount, centavos(r.grossPay * TABELAS.fgts))) erros.push('FGTS ≠ 8% do bruto');
  return erros;
}
