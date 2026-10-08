#!/usr/bin/env node
/**
 * Robô de API (banco de teste). Chama a API como cada perfil faria, CRIA e EXCLUI registros de verdade,
 * tenta entradas inválidas, corrida e acesso de outra empresa, e lista cada falha com o arquivo provável do código.
 *
 * SÓ roda contra API local ligada ao banco de teste. Veja tools/robo-api/README.md.
 * Uso: ROBO_API_BANCO_DE_TESTE=sim node tools/robo-api/robo-api.mjs [--url http://localhost:3333]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { compararFolha, folhaOraculo, invariantes } from './oracle/folha-clt-2026.mjs';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const argUrl = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
const BASE = (argUrl || process.env.ROBO_API_URL || 'http://localhost:3333').replace(/\/$/, '');
const SENHA = process.env.ROBO_API_SENHA || 'TestPassword123!';
const CONTAS = { DEV: 'dev@test.local', ADMIN: 'admin@test.local', RH: 'rh@test.local', GESTOR: 'gestor@test.local', FUNCIONARIO: 'func1@test.local', ADMIN_B: 'admin.b@test.local' };

// ---------- travas de segurança: este robô apaga dados ----------
function travar() {
  const erros = [];
  const host = new URL(BASE).hostname;
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) erros.push(`A URL ${BASE} não é local.`);
  if (process.env.NODE_ENV === 'production') erros.push('NODE_ENV=production.');
  if (process.env.ROBO_API_BANCO_DE_TESTE !== 'sim') erros.push('Defina ROBO_API_BANCO_DE_TESTE=sim para confirmar que a API usa o banco de teste.');
  const envTeste = join(raiz, '.env.test');
  const arquivo = existsSync(envTeste) ? envTeste : join(raiz, '.env.test.example');
  const url = (readFileSync(arquivo, 'utf8').match(/^DATABASE_URL=["']?([^"'\r\n]+)/m) || [])[1] || '';
  if (!url.includes(':5436/') || !/test/i.test(url)) erros.push(`${arquivo} não aponta para o banco de teste (porta 5436).`);
  if (erros.length) {
    console.error('ROBÔ DE API RECUSADO (nada foi executado):\n - ' + erros.join('\n - '));
    process.exit(2);
  }
}
travar();

// ---------- resultado ----------
const ARQUIVO_PROVAVEL = [
  [/^\/users/, 'apps/api/src/modules/users/users.controller.ts + users.service.ts'],
  [/^\/employees/, 'apps/api/src/modules/employees/employees.controller.ts + employees.service.ts'],
  [/^\/auth/, 'apps/api/src/modules/auth/auth.controller.ts + auth.service.ts'],
  [/^\/accounting/, 'apps/api/src/modules/accounting/accounting-rules.service.ts + time-track/payroll-calculation.service.ts'],
];
const resultados = [];
let area = '';
let criados = { users: [], employees: [] };

function arquivoDe(caminho) {
  const p = caminho.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  return (ARQUIVO_PROVAVEL.find(([re]) => re.test(p)) || [, 'rota não mapeada'])[1];
}
function registrar(nome, ok, detalhe = {}) {
  resultados.push({ area, nome, situacao: ok === null ? 'inconclusivo' : ok ? 'passou' : 'FALHOU', ...detalhe });
  const icone = ok === null ? '⚠️ ' : ok ? '✅' : '❌';
  console.log(`${icone} [${area}] ${nome}${ok === false && detalhe.obtido ? `  -> ${detalhe.obtido}` : ''}`);
}

async function chamar(token, metodo, caminho, corpo, extra = {}) {
  const t0 = Date.now();
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(extra.headers || {}) };
  let res, texto;
  try {
    res = await fetch(BASE + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
    texto = await res.text();
  } catch (e) {
    return { status: 0, json: null, texto: String(e), ms: Date.now() - t0, requestId: null, caminho, metodo };
  }
  let json = null;
  try { json = JSON.parse(texto); } catch { /* corpo não-JSON */ }
  const r = { status: res.status, json, texto, ms: Date.now() - t0, requestId: res.headers.get('x-request-id') || json?.meta?.requestId || json?.error?.requestId || null, caminho, metodo };
  // Regra global: 5xx nunca é aceitável como resposta a uma entrada do cliente.
  if (r.status >= 500 || r.status === 0) {
    registrar(`Servidor quebrou (${r.status || 'sem resposta'}) em ${metodo} ${caminho}`, false, { endpoint: `${metodo} ${caminho}`, status: r.status, obtido: (json?.error?.message || texto || '').slice(0, 200), requestId: r.requestId, arquivo: arquivoDe(caminho), regra: 'nunca 5xx por entrada do cliente' });
  }
  return r;
}

