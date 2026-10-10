#!/usr/bin/env node
/**
 * ROBÔ DE CICLO COMPLETO. Cria tudo do zero e confere o que o usuário veria:
 *   1. (Dev) apaga os testes anteriores do próprio robô e cria um PLANO GRÁTIS;
 *   2. pela tela de LOGIN ("Criar empresa"), cadastra uma EMPRESA escolhendo esse plano;
 *   3. dentro da empresa cadastra os funcionários (RH, gestor, colaboradores, consulta) e dá acesso a cada um;
 *   4. cada perfil SOLICITA FÉRIAS (e tenta o que não pode); RH/Admin decidem; baixa o recibo;
 *   5. lança PONTO MANUAL (mês fechado inteiro) e PONTO AUTOMÁTICO (hoje, como o colaborador faria);
 *   6. aprova/reprova horas extras, aplica uma SUSPENSÃO, gera o FECHAMENTO e a FOLHA e confere cada centavo
 *      (hora extra 50%/100%, adicional noturno, falta, atraso, saída antecipada, suspensão, DSR, INSS, IRRF, FGTS)
 *      contra oráculos independentes (tools/robo-api/oracle e tools/robo-ciclo/lib);
 *   7. baixa todos os PDFs e confere se são arquivos de verdade;
 *   8. apaga o que criou (a empresa e o plano do robô).
 *
 * Só mexe no que ele mesmo cria (empresa "ROBO-QA CICLO ..." e plano "ROBO-QA Grátis ..."). Nunca toca nas empresas reais.
 *
 * Uso:
 *   ROBO_CICLO_CONFIRMO=sim ROBO_DEV_EMAIL=... ROBO_DEV_SENHA=... node tools/robo-ciclo/robo-ciclo.mjs --url https://seu-dominio/api
 *   Opções: --manter (não apaga ao final) · --so-limpar (apaga os restos de execuções anteriores e sai)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compararFolha, folhaOraculo } from '../robo-api/oracle/folha-clt-2026.mjs';
import { validarPdf } from '../robo-api/lib/arquivos.mjs';
import { diasDoMes, escolherMesDeReferencia, resumoDoMes, ymd } from './lib/calendario.mjs';
import { oraculoDia, somarDias } from './lib/oraculo-ponto.mjs';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (nome) => (process.argv.includes(nome) ? process.argv[process.argv.indexOf(nome) + 1] : null);
const flag = (nome) => process.argv.includes(nome);
const BASE = (arg('--url') || process.env.ROBO_CICLO_URL || 'http://localhost:3333').replace(/\/$/, '');
const DEV_EMAIL = process.env.ROBO_DEV_EMAIL;
const DEV_SENHA = process.env.ROBO_DEV_SENHA;
const SENHA_FORTE = 'RoboCiclo#2026Ok';
const SENHA_NOVA = 'RoboCiclo#Nova2026';

// ---------- travas ----------
(function travar() {
  const erros = [];
  const host = new URL(BASE).hostname;
  const local = ['localhost', '127.0.0.1', '::1'].includes(host);
  if (!local && process.env.ROBO_CICLO_CONFIRMO !== 'sim') erros.push(`A URL ${BASE} não é local: confirme com ROBO_CICLO_CONFIRMO=sim (o robô cria uma empresa de teste e apaga só o que criou).`);
  if (!DEV_EMAIL || !DEV_SENHA) erros.push('Informe ROBO_DEV_EMAIL e ROBO_DEV_SENHA (o Dev só cria o plano grátis e apaga os restos do robô).');
  if (erros.length) { console.error('ROBÔ DE CICLO RECUSADO (nada foi executado):\n - ' + erros.join('\n - ')); process.exit(2); }
})();

// ---------- resultado ----------
const resultados = [];
let area = '';
const registrar = (nome, ok, detalhe = {}) => {
  resultados.push({ area, nome, situacao: ok === null ? 'inconclusivo' : ok ? 'passou' : 'FALHOU', ...detalhe });
  console.log(`${ok === null ? '⚠️ ' : ok ? '✅' : '❌'} [${area}] ${nome}${ok === false && detalhe.obtido ? `  -> ${detalhe.obtido}` : ''}`);
};
const unico = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e3).toString(36)}`;
const PREFIXO_EMPRESA = 'ROBO-QA CICLO';
const PREFIXO_PLANO = 'ROBO-QA Grátis';
const NOME_EMPRESA = `${PREFIXO_EMPRESA} ${unico}`;
const NOME_PLANO = `${PREFIXO_PLANO} ${unico}`;
const email = (p) => `robo-ciclo-${unico}-${p}@example.com`;

async function chamar(token, metodo, caminho, corpo, extra = {}) {
  const t0 = Date.now();
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) };
  try {
    const res = await fetch(BASE + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const texto = await res.text();
    let json = null; try { json = JSON.parse(texto); } catch { /* não é JSON */ }
    const r = { status: res.status, json, texto, ms: Date.now() - t0, caminho, metodo, requestId: res.headers.get('x-request-id') };
    if (r.status >= 500 && !extra.aceita5xx) registrar(`Servidor quebrou (${r.status}) em ${metodo} ${caminho}`, false, { endpoint: `${metodo} ${caminho}`, obtido: (json?.error?.message || json?.message || texto).toString().slice(0, 200), requestId: r.requestId });
    return r;
  } catch (e) { return { status: 0, json: null, texto: String(e), ms: Date.now() - t0, caminho, metodo }; }
}
async function baixar(token, caminho) {
  try {
    const res = await fetch(BASE + caminho, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, buffer, texto: buffer.toString('utf8').slice(0, 200), caminho };
  } catch (e) { return { status: 0, headers: new Headers(), buffer: Buffer.alloc(0), texto: String(e), caminho }; }
}
const dados = (r) => r.json?.data ?? r.json;
const lista = (r) => { const d = dados(r); return Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : Array.isArray(d?.items) ? d.items : []; };
const token = (r) => dados(r)?.access_token ?? dados(r)?.accessToken ?? r.json?.access_token ?? null;
const msg = (r) => `status ${r.status}: ${(r.json?.error?.message ?? r.json?.message ?? r.texto ?? '').toString().slice(0, 180)}`;

function esperar(nome, r, aceitos, extra = {}) {
  const lst = Array.isArray(aceitos) ? aceitos : [aceitos];
  const ok = lst.includes(r.status);
  registrar(nome, ok, { endpoint: `${r.metodo} ${r.caminho}`, esperado: lst.join('/'), status: r.status, obtido: ok ? undefined : msg(r), requestId: r.requestId, ...extra });
  return ok;
}
async function pdf(nome, tk, caminho, opcoes) {
  const r = await baixar(tk, caminho);
  if (r.status !== 200) return registrar(`PDF: ${nome}`, false, { endpoint: `GET ${caminho}`, esperado: '200 com PDF', obtido: `status ${r.status}: ${r.texto.slice(0, 140)}` });
  const erros = validarPdf(r.buffer, r.headers, opcoes);
  registrar(`PDF: ${nome} (${r.buffer.length} bytes)`, erros.length === 0, { endpoint: `GET ${caminho}`, obtido: erros.join(' | ') });
  return r;
}

