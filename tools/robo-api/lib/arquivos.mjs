/**
 * Validadores do que o usuário recebe: PDFs e CSVs. Funções puras (sem rede), testadas em tests/unit/payroll/arquivos.spec.ts.
 * Cada função devolve a lista de problemas em português; lista vazia = arquivo bom.
 */
import { createHash } from 'node:crypto';

const cabecalho = (headers, nome) => (typeof headers?.get === 'function' ? headers.get(nome) : headers?.[nome.toLowerCase()]) ?? null;

/** Nome do arquivo que o navegador vai salvar, conforme o Content-Disposition (prefere filename*=UTF-8''). */
export function nomeDoArquivo(disposition) {
  if (!disposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8) { try { return decodeURIComponent(utf8[1]); } catch { return utf8[1]; } }
  return /filename="([^"]*)"/i.exec(disposition)?.[1] ?? null;
}

export function validarPdf(buffer, headers, { paginasMin = 1, tamanhoMin = 1000, extensao = '.pdf' } = {}) {
  const erros = [];
  if (!buffer || buffer.length === 0) return ['arquivo vazio'];
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') erros.push('não começa com %PDF- (não é um PDF de verdade)');
  if (!buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1').includes('%%EOF')) erros.push('PDF truncado: falta o marcador final %%EOF (o leitor mostra "arquivo danificado")');
  if (buffer.length < tamanhoMin) erros.push(`PDF pequeno demais (${buffer.length} bytes): provavelmente sem conteúdo`);
  const paginas = (buffer.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
  if (paginas < paginasMin) erros.push(`PDF sem páginas (achei ${paginas})`);
  const tipo = cabecalho(headers, 'content-type');
  if (!tipo || !/^application\/pdf/i.test(tipo)) erros.push(`Content-Type deveria ser application/pdf, veio "${tipo}"`);
  const disposicao = cabecalho(headers, 'content-disposition');
  const nome = nomeDoArquivo(disposicao);
  if (!nome) erros.push('sem nome de arquivo no Content-Disposition');
  else {
    if (!nome.toLowerCase().endsWith(extensao)) erros.push(`nome do arquivo "${nome}" não termina em ${extensao}`);
    if (/%[0-9A-Fa-f]{2}/.test(nome)) erros.push(`nome do arquivo "${nome}" tem códigos %XX: o usuário salvaria o arquivo com o nome truncado/feio`);
    if (/[\r\n"]/.test(nome)) erros.push('nome do arquivo com caractere perigoso');
  }
  const tamanho = cabecalho(headers, 'content-length');
  if (tamanho != null && Number(tamanho) !== buffer.length) erros.push(`Content-Length (${tamanho}) diferente do tamanho recebido (${buffer.length})`);
  const sha = cabecalho(headers, 'x-document-sha256');
  if (sha && createHash('sha256').update(buffer).digest('hex') !== sha.toLowerCase()) erros.push('o hash SHA-256 informado no cabeçalho não confere com o arquivo (integridade quebrada)');
  const cache = cabecalho(headers, 'cache-control');
  if (!cache || !/no-store/i.test(cache)) erros.push('documento pessoal sem Cache-Control: no-store (pode ficar guardado no navegador/proxy)');
  return erros;
}

export function validarCsv(texto, headers, { colunasMin = 2, cabecalhoEsperado = [] } = {}) {
  const erros = [];
  if (!texto) return ['arquivo vazio'];
  if (!texto.startsWith('﻿')) erros.push('sem BOM UTF-8: o Excel vai abrir com acentos quebrados');
  const corpo = texto.replace(/^﻿/, '');
  if (/Ã[\u0080-¿]|Â[\u0080-¿]|ï»¿/.test(corpo)) erros.push('texto com acentos quebrados (mojibake: "Ã£", "Ã§"...)');
  if (/(^|;)"'-\d/.test(corpo)) erros.push('número negativo com apóstrofo ("\'-1:30"): o Excel mostra o apóstrofo');
  const linhas = corpo.split('\r\n');
  if (linhas.some((l) => l.includes('\n'))) erros.push('quebra de linha sem CR (esperado CRLF)');
  const colunas = (linha) => { let n = 1, aspas = false; for (let i = 0; i < linha.length; i++) { const c = linha[i]; if (c === '"') { if (aspas && linha[i + 1] === '"') i++; else aspas = !aspas; } else if (c === ';' && !aspas) n++; } return n; };
  const esperadas = colunas(linhas[0]);
  if (esperadas < colunasMin) erros.push(`cabeçalho com ${esperadas} coluna(s)`);
  linhas.forEach((l, i) => { if (l && colunas(l) !== esperadas) erros.push(`linha ${i + 1} tem ${colunas(l)} colunas (cabeçalho tem ${esperadas})`); });
  for (const nome of cabecalhoEsperado) if (!linhas[0].includes(`"${nome}"`)) erros.push(`falta a coluna "${nome}"`);
  const tipo = cabecalho(headers, 'content-type');
  if (!tipo || !/^text\/csv/i.test(tipo) || !/utf-8/i.test(tipo)) erros.push(`Content-Type deveria ser text/csv; charset=utf-8, veio "${tipo}"`);
  const nome = nomeDoArquivo(cabecalho(headers, 'content-disposition'));
  if (!nome || !nome.toLowerCase().endsWith('.csv')) erros.push(`nome do arquivo "${nome}" não termina em .csv`);
  return erros;
}