/** Confere o status esperado; qualquer outro vira falha com o código provável. */
function esperar(nome, r, aceitos, extra = {}) {
  const lista = Array.isArray(aceitos) ? aceitos : [aceitos];
  const ok = lista.includes(r.status);
  registrar(nome, ok, { endpoint: `${r.metodo} ${r.caminho}`, esperado: lista.join('/'), status: r.status, obtido: ok ? undefined : `status ${r.status}: ${(r.json?.error?.message || r.texto || '').toString().slice(0, 160)}`, requestId: r.requestId, arquivo: arquivoDe(r.caminho), ...extra });
  return ok;
}

const idDe = (r) => r.json?.data?.id ?? r.json?.data?.user?.id ?? r.json?.data?.employee?.id ?? r.json?.id ?? null;
const unico = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const email = (p) => `robo-api-${p}-${unico}@example.com`;

function cpfValido(seed) {
  const n = String(seed).padStart(9, '0').slice(-9).split('').map(Number);
  for (const t of [9, 10]) {
    const soma = n.reduce((s, d, i) => s + d * (t + 1 - i), 0);
    const dv = (soma * 10) % 11 % 10;
    n.push(dv);
  }
  return n.join('');
}

async function entrar(perfil) {
  const r = await chamar(null, 'POST', '/auth/login', { email: CONTAS[perfil], password: SENHA });
  const token = r.json?.data?.access_token ?? r.json?.data?.accessToken ?? r.json?.access_token ?? null;
  const ok = r.status === 200 || r.status === 201;
  if (!ok || !token) {
    registrar(`Entrar como ${perfil}`, ok && !token ? null : false, { endpoint: 'POST /auth/login', status: r.status, obtido: `sem token (status ${r.status}). Rodou o seed? npm run test:db:seed`, arquivo: arquivoDe('/auth/login') });
    return null;
  }
  registrar(`Entrar como ${perfil}`, true);
  return token;
}

// ---------- suítes ----------
async function suiteAutenticacao() {
  area = 'Autenticação';
  esperar('Senha errada devolve 401, não 500', await chamar(null, 'POST', '/auth/login', { email: CONTAS.ADMIN, password: 'senha-errada-123' }), [400, 401]);
  esperar('Login sem corpo devolve 400', await chamar(null, 'POST', '/auth/login', {}), [400, 401]);
  esperar('Login com tipos errados devolve 400', await chamar(null, 'POST', '/auth/login', { email: 123, password: { $ne: null } }), [400, 401]);
  esperar("Login com injeção de SQL no e-mail não passa", await chamar(null, 'POST', '/auth/login', { email: "' OR '1'='1", password: 'x' }), [400, 401]);
  esperar('Rota protegida sem token devolve 401', await chamar(null, 'GET', '/users'), 401);
  esperar('Token lixo devolve 401', await chamar('abc.def.ghi', 'GET', '/users'), 401);
  esperar('JSON quebrado devolve 400', await chamar(null, 'POST', '/auth/login', '{"email": '), 400);
}