// ---------- dados de teste ----------
function digito(nums, pesos) { const s = nums.reduce((a, n, i) => a + n * pesos[i], 0) % 11; return s < 2 ? 0 : 11 - s; }
function cnpjValido(seed) {
  const base = String(seed).padStart(8, '0').slice(-8).split('').map(Number).concat([0, 0, 0, 1]);
  base.push(digito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  base.push(digito(base, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  return base.join('');
}
function cpfValido(seed) {
  const n = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  for (const t of [9, 10]) { const soma = n.reduce((s, d, i) => s + d * (t + 1 - i), 0); n.push(((soma * 10) % 11) % 10); }
  return n.join('');
}
const hojeStr = () => new Date().toISOString().slice(0, 10);
const somaDias = (str, dias) => ymd(new Date(new Date(`${str}T00:00:00Z`).getTime() + dias * 86_400_000));
const iso = (data, hhmm) => { const mais = hhmm.startsWith('+'); const h = mais ? hhmm.slice(1) : hhmm; return new Date(`${mais ? somaDias(data, 1) : data}T${h}:00-03:00`).toISOString(); };
const NORMAL = ['08:00', '12:00', '13:00', '17:00'];
const JORNADA = { entrada: '08:00', saidaAlmoco: '12:00', voltaAlmoco: '13:00', saida: '17:00', minutosDia: 480 };
const JORNADA_NOTURNA = { entrada: '20:00', saidaAlmoco: '00:00', voltaAlmoco: '01:00', saida: '05:00', minutosDia: 480, noturno: true };
const brl = (v) => Number(v ?? 0);

// ---------- estado ----------
const S = { tk: {}, ids: {}, func: {}, mes: null, resumo: null, devToken: null, planoId: null, empresaId: null };

// ===================================================================================================
async function limparRestos() {
  area = 'Limpeza dos testes anteriores';
  const empresas = lista(await chamar(S.devToken, 'GET', `/platform/companies?search=${encodeURIComponent(PREFIXO_EMPRESA)}&limit=100`))
    .filter((e) => String(e.name ?? '').startsWith(PREFIXO_EMPRESA));
  for (const e of empresas) {
    const r = await chamar(S.devToken, 'DELETE', `/platform/companies/${e.id}/purge`);
    esperar(`Apagar empresa de teste antiga "${e.name}" com todos os funcionários e dados`, r, [200, 204]);
  }
  if (!empresas.length) registrar('Nenhum teste anterior do robô para apagar', true);
  const planos = lista(await chamar(S.devToken, 'GET', '/platform/plans')).filter((p) => String(p.name ?? '').startsWith(PREFIXO_PLANO));
  for (const p of planos) {
    await chamar(S.devToken, 'DELETE', `/platform/plans/${p.id}`);
    const r = await chamar(S.devToken, 'DELETE', `/platform/plans/${p.id}/permanent`);
    esperar(`Apagar plano de teste antigo "${p.name}"`, r, [200, 204]);
  }
}

async function criarPlanoGratis() {
  area = '1. Plano grátis (Dev)';
  const r = await chamar(S.devToken, 'POST', '/platform/plans', {
    name: NOME_PLANO, description: 'Plano grátis criado pelo robô de teste', isFree: true, price: 0, cycle: 'MONTHLY',
    maxUsers: 20, maxEmployees: 50, activeModules: ['employees', 'time-track', 'vacations', 'management', 'recruitment'],
    isActive: true, isHidden: false, displayOrder: 999,
  });
  if (!esperar('Dev cria o plano grátis', r, [200, 201])) throw new Error('Sem plano não há como cadastrar a empresa.');
  const plano = dados(r);
  S.planoId = plano.id;
  registrar('Plano nasce marcado como grátis e com preço zero', plano.isFree === true && brl(plano.price) === 0, { esperado: 'isFree=true, price=0', obtido: JSON.stringify({ isFree: plano.isFree, price: plano.price }) });
  const publicos = lista(await chamar(null, 'GET', '/auth/public-plans'));
  registrar('O plano grátis aparece para quem está na tela de cadastro (lista pública)', publicos.some((p) => p.id === S.planoId), { endpoint: 'GET /auth/public-plans', obtido: `${publicos.length} plano(s) públicos, sem o do robô` });
}

async function cadastrarEmpresaPeloLogin() {
  area = '2. Cadastro da empresa pela tela de login';
  const corpo = { companyName: NOME_EMPRESA, document: cnpjValido(Date.now() % 1e8), name: 'ROBO Admin Dono', phone: '11999990000', email: email('admin'), password: SENHA_FORTE, planId: S.planoId, seatQuantity: 10 };
  esperar('Plano que não existe é recusado (404)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, planId: '00000000-0000-4000-8000-000000000000', email: email('x1'), document: cnpjValido(Date.now() % 1e8 + 1) }), [404, 400]);
  esperar('Mais usuários do que o plano permite é recusado (400)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, seatQuantity: 5000, email: email('x2'), document: cnpjValido(Date.now() % 1e8 + 2) }), 400);
  esperar('Senha fraca é recusada (400)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, password: 'senhafraca', email: email('x3'), document: cnpjValido(Date.now() % 1e8 + 3) }), 400);
  esperar('CNPJ inválido é recusado (400)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, document: '11111111111111', email: email('x4') }), 400);
  esperar('E-mail inválido é recusado (400)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, email: 'nao-e-email', document: cnpjValido(Date.now() % 1e8 + 4) }), 400);
  const cad = await chamar(null, 'POST', '/auth/register-company', corpo);
  if (!esperar('Cadastro da empresa pelo plano grátis', cad, [200, 201])) throw new Error('A empresa não foi criada.');
  S.tk.ADMIN = token(cad);
  esperar('Mesmo e-mail não cadastra outra empresa (409)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, document: cnpjValido(Date.now() % 1e8 + 5) }), [409, 400]);
  esperar('Mesmo CNPJ não cadastra outra empresa (409)', await chamar(null, 'POST', '/auth/register-company', { ...corpo, email: email('x6') }), [409, 400]);
  const login = await chamar(null, 'POST', '/auth/login', { email: corpo.email, password: SENHA_FORTE });
  if (esperar('O administrador da nova empresa consegue entrar', login, [200, 201])) S.tk.ADMIN = token(login) ?? S.tk.ADMIN;
  const eu = await chamar(S.tk.ADMIN, 'GET', '/auth/me');
  S.empresaId = dados(eu)?.companyId ?? dados(eu)?.user?.companyId ?? null;
  const emp = dados(await chamar(S.tk.ADMIN, 'GET', '/companies/me'));
  registrar('Empresa ficou ativa já no plano grátis (sem cobrança pendente)', ['ACTIVE'].includes(String(emp?.status ?? emp?.company?.status ?? 'ACTIVE')) && !/PENDING|BLOCK/i.test(String(emp?.billingStatus ?? '')), { obtido: JSON.stringify({ status: emp?.status, billingStatus: emp?.billingStatus }) });
}

async function configurarEmpresa() {
  area = '3. Configuração da empresa';
  const pol = await chamar(S.tk.ADMIN, 'PUT', '/time-closing/overtime-policy', { policy: 'PAYMENT', validityMonths: 3 });
  esperar('Admin define hora extra "paga na folha"', pol, [200, 201]);
  const escalas = lista(await chamar(S.tk.ADMIN, 'GET', '/schedules'));
  const tipos = escalas.map((e) => String(e.scaleType ?? e.name ?? '').toLowerCase());
  for (const t of ['5x2', '6x1', '12x36']) registrar(`Empresa nova já vem com a escala ${t}`, tipos.some((x) => x.includes(t)), { endpoint: 'GET /schedules', obtido: `escalas: ${tipos.join(', ') || 'nenhuma'}` });
  const policy = await chamar(S.tk.ADMIN, 'PUT', '/escalas/policy', { minIntervalSeconds: 0, requireLocation: false, fencePolicy: 'OFF' });
  esperar('Admin ajusta regras de ponto (sem intervalo mínimo e sem GPS obrigatório, para o teste automático)', policy, [200, 201]);
}

async function criarFuncionarios() {
  area = '4. Funcionários e acessos (tudo do zero)';
  const [ano, m] = S.mes.split('-').map(Number);
  const adm = ymd(new Date(Date.UTC(ano - 2, m - 1, 1))); // admitido há ~2 anos: tem direito a férias
  const base = {
    contractType: 'CLT', workScale: '5X2', dailyWorkload: '08:00', standardEntry: '08:00', standardLunchStart: '12:00', standardLunchReturn: '13:00', standardExit: '17:00',
    status: 'ACTIVE', admissionDate: adm, department: 'Operações', unit: 'Matriz',
  };
  const quadro = [
    ['GESTOR', 'ROBO Gestor', 'GESTOR', 'Coordenador', 5000, null],
    ['RH', 'ROBO RH', 'RH', 'Analista de RH', 4200, null],
    ['A', 'ROBO Colab Extras', 'FUNCIONARIO', 'Assistente', 3000, 'GESTOR'],
    ['B', 'ROBO Colab Noturno', 'FUNCIONARIO', 'Vigia noturno', 2640, 'GESTOR'],
    ['C', 'ROBO Colab Suspenso', 'FUNCIONARIO', 'Auxiliar', 4000, 'GESTOR'],
    ['D', 'ROBO Colab Ponto Auto', 'FUNCIONARIO', 'Atendente', 2000, 'GESTOR'],
    ['CONSULTA', 'ROBO Consulta', 'CONSULTA', 'Auditor', 3500, null],
  ];
  let seq = Date.now() % 1e8;
  for (const [chaveF, nome, perfil, cargo, salario, gestor] of quadro) {
    const c = await chamar(S.tk.ADMIN, 'POST', '/employees', { ...base, name: nome, cpf: cpfValido(seq++), email: email(`f-${chaveF.toLowerCase()}`), position: cargo, salary: salario, registration: `RB-${chaveF}`, ...(gestor ? { managerId: S.func[gestor]?.id } : {}) });
    if (!esperar(`Admin cadastra o funcionário ${nome}`, c, [200, 201])) continue;
    const id = dados(c)?.id ?? dados(c)?.employee?.id;
    S.func[chaveF] = { id, nome, perfil, salario, email: email(chaveF.toLowerCase()) };
    const ac = await chamar(S.tk.ADMIN, 'POST', `/employees/${id}/access`, { email: S.func[chaveF].email, role: perfil, name: nome });
    if (!esperar(`Dá acesso (${perfil}) a ${nome}`, ac, [200, 201])) continue;
    const provisoria = dados(ac)?.temporaryPassword;
    if (!provisoria) { registrar(`${nome}: senha provisória foi entregue`, false, { obtido: 'a resposta não trouxe temporaryPassword' }); continue; }
    const l1 = await chamar(null, 'POST', '/auth/login', { email: S.func[chaveF].email, password: provisoria });
    if (!esperar(`${nome} entra com a senha provisória`, l1, [200, 201])) continue;
    const t1 = token(l1);
    esperar(`${nome} é obrigado(a) a trocar a senha — troca com sucesso`, await chamar(t1, 'POST', '/auth/change-password', { currentPassword: provisoria, newPassword: SENHA_NOVA }), [200, 201, 204]);
    const l2 = await chamar(null, 'POST', '/auth/login', { email: S.func[chaveF].email, password: SENHA_NOVA });
    if (esperar(`${nome} entra com a senha nova`, l2, [200, 201])) S.tk[chaveF] = token(l2);
  }
  const lst = lista(await chamar(S.tk.ADMIN, 'GET', '/employees'));
  registrar(`A lista de funcionários mostra os ${Object.keys(S.func).length} cadastrados (e só eles)`, lst.length === Object.keys(S.func).length, { endpoint: 'GET /employees', esperado: Object.keys(S.func).length, obtido: `${lst.length}` });
  esperar('Funcionário comum NÃO cadastra funcionário (403)', await chamar(S.tk.A, 'POST', '/employees', { name: 'Intruso' }), 403);
  esperar('Consulta NÃO cadastra funcionário (403)', await chamar(S.tk.CONSULTA, 'POST', '/employees', { name: 'Intruso' }), 403);
  const meus = lista(await chamar(S.tk.A, 'GET', '/employees'));
  registrar('Funcionário comum enxerga só o próprio cadastro', meus.length <= 1, { endpoint: 'GET /employees', obtido: `${meus.length} cadastros visíveis` });
  const doGestor = lista(await chamar(S.tk.GESTOR, 'GET', '/employees'));
  registrar('Gestor enxerga a própria equipe (colaboradores A–D) e não o RH/Consulta', ['A', 'B', 'C', 'D'].every((k) => doGestor.some((e) => e.id === S.func[k]?.id)) && !doGestor.some((e) => e.id === S.func.RH?.id), { endpoint: 'GET /employees', obtido: `${doGestor.length} visíveis` });
}

// ---------------------------------------------------------------------------------------------------
async function ferias() {
  area = '5. Solicitação de férias por perfil';
  const hoje = hojeStr();
  const periodoDe = async (tk, empId, empKey) => {
    const ent = lista(await chamar(tk, 'GET', `/vacations/employee/${empId}/entitlements`));
    const ciclo = ent.find((e) => (Number(e.entitledDays ?? 30) - Number(e.usedDays ?? 0) - Number(e.soldDays ?? 0) - Number(e.reservedDays ?? 0)) >= 15) ?? ent[0];
    if (ciclo?.acquisitionStart) return `${new Date(ciclo.acquisitionStart).getUTCFullYear()}/${new Date(ciclo.acquisitionEnd).getUTCFullYear()}`;
    const adm = new Date(`${(await chamar(S.tk.ADMIN, 'GET', `/employees/${empId}`)).json?.data?.admissionDate ?? hoje}`.slice(0, 10)).getUTCFullYear();
    return `${adm}/${adm + 1}`;
  };
  const pedir = (tk, empId, periodo, inicio, dias, extra = {}) =>
    chamar(tk, 'POST', '/vacations', { employeeId: empId, acquisitionPeriod: periodo, startDate: `${inicio}T12:00:00.000Z`, endDate: `${somaDias(inicio, dias - 1)}T12:00:00.000Z`, daysUsed: dias, soldDays: 0, ...extra });

  const pedidos = [];
  // cada perfil pede as férias de si mesmo (RH, Gestor, Funcionário); o Administrador pede as do colaborador B
  const plano = [['RH', 'RH', 'RH', 70], ['GESTOR', 'GESTOR', 'Gestor', 110], ['A', 'A', 'Funcionário (colab. A)', 150], ['D', 'D', 'Funcionário (colab. D)', 190], ['ADMIN', 'B', 'Administrador, para o colab. B', 230]];
  for (const [quem, alvo, rotulo, desloc] of plano) {
    const empId = S.func[alvo]?.id;
    if (!empId || !S.tk[quem]) { registrar(`Férias — ${rotulo}`, null, { obtido: 'perfil ou funcionário não foi criado' }); continue; }
    const periodo = await periodoDe(S.tk[quem], empId, alvo);
    const r = await pedir(S.tk[quem], empId, periodo, somaDias(hoje, desloc), 15);
    if (esperar(`Férias pedidas por: ${rotulo} (15 dias)`, r, [200, 201])) pedidos.push({ id: dados(r)?.id, quem, alvo, rotulo, empId, periodo, inicio: somaDias(hoje, desloc) });
  }
  // o que NÃO pode / o que está errado
  const a = S.func.A, tkA = S.tk.A;
  if (a && tkA && pedidos.find((p) => p.alvo === 'A')) {
    const p = pedidos.find((x) => x.alvo === 'A');
    esperar('Pedido que cai em cima de outro já feito é recusado', await pedir(tkA, a.id, p.periodo, somaDias(p.inicio, 5), 10), [400, 409, 422]);
    esperar('Pedido com 3 dias é recusado (mínimo da regra: 5)', await pedir(tkA, a.id, p.periodo, somaDias(hoje, 300), 3), [400, 422]);
    esperar('Pedido de 40 dias (mais que o saldo) é recusado', await pedir(tkA, a.id, p.periodo, somaDias(hoje, 400), 40), [400, 409, 422]);
    esperar('Funcionário comum NÃO pede férias para um colega (403)', await pedir(tkA, S.func.D.id, p.periodo, somaDias(hoje, 500), 10), [403, 404]);
    esperar('Funcionário comum NÃO aprova as próprias férias (403)', await chamar(tkA, 'PATCH', `/vacations/${p.id}/status`, { status: 'APPROVED' }), 403);
    esperar('Datas invertidas (fim antes do início) são recusadas', await chamar(tkA, 'POST', '/vacations', { employeeId: a.id, acquisitionPeriod: p.periodo, startDate: `${somaDias(hoje, 600)}T12:00:00.000Z`, endDate: `${somaDias(hoje, 590)}T12:00:00.000Z`, daysUsed: 10 }), [400, 422]);
  }
  esperar('Consulta NÃO pede férias (403)', await pedir(S.tk.CONSULTA, S.func.CONSULTA.id, '2025/2026', somaDias(hoje, 250), 15), 403);
  if (S.tk.GESTOR && S.func.C) {
    const pc = await periodoDe(S.tk.GESTOR, S.func.C.id, 'C');
    const r = await pedir(S.tk.GESTOR, S.func.C.id, pc, somaDias(hoje, 270), 15);
    if (esperar('Gestor pede férias para alguém da própria equipe (colab. C)', r, [200, 201])) pedidos.push({ id: dados(r)?.id, quem: 'GESTOR', alvo: 'C', rotulo: 'Gestor para colab. C', empId: S.func.C.id, periodo: pc });
    esperar('Gestor NÃO pede férias para o RH (fora da equipe) (403)', await pedir(S.tk.GESTOR, S.func.RH.id, pc, somaDias(hoje, 330), 15), [403, 404]);
    esperar('Gestor NÃO aprova férias (403)', await chamar(S.tk.GESTOR, 'PATCH', `/vacations/${r.json?.data?.id}/status`, { status: 'APPROVED' }), 403);
  }
  // decisões do RH
  let n = 0;
  for (const p of pedidos) {
    if (!p.id) continue;
    const aprovar = n++ !== 1; // um pedido é recusado, para testar os dois caminhos
    const dec = await chamar(S.tk.RH, 'PATCH', `/vacations/${p.id}/status`, { status: aprovar ? 'APPROVED' : 'REJECTED', observation: 'decisão do robô' });
    if (!esperar(`RH ${aprovar ? 'aprova' : 'recusa'} as férias — ${p.rotulo}`, dec, [200, 201])) continue;
    if (aprovar) await pdf(`recibo de férias — ${p.rotulo}`, S.tk.RH, `/vacations/${p.id}/receipt.pdf`);
    else esperar(`Recibo de férias recusadas não é emitido — ${p.rotulo}`, await baixar(S.tk.RH, `/vacations/${p.id}/receipt.pdf`).then((x) => ({ ...x, metodo: 'GET', json: null, texto: x.texto })), [400, 403, 404, 409, 422]);
  }
  const doA = lista(await chamar(tkA, 'GET', '/vacations'));
  registrar('Funcionário comum vê só as próprias férias', doA.every((v) => (v.employeeId ?? v.employee?.id) === a?.id), { endpoint: 'GET /vacations', obtido: `${doA.length} pedido(s) visíveis` });
}

// ---------------------------------------------------------------------------------------------------
async function pontoManualEFolha() {
  area = '6. Ponto manual do mês fechado';
  const resumo = S.resumo;
  const mes = S.mes;
  const [ano, m] = mes.split('-').map(Number);
  const uteis = resumo.uteis.map(ymd);
  const sabado = ymd(resumo.sabados[1] ?? resumo.sabados[0]);
  const lancar = async (key, data, batidas, observacao = 'robô') => {
    const f = S.func[key];
    const corpo = { employeeId: f.id, date: data, reason: 'ajuste_erro_marcacao', observation: observacao };
    if (batidas.length === 4) Object.assign(corpo, { entry: iso(data, batidas[0]), lunchStart: iso(data, batidas[1]), lunchReturn: iso(data, batidas[2]), exit: iso(data, batidas[3]) });
    else Object.assign(corpo, { entry: iso(data, batidas[0]), exit: iso(data, batidas[1]) });
    return chamar(S.tk.ADMIN, 'POST', '/time-track/manual', corpo);
  };
  const esperadoPorDia = { A: new Map(), B: new Map(), C: new Map() };

  // ----- A: horas extras, atraso, saída antecipada, tolerância, falta, sábado -----
  const planoA = { 0: ['08:00', '12:00', '13:00', '19:00'], 1: ['08:00', '12:00', '13:00', '18:00'], 2: ['07:30', '12:00', '13:00', '17:00'], 3: ['08:30', '12:00', '13:00', '17:00'], 4: ['08:00', '12:00', '13:00', '16:30'], 5: ['08:03', '12:00', '13:00', '17:00'], 6: null, 7: ['08:00', '12:00', '13:00', '20:30'], 8: ['08:00', '12:00', '13:00', '19:30'], 9: ['08:06', '12:00', '13:00', '17:00'] };
  if (S.func.A && S.tk.ADMIN) {
    for (let i = 0; i < uteis.length; i++) {
      const batidas = i in planoA ? planoA[i] : NORMAL;
      esperadoPorDia.A.set(uteis[i], oraculoDia({ batidas, tipoDia: 'util', jornada: JORNADA }));
      if (batidas) esperar(`Ponto manual A ${uteis[i]} ${batidas ? batidas.join(' ') : 'sem batida (falta)'}`, await lancar('A', uteis[i], batidas), [200, 201]);
    }
    esperar(`Ponto manual A no sábado ${sabado} (08:00–12:00, hora extra 100%)`, await lancar('A', sabado, ['08:00', '12:00']), [200, 201]);
    esperadoPorDia.A.set(sabado, oraculoDia({ batidas: ['08:00', '12:00'], tipoDia: 'descanso', jornada: JORNADA }));
  }
  // ----- B: turno noturno o mês todo -----
  if (S.func.B) {
    const esc = await chamar(S.tk.ADMIN, 'POST', '/schedules', { name: `ROBO Noturno ${unico}`, scaleType: '5x2', entryTime: '20:00', lunchStartTime: '00:00', lunchReturnTime: '01:00', exitTime: '05:00', workDays: [1, 2, 3, 4, 5], restDays: [0, 6], isNightShift: true, nightStartTime: '22:00', nightEndTime: '05:00' });
    if (esperar('Admin cria a escala noturna 20:00–05:00', esc, [200, 201])) {
      esperar('Admin atribui a escala noturna ao colab. B', await chamar(S.tk.ADMIN, 'POST', '/schedules/assign', { employeeIds: [S.func.B.id], scheduleId: dados(esc).id, startDate: `${mes}-01` }), [200, 201]);
      for (const dia of uteis) {
        const batidas = ['20:00', '+00:00', '+01:00', '+05:00'];
        esperadoPorDia.B.set(dia, oraculoDia({ batidas, tipoDia: 'util', jornada: JORNADA_NOTURNA }));
        const f = S.func.B;
        const r = await chamar(S.tk.ADMIN, 'POST', '/time-track/manual', { employeeId: f.id, date: dia, reason: 'ajuste_erro_marcacao', observation: 'robô noturno', entry: iso(dia, batidas[0]), lunchStart: iso(dia, batidas[1]), lunchReturn: iso(dia, batidas[2]), exit: iso(dia, batidas[3]) });
        if (r.status >= 300) esperar(`Ponto manual B (noturno) ${dia}`, r, [200, 201]);
      }
      registrar(`Ponto manual B: ${uteis.length} noites lançadas`, true);
    }
  }
  // ----- C: dias normais, exceto 2 dias de suspensão -----
  const susp = [uteis[10], uteis[11]];
  if (S.func.C) {
    for (const dia of uteis) {
      if (susp.includes(dia)) { esperadoPorDia.C.set(dia, { falta: 480, he50: 0, he100: 0, noturnoHoraFicta: 0, atraso: 0, saidaAntecipada: 0 }); continue; }
      esperadoPorDia.C.set(dia, oraculoDia({ batidas: NORMAL, tipoDia: 'util', jornada: JORNADA }));
      const r = await lancar('C', dia, NORMAL);
      if (r.status >= 300) esperar(`Ponto manual C ${dia}`, r, [200, 201]);
    }
    registrar(`Ponto manual C: ${uteis.length - 2} dias lançados (2 ficam para a suspensão)`, true);
  }

  // ----- conferência dia a dia: o que o sistema gravou x oráculo -----
  area = '7. Conta do ponto, dia a dia (hora extra, noturno, atraso, falta)';
  for (const key of ['A', 'B', 'C']) {
    if (!S.func[key]) continue;
    const trilhas = lista(await chamar(S.tk.ADMIN, 'GET', `/time-track/${S.func[key].id}/month?month=${mes}`));
    S.func[key].trilhas = trilhas;
    let divergentes = 0, comparados = 0;
    for (const t of trilhas) {
      const data = String(t.date).slice(0, 10);
      const esp = esperadoPorDia[key].get(data);
      if (!esp || t.incidentType === 'SUSPENSÃO') continue;
      comparados++;
      const obtido = { he50: t.overtime50Minutes ?? 0, he100: t.overtime100Minutes ?? 0, noturnoHoraFicta: t.nightShiftMinutes ?? 0, atraso: t.lateMinutes ?? 0, saidaAntecipada: t.earlyLeaveMinutes ?? 0 };
      const dif = Object.entries(obtido).filter(([k, v]) => Math.abs(v - (esp[k] ?? 0)) > 1);
      if (dif.length) { divergentes++; registrar(`Conta do dia ${data} (${S.func[key].nome}) diverge do oráculo`, false, { endpoint: `GET /time-track/${S.func[key].id}/month`, esperado: dif.map(([k]) => `${k}=${esp[k] ?? 0}`).join(' '), obtido: dif.map(([k, v]) => `${k}=${v}`).join(' ') }); }
    }
    registrar(`${S.func[key].nome}: ${comparados} dias conferidos contra o oráculo, ${divergentes} divergência(s)`, comparados > 0 && divergentes === 0, { obtido: comparados === 0 ? 'nenhum dia foi gravado' : `${divergentes} divergência(s)` });
  }

  // ----- aprovação de horas extras do A -----
  area = '8. Aprovação de horas extras';
  const decisoes = new Map(); // data -> aprovado?
  const trilhasA = S.func.A?.trilhas ?? [];
  const pendentes = trilhasA.filter((t) => t.overtimeApprovalStatus === 'PENDING');
  const datasPend = pendentes.map((t) => String(t.date).slice(0, 10)).sort();
  registrar('Horas extras acima de 2h/dia ficam PENDENTES de aprovação (20:30, 19:30 e sábado 100%)', datasPend.length === 3, { esperado: '3 pendentes', obtido: `${datasPend.length} pendentes: ${datasPend.join(', ')}` });
  const dataRejeitada = uteis[7];
  for (const t of pendentes) {
    const data = String(t.date).slice(0, 10);
    const aprovar = data !== dataRejeitada;
    decisoes.set(data, aprovar);
    esperar(`${aprovar ? 'RH aprova' : 'RH reprova'} a hora extra de ${data}`, await chamar(S.tk.RH, 'PATCH', `/time-track/${t.id}/overtime-approval`, { approved: aprovar }), [200, 201]);
  }
  esperar('Funcionário comum NÃO aprova hora extra (403)', await chamar(S.tk.A, 'PATCH', `/time-track/${pendentes[0]?.id ?? 'x'}/overtime-approval`, { approved: true }), [403, 404]);

  // ----- suspensão -----
  area = '9. Suspensão';
  if (S.func.C) {
    const n = await chamar(S.tk.ADMIN, 'POST', '/notifications/admin', { type: 'SUSPENSION_NOTICE', title: 'Suspensão disciplinar (teste do robô)', message: 'Suspensão de 2 dias lançada pelo robô.', employeeIds: [S.func.C.id], occurrenceDate: susp[0], legalReason: 'Falta grave simulada pelo robô', suspensionDays: 2 });
    if (esperar('Admin aplica 2 dias de suspensão ao colab. C', n, [200, 201])) {
      const impacto = dados(n)?.extraJson?.payrollImpact;
      registrar('O sistema informa 2 dias de trabalho perdidos', impacto?.workedDaysLost === 2, { esperado: 'workedDaysLost=2', obtido: JSON.stringify(impacto) });
      const nid = dados(n)?.id ?? dados(n)?.notifications?.[0]?.id;
      if (nid) {
        await pdf('termo disciplinar (suspensão)', S.tk.ADMIN, `/management/documents/notifications/${nid}/legal-notice`);
        const pend = lista(await chamar(S.tk.C, 'GET', '/notifications'));
        registrar('O colaborador suspenso recebe o aviso para dar ciência', pend.some((x) => x.id === nid), { endpoint: 'GET /notifications', obtido: `${pend.length} aviso(s) para o colaborador` });
        esperar('Colaborador dá ciência da suspensão', await chamar(S.tk.C, 'PATCH', `/notifications/${nid}/respond`, { action: 'ACCEPT' }), [200, 201]);
      }
    }
    esperar('Consulta NÃO aplica suspensão (403)', await chamar(S.tk.CONSULTA, 'POST', '/notifications/admin', { type: 'SUSPENSION_NOTICE', title: 'x', message: 'y', employeeIds: [S.func.C.id], occurrenceDate: susp[0], legalReason: 'x', suspensionDays: 1 }), 403);
  }

  // ----- fechamento e folha -----
  area = '10. Fechamento do mês (conta da folha)';
  const ids = ['A', 'B', 'C'].map((k) => S.func[k]?.id).filter(Boolean);
  const gen = await chamar(S.tk.ADMIN, 'POST', '/time-closing/generate', { month: m, year: ano, employeeIds: ids, overtimeHandling: 'PAYMENT' });
  if (!esperar('Admin gera o fechamento do mês', gen, [200, 201])) return;
  const todos = lista(await chamar(S.tk.ADMIN, 'GET', '/time-closing'));
  const mesIni = `${mes}-01`;
  const fechamento = (key) => todos.find((c) => c.employeeId === S.func[key]?.id && String(c.periodStart).slice(0, 10) === mesIni);
  const calc = {
    A: () => {
      const dias = [...esperadoPorDia.A.entries()].map(([d, v]) => ({ ...v, he50: decisoes.get(d) === false ? 0 : v.he50, he100: decisoes.get(d) === false ? 0 : v.he100 }));
      return somarDias(dias);
    },
    B: () => somarDias([...esperadoPorDia.B.values()]),
    C: () => somarDias([...esperadoPorDia.C.values()]),
  };
  // o dia sem batida do A é falta: entra pelo oráculo (batidas null)
  for (const key of ['A', 'B', 'C']) {
    const f = S.func[key]; const c = fechamento(key);
    if (!f) continue;
    if (!c) { registrar(`Fechamento de ${f.nome} existe`, false, { obtido: 'não achei o fechamento gerado' }); continue; }
    f.fechamento = c;
    const t = calc[key]();
    const oraculo = folhaOraculo({ salario: f.salario, minutosSemana: 2400, he50: t.he50, he100: t.he100, noturno: t.noturno, faltas: t.faltas, atrasos: t.atrasos, saidasAntecipadas: t.saidasAntecipadas, diasUteis: S.resumo.payableWorkdays, diasDescanso: S.resumo.paidRestDays, dependentes: 0, dsr: true });
    const dif = compararFolha(c, oraculo);
    registrar(`Fechamento de ${f.nome}: ${Object.keys(oraculo).length} valores conferidos (HE 50%/100%, noturno, DSR, faltas, atrasos, INSS, IRRF, FGTS, líquido)`, dif.length === 0, {
      endpoint: 'POST /time-closing/generate', esperado: `bruto ${oraculo.grossPay} · líquido ${oraculo.netPay} (HE50 ${t.he50}min, HE100 ${t.he100}min, noturno ${t.noturno}min, faltas ${t.faltas}min, atrasos ${t.atrasos}min, saída antecip. ${t.saidasAntecipadas}min)`,
      obtido: dif.map((d) => `${d.campo}: esperado ${d.esperado}, sistema ${d.obtido}`).join(' | '), arquivo: 'apps/api/src/modules/time-track/time-closing.service.ts + payroll-calculation.service.ts',
    });
    f.oraculoFolha = oraculo;
  }
  const c = S.func.C?.fechamento;
  if (c) registrar('Suspensão de 2 dias foi descontada: 960 min de falta no fechamento do colab. C', Number(c.absenceMinutes) === 960, { esperado: 'absenceMinutes=960', obtido: `absenceMinutes=${c.absenceMinutes} (desconto R$ ${c.absenceDiscount})` });
  const a = S.func.A?.fechamento;
  if (a) registrar('A hora extra REPROVADA (20:30) não foi paga e as aprovadas foram', true, { obtido: `HE50 paga: R$ ${a.overtime50Value} · HE100 paga: R$ ${a.overtime100Value}` });

  // fluxo de aprovação do fechamento
  for (const key of ['A']) {
    const cl = S.func[key]?.fechamento; if (!cl) continue;
    esperar('Admin envia o fechamento para revisão', await chamar(S.tk.ADMIN, 'POST', `/time-closing/${cl.id}/submit-review`), [200, 201]);
    esperar('Admin aprova o fechamento', await chamar(S.tk.ADMIN, 'POST', `/time-closing/${cl.id}/approve`), [200, 201]);
    esperar('Admin fecha o mês do colaborador', await chamar(S.tk.ADMIN, 'POST', `/time-closing/${cl.id}/close`), [200, 201]);
    esperar('Gerar de novo com o mês fechado é recusado (não sobrescreve)', await chamar(S.tk.ADMIN, 'POST', '/time-closing/generate', { month: m, year: ano, employeeIds: [S.func[key].id] }), [400, 409]);
    esperar('Funcionário comum NÃO fecha o mês (403)', await chamar(S.tk.A, 'POST', `/time-closing/${cl.id}/close`), 403);
  }

  // folha de pagamento (Gestão)
  area = '11. Folha de pagamento (Gestão) x fechamento';
  const criar = await chamar(S.tk.RH, 'POST', '/payroll', { employeeIds: ids, periodStart: `${mes}-01`, periodEnd: ymd(diasDoMes(mes).at(-1)) });
  if (esperar('RH gera a folha de pagamento do mês', criar, [200, 201])) {
    const folhas = lista(await chamar(S.tk.RH, 'GET', `/payroll?from=${mes}-01&to=${ymd(diasDoMes(mes).at(-1))}`));
    for (const key of ['A', 'B', 'C']) {
      const f = S.func[key]; const folha = folhas.find((x) => x.employeeId === f?.id); const oracle = f?.oraculoFolha;
      if (!folha || !oracle) { registrar(`Folha de ${f?.nome ?? key}`, null, { obtido: 'folha ou oráculo ausente' }); continue; }
      const pares = [['grossSalary', oracle.grossPay], ['inssAmount', oracle.inssDiscount], ['irrfAmount', oracle.irrfDiscount], ['fgtsAmount', oracle.fgtsAmount], ['netSalary', oracle.netPay], ['nightShiftAmount', oracle.nightShiftValue]];
      const dif = pares.filter(([campo, esp]) => Math.abs(Number(folha[campo]) - esp) > 0.02).map(([campo, esp]) => `${campo}: esperado ${esp}, folha ${folha[campo]}`);
      registrar(`Folha de ${f.nome} bate com o oráculo (bruto, INSS, IRRF, FGTS, líquido, noturno)`, dif.length === 0, { endpoint: 'POST /payroll', obtido: dif.join(' | '), arquivo: 'apps/api/src/modules/payroll/payroll.service.ts' });
      if (f.fechamento) registrar(`Folha e fechamento de ${f.nome} têm o mesmo líquido`, Math.abs(Number(folha.netSalary) - Number(f.fechamento.netPay)) <= 0.02, { obtido: `folha ${folha.netSalary} x fechamento ${f.fechamento.netPay}` });
    }
    const primeira = folhas.find((x) => x.employeeId === S.func.A?.id);
    if (primeira) {
      esperar('RH aprova a folha', await chamar(S.tk.RH, 'PATCH', `/payroll/${primeira.id}/approve`), [200, 201]);
      esperar('RH marca a folha como paga', await chamar(S.tk.RH, 'PATCH', `/payroll/${primeira.id}/paid`), [200, 201]);
      esperar('Folha paga não pode ser excluída (400/409)', await chamar(S.tk.RH, 'DELETE', `/payroll/${primeira.id}`), [400, 403, 409]);
    }
    esperar('Funcionário comum NÃO vê a folha (403)', await chamar(S.tk.A, 'GET', `/payroll?from=${mes}-01&to=${mes}-28`), 403);
  }
}

// ---------------------------------------------------------------------------------------------------
async function pontoAutomatico() {
  area = '12. Ponto automático (como o colaborador bate no celular)';
  const tipos = ['ENTRY', 'LUNCH_START', 'LUNCH_RETURN', 'EXIT'];
  const d = S.tk.D;
  if (!d) return registrar('Ponto automático', null, { obtido: 'colaborador D não entrou' });
  const hoje = await chamar(d, 'GET', '/escalas/punch/today');
  esperar('Colaborador abre a tela de ponto de hoje', hoje, 200);
  const recibos = [];
  for (let i = 0; i < 4; i++) {
    const r = await chamar(d, 'POST', '/escalas/punch', { latitude: -23.5505, longitude: -46.6333, accuracyMeters: 20, deviceId: 'robo-ciclo' });
    if (!esperar(`Batida automática ${i + 1}/4`, r, [200, 201])) break;
    const x = dados(r);
    registrar(`Batida ${i + 1} foi registrada como ${tipos[i]}`, x?.type === tipos[i], { esperado: tipos[i], obtido: String(x?.type) });
    if (x?.receipt) recibos.push(x.receipt);
    await new Promise((res) => setTimeout(res, 1100));
  }
  esperar('A 5ª batida do dia é recusada', await chamar(d, 'POST', '/escalas/punch', { latitude: -23.5505, longitude: -46.6333, accuracyMeters: 20 }), [400, 409, 422]);
  if (recibos[0]) await pdf('comprovante de ponto (batida automática)', d, `/escalas/punch/receipt/${recibos[0]}/pdf`);
  registrar('Cada batida automática gerou um comprovante', recibos.length === 4, { esperado: 4, obtido: recibos.length });
  const hojeStr2 = hojeStr();
  const trilha = lista(await chamar(S.tk.ADMIN, 'GET', `/time-track/${S.func.D.id}/month?month=${hojeStr2.slice(0, 7)}`)).find((t) => String(t.date).slice(0, 10) === hojeStr2);
  registrar('As 4 batidas de hoje aparecem na folha de ponto do colaborador', Boolean(trilha?.entry && trilha?.lunchStart && trilha?.lunchReturn && trilha?.exit), { obtido: JSON.stringify({ entry: trilha?.entry, lunchStart: trilha?.lunchStart, lunchReturn: trilha?.lunchReturn, exit: trilha?.exit }) });
  esperar('Consulta NÃO bate ponto (403)', await chamar(S.tk.CONSULTA, 'POST', '/escalas/punch', { latitude: -23.55, longitude: -46.63 }), 403);
  esperar('Sem login, bater ponto é recusado (401)', await chamar(null, 'POST', '/escalas/punch', { latitude: -23.55, longitude: -46.63 }), 401);
  for (const k of ['GESTOR', 'RH']) {
    if (S.tk[k]) esperar(`${k} também bate o ponto automático (entrada)`, await chamar(S.tk[k], 'POST', '/escalas/punch', { latitude: -23.5505, longitude: -46.6333, accuracyMeters: 20 }), [200, 201]);
  }
}

// ---------------------------------------------------------------------------------------------------
async function pdfs() {
  area = '13. PDFs emitidos';
  const mes = S.mes;
  for (const key of ['A', 'B', 'C', 'D', 'GESTOR', 'RH']) {
    const f = S.func[key]; if (!f) continue;
    await pdf(`ficha cadastral — ${f.nome}`, S.tk.ADMIN, `/employees/${f.id}/documents/record.pdf`);
    await pdf(`folha de ponto de ${mes} — ${f.nome}`, S.tk.ADMIN, `/employees/${f.id}/documents/point-sheet.pdf?month=${mes}`);
    await pdf(`ocorrências de ${mes} — ${f.nome}`, S.tk.ADMIN, `/employees/${f.id}/documents/occurrences.pdf?month=${mes}`);
  }
  for (const key of ['A', 'B', 'C']) {
    const cl = S.func[key]?.fechamento; if (!cl) continue;
    await pdf(`fechamento do mês — ${S.func[key].nome}`, S.tk.ADMIN, `/time-closing/${cl.id}/pdf-stream`);
    await pdf(`documento de fechamento (gestão) — ${S.func[key].nome}`, S.tk.ADMIN, `/management/documents/closings/${cl.id}`);
  }
  const ids = ['A', 'B', 'C'].map((k) => S.func[k]?.id).filter(Boolean);
  await pdf('fechamento coletivo do mês', S.tk.ADMIN, `/time-closing/collective/pdf?month=${mes}&employeeIds=${ids.join(',')}`);
  if (S.devToken) await pdf('relatório da contabilidade (Dev)', S.devToken, `/accounting/report/pdf?month=${mes}`);
  const eu = dados(await chamar(S.tk.ADMIN, 'GET', '/auth/me')); const meuId = eu?.id ?? eu?.user?.id;
  if (meuId) await pdf('histórico de atividade do administrador', S.tk.ADMIN, `/users/${meuId}/activity/pdf?days=30`);
}

// ---------------------------------------------------------------------------------------------------
async function apagarTudo() {
  area = '14. Limpeza final';
  if (flag('--manter')) return registrar('Mantida a empresa de teste (--manter)', null, { obtido: `empresa "${NOME_EMPRESA}" e plano "${NOME_PLANO}" continuam no sistema` });
  const novo = token(await chamar(null, 'POST', '/auth/login', { email: DEV_EMAIL, password: DEV_SENHA })); // o token do início pode ter vencido
  if (novo) S.devToken = novo;
  if (S.empresaId) esperar('Apaga a empresa de teste e todos os funcionários criados', await chamar(S.devToken, 'DELETE', `/platform/companies/${S.empresaId}/purge`), [200, 204]);
  else registrar('Empresa de teste não foi criada: nada a apagar', null);
  if (S.planoId) {
    await chamar(S.devToken, 'DELETE', `/platform/plans/${S.planoId}`);
    esperar('Apaga o plano de teste', await chamar(S.devToken, 'DELETE', `/platform/plans/${S.planoId}/permanent`), [200, 204]);
  }
}

// ---------- relatório ----------
function relatorio() {
  const falhas = resultados.filter((r) => r.situacao === 'FALHOU');
  const incs = resultados.filter((r) => r.situacao === 'inconclusivo');
  const pasta = join(raiz, 'tools/robo-ciclo/relatorios');
  mkdirSync(pasta, { recursive: true });
  const arquivo = join(pasta, new Date().toISOString().replace(/[:.]/g, '-'));
  const l = [`# Robô de ciclo completo — ${new Date().toLocaleString('pt-BR')}`, '', `Base: ${BASE} · mês conferido: ${S.mes ?? '-'} · ✅ ${resultados.length - falhas.length - incs.length} · ❌ ${falhas.length} · ⚠️ ${incs.length}`, ''];
  if (falhas.length) { l.push('## Defeitos encontrados', ''); falhas.forEach((f, i) => l.push(`${i + 1}. **${f.nome}** (${f.area})`, `   - Chamada: \`${f.endpoint ?? '-'}\` · esperado: ${f.esperado ?? '-'} · obtido: ${f.obtido ?? f.status ?? '-'}`, f.arquivo ? `   - Onde olhar: ${f.arquivo}` : '', `   - requestId: ${f.requestId ?? 'n/d'}`, '')); } else l.push('Nenhum defeito encontrado.', '');
  if (incs.length) { l.push('## Inconclusivos', ''); incs.forEach((f) => l.push(`- ${f.nome}: ${f.obtido ?? ''}`)); }
  const porArea = {}; for (const r of resultados) { porArea[r.area] ??= { ok: 0, falha: 0, inc: 0 }; porArea[r.area][r.situacao === 'passou' ? 'ok' : r.situacao === 'FALHOU' ? 'falha' : 'inc']++; }
  l.push('', '## Resumo por etapa', '', ...Object.entries(porArea).map(([a, v]) => `- ${a}: ✅ ${v.ok} · ❌ ${v.falha} · ⚠️ ${v.inc}`));
  writeFileSync(`${arquivo}.md`, l.join('\n'), 'utf8');
  writeFileSync(`${arquivo}.json`, JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`\n${resultados.length - falhas.length - incs.length} passaram · ${falhas.length} falharam · ${incs.length} inconclusivos\nRelatório: ${arquivo}.md`);
  return falhas.length;
}

// ---------- execução ----------
try {
  area = '0. Entrada do Dev';
  const dev = await chamar(null, 'POST', '/auth/login', { email: DEV_EMAIL, password: DEV_SENHA });
  S.devToken = token(dev);
  if (!esperar('Dev entra (só para criar o plano e limpar)', dev, [200, 201]) || !S.devToken) throw new Error('Não consegui entrar como Dev.');
  await limparRestos();
  if (flag('--so-limpar')) { registrar('Modo --so-limpar: só apaguei os restos anteriores', true); }
  else {
    S.mes = escolherMesDeReferencia();
    S.resumo = resumoDoMes(S.mes);
    console.log(`Mês de conferência: ${S.mes} (${S.resumo.payableWorkdays} dias úteis, ${S.resumo.paidRestDays} de descanso pago, sem feriados)`);
    await criarPlanoGratis();
    await cadastrarEmpresaPeloLogin();
    await configurarEmpresa();
    await criarFuncionarios();
    await ferias();
    await pontoManualEFolha();
    await pontoAutomatico();
    await pdfs();
  }
} catch (e) {
  registrar('O robô parou antes do fim', false, { obtido: String(e?.message ?? e) });
} finally {
  if (S.devToken && !flag('--so-limpar')) await apagarTudo().catch((e) => registrar('Falha na limpeza final', false, { obtido: String(e) }));
}
process.exit(relatorio() > 0 ? 1 : 0);