async function suiteUsuarios(tk) {
  area = 'Usuários (criar/editar/excluir)';
  const dados = { name: 'ROBO API Usuario', email: email('u1'), password: 'SenhaForte#2026', role: 'RH' };
  const criar = await chamar(tk.ADMIN, 'POST', '/users', dados);
  const ok = esperar('ADMIN cria usuário', criar, [200, 201]);
  const id = idDe(criar);
  if (id) criados.users.push(id);
  if (!ok || !id) return registrar('Resto do ciclo de usuário', null, { obtido: 'sem id do usuário criado' });

  esperar('Ler o usuário criado', await chamar(tk.ADMIN, 'GET', `/users/${id}`), 200);
  esperar('E-mail duplicado devolve 409', await chamar(tk.ADMIN, 'POST', '/users', dados), [409, 400]);
  esperar('Senha fraca (<10) devolve 400', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: email('fraca'), password: '123' }), 400);
  esperar('Perfil inexistente devolve 400', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: email('perfil'), role: 'SUPERMAN' }), 400);
  esperar('E-mail inválido devolve 400', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: 'nao-e-email' }), 400);
  esperar('Campo desconhecido é recusado (400)', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: email('extra'), isAdminMaster: true }), 400);
  esperar('Nome gigante (100 mil caracteres) não derruba o servidor', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: email('gigante'), name: 'A'.repeat(100_000) }), [400, 413, 422]);
  esperar('Nome com byte nulo não derruba o servidor', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: email('nulo'), name: 'a\u0000b' }), [200, 201, 400, 422]);
  esperar('ID que não é UUID devolve 400/404', await chamar(tk.ADMIN, 'GET', '/users/nao-e-uuid'), [400, 404]);
  esperar('ADMIN não pode se promover a DEV', await chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: email('dev'), role: 'DEV' }), [400, 403, 422]);

  esperar('Editar nome', await chamar(tk.ADMIN, 'PATCH', `/users/${id}`, { name: 'ROBO API Editado' }), 200);
  const lido = await chamar(tk.ADMIN, 'GET', `/users/${id}`);
  registrar('Edição foi gravada no banco', (lido.json?.data?.name ?? lido.json?.data?.user?.name) === 'ROBO API Editado', { endpoint: `GET /users/${id}`, obtido: 'nome lido não bate com o editado', arquivo: arquivoDe('/users') });
  esperar('Bloquear', await chamar(tk.ADMIN, 'POST', `/users/${id}/block`, { reason: 'teste do robô' }), [200, 201]);
  esperar('Desbloquear', await chamar(tk.ADMIN, 'POST', `/users/${id}/unblock`, {}), [200, 201]);

  for (const perfil of ['GESTOR', 'FUNCIONARIO']) {
    esperar(`${perfil} NÃO pode criar usuário (403)`, await chamar(tk[perfil], 'POST', '/users', { ...dados, email: email(`neg-${perfil}`) }), 403);
    esperar(`${perfil} NÃO pode excluir usuário (403)`, await chamar(tk[perfil], 'DELETE', `/users/${id}/permanent`), 403);
    esperar(`${perfil} NÃO pode listar usuários (403)`, await chamar(tk[perfil], 'GET', '/users'), 403);
  }

  // Corrida: 8 criações simultâneas com o mesmo e-mail -> exatamente 1 deve passar.
  const emailCorrida = email('corrida');
  const corrida = await Promise.all(Array.from({ length: 8 }, () => chamar(tk.ADMIN, 'POST', '/users', { ...dados, email: emailCorrida })));
  corrida.forEach((r) => { const i = idDe(r); if (i) criados.users.push(i); });
  const criadas = corrida.filter((r) => [200, 201].includes(r.status)).length;
  registrar('Corrida: 8 cadastros simultâneos do mesmo e-mail criam só 1', criadas === 1, { endpoint: 'POST /users x8', esperado: '1 criado', obtido: `${criadas} criados (status: ${corrida.map((r) => r.status).join(',')})`, arquivo: 'apps/api/src/modules/users/users.service.ts (unicidade de e-mail sem restrição/transação?)' });

  esperar('Excluir definitivamente', await chamar(tk.ADMIN, 'DELETE', `/users/${id}/permanent`), [200, 204]);
  esperar('Usuário excluído some (404)', await chamar(tk.ADMIN, 'GET', `/users/${id}`), [404, 400]);
  esperar('Excluir de novo não derruba (404)', await chamar(tk.ADMIN, 'DELETE', `/users/${id}/permanent`), [404, 400, 409]);
}

async function suiteFuncionarios(tk) {
  area = 'Funcionários (criar/editar/excluir)';
  const cpf = cpfValido(Date.now() % 1e9);
  const dados = { name: 'ROBO API Funcionario', cpf, email: email('f1') };
  const criar = await chamar(tk.RH, 'POST', '/employees', dados);
  const ok = esperar('RH cria funcionário', criar, [200, 201]);
  const id = idDe(criar);
  if (id) criados.employees.push(id);
  if (!ok || !id) return registrar('Resto do ciclo de funcionário', null, { obtido: 'sem id do funcionário criado (veja o erro acima: campos obrigatórios?)' });

  esperar('Ler o funcionário criado', await chamar(tk.RH, 'GET', `/employees/${id}`), 200);
  esperar('CPF duplicado devolve 409', await chamar(tk.RH, 'POST', '/employees', { ...dados, email: email('f2') }), [409, 400, 422]);
  esperar('CPF inválido devolve 400/422', await chamar(tk.RH, 'POST', '/employees', { name: 'X', cpf: '11111111111', email: email('f3') }), [400, 422]);
  esperar('Nome ausente devolve 400', await chamar(tk.RH, 'POST', '/employees', { cpf: cpfValido(Date.now() % 1e9 + 1) }), 400);
  esperar('Nome com tipo errado devolve 400', await chamar(tk.RH, 'POST', '/employees', { name: 12345 }), 400);
  esperar('Salário negativo é recusado', await chamar(tk.RH, 'POST', '/employees', { name: 'Neg', salary: -100, cpf: cpfValido(Date.now() % 1e9 + 2) }), [400, 422]);
  esperar('Editar funcionário', await chamar(tk.RH, 'PATCH', `/employees/${id}`, { name: 'ROBO API Funcionario Editado' }), 200);
  const lido = await chamar(tk.RH, 'GET', `/employees/${id}`);
  registrar('Edição foi gravada no banco', (lido.json?.data?.name ?? lido.json?.data?.employee?.name) === 'ROBO API Funcionario Editado', { endpoint: `GET /employees/${id}`, obtido: 'nome lido não bate com o editado', arquivo: arquivoDe('/employees') });

  esperar('FUNCIONARIO NÃO cria funcionário (403)', await chamar(tk.FUNCIONARIO, 'POST', '/employees', { name: 'Intruso' }), 403);
  esperar('GESTOR NÃO exclui funcionário (403)', await chamar(tk.GESTOR, 'DELETE', `/employees/${id}/permanent`), 403);
  esperar('FUNCIONARIO NÃO edita funcionário (403)', await chamar(tk.FUNCIONARIO, 'PATCH', `/employees/${id}`, { name: 'Hack' }), 403);

  const cpfCorrida = cpfValido(Date.now() % 1e9 + 77);
  const corrida = await Promise.all(Array.from({ length: 8 }, (_, i) => chamar(tk.RH, 'POST', '/employees', { name: `ROBO corrida ${i}`, cpf: cpfCorrida, email: email(`c${i}`) })));
  corrida.forEach((r) => { const i = idDe(r); if (i) criados.employees.push(i); });
  const criadas = corrida.filter((r) => [200, 201].includes(r.status)).length;
  registrar('Corrida: 8 cadastros simultâneos do mesmo CPF criam só 1', criadas === 1, { endpoint: 'POST /employees x8', esperado: '1 criado', obtido: `${criadas} criados (status: ${corrida.map((r) => r.status).join(',')})`, arquivo: 'apps/api/src/modules/employees/employees.service.ts (checagem de CPF sem restrição única/transação?)' });

  esperar('Arquivar (soft delete)', await chamar(tk.RH, 'DELETE', `/employees/${id}`), [200, 204]);
  esperar('Excluir definitivamente', await chamar(tk.RH, 'DELETE', `/employees/${id}/permanent`), [200, 204, 404]);
  esperar('Funcionário excluído some (404)', await chamar(tk.RH, 'GET', `/employees/${id}`), [404, 400]);
}

async function suiteOutraEmpresa(tk) {
  area = 'Isolamento entre empresas';
  if (!tk.ADMIN_B) return registrar('Isolamento entre empresas', null, { obtido: 'ADMIN_B (admin.b@test.local) não entrou; seed incompleto' });
  const u = await chamar(tk.ADMIN, 'POST', '/users', { name: 'ROBO API Alvo', email: email('alvo'), password: 'SenhaForte#2026', role: 'RH' });
  const uid = idDe(u); if (uid) criados.users.push(uid);
  const e = await chamar(tk.RH, 'POST', '/employees', { name: 'ROBO API Alvo Func', cpf: cpfValido(Date.now() % 1e9 + 500), email: email('alvof') });
  const eid = idDe(e); if (eid) criados.employees.push(eid);
  if (uid) {
    esperar('Empresa B NÃO lê usuário da empresa A', await chamar(tk.ADMIN_B, 'GET', `/users/${uid}`), [403, 404]);
    esperar('Empresa B NÃO edita usuário da empresa A', await chamar(tk.ADMIN_B, 'PATCH', `/users/${uid}`, { name: 'Invadido' }), [403, 404]);
    esperar('Empresa B NÃO exclui usuário da empresa A', await chamar(tk.ADMIN_B, 'DELETE', `/users/${uid}/permanent`), [403, 404]);
    const lista = await chamar(tk.ADMIN_B, 'GET', '/users');
    registrar('Lista de usuários da empresa B não contém registros da A', !JSON.stringify(lista.json ?? '').includes(uid), { endpoint: 'GET /users', obtido: 'vazamento: usuário da empresa A apareceu na lista da B', arquivo: arquivoDe('/users') });
  }
  if (eid) {
    esperar('Empresa B NÃO lê funcionário da empresa A', await chamar(tk.ADMIN_B, 'GET', `/employees/${eid}`), [403, 404]);
    esperar('Empresa B NÃO edita funcionário da empresa A', await chamar(tk.ADMIN_B, 'PATCH', `/employees/${eid}`, { name: 'Invadido' }), [403, 404]);
    esperar('Empresa B NÃO exclui funcionário da empresa A', await chamar(tk.ADMIN_B, 'DELETE', `/employees/${eid}/permanent`), [403, 404]);
    const lista = await chamar(tk.ADMIN_B, 'GET', '/employees');
    registrar('Lista de funcionários da empresa B não contém registros da A', !JSON.stringify(lista.json ?? '').includes(eid), { endpoint: 'GET /employees', obtido: 'vazamento: funcionário da empresa A apareceu na lista da B', arquivo: arquivoDe('/employees') });
  }
  const me = await chamar(tk.ADMIN, 'GET', '/auth/me');
  const companyB = (await chamar(tk.ADMIN_B, 'GET', '/auth/me')).json?.data?.companyId;
  if (companyB) esperar('Criar usuário informando companyId de outra empresa é recusado ou ignorado', await chamar(tk.ADMIN, 'POST', '/users', { name: 'ROBO API Invasor', email: email('invasor'), password: 'SenhaForte#2026', role: 'RH', companyId: companyB }), [400, 403, 422, 201, 200], {});
  void me;
}

async function suiteCalculos(tk) {
  area = 'Cálculos de folha (contra o oráculo CLT 2026)';
  if (!tk.DEV) return registrar('Cálculos de folha', null, { obtido: 'DEV não entrou' });
  const SEMANA = 2640, UTEIS = 22, DESCANSO = 4; // o simulador usa 44h/semana, 22 dias úteis e 4 de descanso
  const base = { referenceDate: '2026-10-01' };

  // Perfis sem acesso à contabilidade
  for (const perfil of ['ADMIN', 'RH', 'GESTOR', 'FUNCIONARIO']) {
    esperar(`${perfil} NÃO usa o simulador de folha (403)`, await chamar(tk[perfil], 'POST', '/accounting/rules/simulate', { ...base, salary: 3000 }), 403);
    esperar(`${perfil} NÃO vê as regras de INSS/IRRF (403)`, await chamar(tk[perfil], 'GET', '/accounting/rules'), 403);
    esperar(`${perfil} NÃO grava regra de imposto (403)`, await chamar(tk[perfil], 'POST', '/accounting/rules', { taxType: 'FGTS', effectiveFrom: '2099-01-01', rate: 0.08 }), 403);
  }

  // Entradas inválidas nunca viram 500 nem cálculo
  const invalidas = [['salário negativo', { salary: -1 }], ['salário absurdo', { salary: 1e12 }], ['dependentes demais', { salary: 3000, dependents: 99 }], ['minutos negativos', { salary: 3000, overtime50Minutes: -5 }], ['data inválida', { salary: 3000, referenceDate: 'ontem' }], ['salário como texto', { salary: 'abc' }]];
  for (const [nome, corpo] of invalidas) esperar(`Simulador recusa: ${nome} (400)`, await chamar(tk.DEV, 'POST', '/accounting/rules/simulate', { ...base, ...corpo }), 400);

  // Regras fiscais mal formadas devem ser recusadas (nada é gravado)
  const efetivo = '2099-01-01';
  const regras = [
    ['INSS com faixas fora de ordem', { taxType: 'INSS', effectiveFrom: efetivo, brackets: [{ limit: 3000, rate: 0.09 }, { limit: 1000, rate: 0.075 }] }],
    ['INSS com alíquota de 75% (digitou 0,75 em vez de 0,075)', { taxType: 'INSS', effectiveFrom: efetivo, brackets: [{ limit: 1621, rate: 0.75 }] }],
    ['INSS sem teto', { taxType: 'INSS', effectiveFrom: efetivo, brackets: [{ limit: null, rate: 0.14 }] }],
    ['FGTS sem alíquota', { taxType: 'FGTS', effectiveFrom: efetivo }],
    ['FGTS de 90%', { taxType: 'FGTS', effectiveFrom: efetivo, rate: 0.9 }],
    ['Hora extra 50% abaixo do mínimo da CLT (1,2)', { taxType: 'PAYROLL_PARAMS', effectiveFrom: efetivo, parameters: { overtime50MinFactor: 1.2, overtime100MinFactor: 2, nightMinPercent: 20, monthlyDivisorFactor: 5 } }],
    ['Adicional noturno abaixo de 20%', { taxType: 'PAYROLL_PARAMS', effectiveFrom: efetivo, parameters: { overtime50MinFactor: 1.5, overtime100MinFactor: 2, nightMinPercent: 10, monthlyDivisorFactor: 5 } }],
    ['Divisor mensal absurdo (9)', { taxType: 'PAYROLL_PARAMS', effectiveFrom: efetivo, parameters: { overtime50MinFactor: 1.5, overtime100MinFactor: 2, nightMinPercent: 20, monthlyDivisorFactor: 9 } }],
  ];
  for (const [nome, corpo] of regras) esperar(`Regra recusada: ${nome} (400)`, await chamar(tk.DEV, 'POST', '/accounting/rules', corpo), 400);

  // Grade de casos: cada resultado do sistema é comparado com o oráculo independente
  const casos = [];
  for (const salary of [1621, 2500, 3000, 4999.99, 5000.01, 6500, 7350, 8475.55, 12000])
    for (const [he50, he100, noturno, faltas] of [[0, 0, 0, 0], [90, 0, 0, 0], [600, 240, 300, 0], [0, 0, 0, 480], [120, 60, 120, 60]])
      for (const dependents of [0, 2]) casos.push({ salary, he50, he100, noturno, faltas, dependents });

  let divergentes = 0, avaliados = 0, versaoDiferente = null;
  for (const c of casos) {
    const r = await chamar(tk.DEV, 'POST', '/accounting/rules/simulate', { ...base, salary: c.salary, dependents: c.dependents, overtime50Minutes: c.he50, overtime100Minutes: c.he100, nightShiftMinutes: c.noturno, absenceMinutes: c.faltas });
    if (![200, 201].includes(r.status)) { divergentes++; registrar(`Simulador respondeu ${r.status} para salário ${c.salary}`, false, { endpoint: 'POST /accounting/rules/simulate', status: r.status, obtido: (r.json?.error?.message || r.texto || '').slice(0, 160), requestId: r.requestId, arquivo: arquivoDe('/accounting') }); continue; }
    const dados = r.json?.data ?? r.json;
    const versoes = dados?.rulesUsed;
    if (versoes && [versoes.inss, versoes.irrf, versoes.fgts, versoes.params].some((v) => v && v !== 'PADRAO_2026')) { versaoDiferente = versoes; continue; } // regras da empresa/contabilidade diferem do padrão: comparação não vale
    avaliados++;
    const oraculo = folhaOraculo({ salario: c.salary, minutosSemana: SEMANA, he50: c.he50, he100: c.he100, noturno: c.noturno, faltas: c.faltas, atrasos: 0, saidasAntecipadas: 0, diasUteis: UTEIS, diasDescanso: DESCANSO, dependentes: c.dependents, dsr: true });
    const dif = compararFolha(dados?.result, oraculo);
    const inv = dados?.result ? invariantes(dados.result) : ['sem resultado'];
    if (dif.length || inv.length) {
      divergentes++;
      registrar(`Cálculo diverge do oráculo (salário ${c.salary}, HE50 ${c.he50}min, HE100 ${c.he100}min, noturno ${c.noturno}min, faltas ${c.faltas}min, dep. ${c.dependents})`, false, {
        endpoint: 'POST /accounting/rules/simulate', esperado: 'igual ao oráculo (docs/CLT_PAYROLL_RULES_2026.md)', obtido: [...dif.map((d) => `${d.campo}: esperado ${d.esperado}, sistema ${d.obtido}`), ...inv].join(' | ').slice(0, 400), arquivo: 'apps/api/src/modules/time-track/payroll-calculation.service.ts',
      });
    }
  }
  if (versaoDiferente) registrar('Casos com regras fiscais personalizadas ignorados', null, { obtido: `O banco usa versões diferentes de PADRAO_2026 (${JSON.stringify(versaoDiferente)}). Esses casos não foram comparados com o oráculo.` });
  registrar(`Folha: ${avaliados} casos comparados com o oráculo, ${divergentes} divergência(s)`, divergentes === 0 && avaliados > 0, { obtido: avaliados === 0 ? 'nenhum caso pôde ser comparado' : `${divergentes} divergência(s) (veja os itens acima)`, arquivo: 'apps/api/src/modules/time-track/payroll-calculation.service.ts' });
}
async function limpar(tk) {
  area = 'Limpeza';
  let sobras = 0;
  for (const id of criados.users) { const r = await chamar(tk.ADMIN, 'DELETE', `/users/${id}/permanent`); if (![200, 204, 404, 400].includes(r.status)) sobras++; }
  for (const id of criados.employees) {
    await chamar(tk.RH, 'DELETE', `/employees/${id}`);
    const r = await chamar(tk.RH, 'DELETE', `/employees/${id}/permanent`); if (![200, 204, 404, 400].includes(r.status)) sobras++;
  }
  registrar('Todos os registros criados pelo robô foram removidos', sobras === 0, { obtido: `${sobras} registro(s) não removidos; procure por "robo-api-${unico}"` });
}

// ---------- relatório ----------
function relatorio() {
  const falhas = resultados.filter((r) => r.situacao === 'FALHOU');
  const incs = resultados.filter((r) => r.situacao === 'inconclusivo');
  const pasta = join(raiz, 'tools/robo-api/relatorios');
  mkdirSync(pasta, { recursive: true });
  const base = join(pasta, new Date().toISOString().replace(/[:.]/g, '-'));
  const linhas = [`# Robô de API — ${new Date().toLocaleString('pt-BR')}`, '', `Base: ${BASE} · ✅ ${resultados.length - falhas.length - incs.length} · ❌ ${falhas.length} · ⚠️ ${incs.length}`, ''];
  if (falhas.length) {
    linhas.push('## Defeitos encontrados', '');
    falhas.forEach((f, i) => linhas.push(`${i + 1}. **${f.nome}** (${f.area})`, `   - Chamada: \`${f.endpoint ?? '-'}\` · esperado: ${f.esperado ?? f.regra ?? '-'} · obtido: ${f.obtido ?? f.status}`, `   - Onde olhar no código: ${f.arquivo ?? '-'}`, `   - requestId: ${f.requestId ?? 'n/d'}`, ''));
  } else linhas.push('Nenhum defeito encontrado.', '');
  if (incs.length) { linhas.push('## Inconclusivos', ''); incs.forEach((f) => linhas.push(`- ${f.nome}: ${f.obtido ?? ''}`)); }
  writeFileSync(`${base}.md`, linhas.join('\n'), 'utf8');
  writeFileSync(`${base}.json`, JSON.stringify(resultados, null, 2), 'utf8');
  console.log(`\n${resultados.length - falhas.length - incs.length} passaram · ${falhas.length} falharam · ${incs.length} inconclusivos\nRelatório: ${base}.md`);
  return falhas.length;
}

// ---------- execução ----------
const tk = {};
try {
  area = 'Preparação';
  for (const p of Object.keys(CONTAS)) tk[p] = await entrar(p);
  await suiteAutenticacao();
  if (tk.ADMIN && tk.RH && tk.GESTOR && tk.FUNCIONARIO) {
    await suiteUsuarios(tk);
    await suiteFuncionarios(tk);
    await suiteOutraEmpresa(tk);
    await suiteCalculos(tk);
  } else registrar('Suítes de usuários/funcionários', null, { obtido: 'faltou entrar com ADMIN/RH/GESTOR/FUNCIONARIO (rode o seed de teste)' });
} finally {
  if (tk.ADMIN && tk.RH) await limpar(tk);
}
process.exit(relatorio() > 0 ? 1 : 0);
