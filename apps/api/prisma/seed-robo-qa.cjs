'use strict';
/**
 * Seed das contas fixas do robo de QA (login proprio do robo + um usuario por perfil).
 *
 *   ROBO_QA_BANCO_DE_TESTE=sim ROBO_QA_SENHA='Troque#Esta1' npm --prefix apps/api run seed:robo-qa
 *
 * - Cria/atualiza a empresa "ROBO-QA Empresa de Teste" (sem CNPJ, ativa, sem cobranca pendente, com licencas de sobra).
 * - Cria/atualiza um usuario por perfil, todos com a mesma senha, sem troca obrigatoria e sem MFA.
 * - O FUNCIONARIO ja nasce com cadastro e escala 5x2 (para bater ponto e pedir ferias).
 * - Pode rodar de novo a qualquer momento: restaura a senha e destrava as contas.
 * Recusa rodar em producao ou em banco que nao seja de teste (ver avaliarAmbiente).
 */
const { PERFIS, EMPRESA, emailFixo, nomeFixo, avaliarAmbiente } = require('./robo-qa-contas.cjs');

const MODULOS = ['employees', 'time-track', 'vacations', 'management', 'recruitment'];

async function semear(prisma, senha) {
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(senha, 12);
  const agora = new Date();

  const dadosEmpresa = {
    name: EMPRESA.nome,
    status: 'ACTIVE',
    isActive: true,
    suspensionReason: null,
    billingStatus: 'ACTIVE',
    plan: 'PRO',
    maxUsers: 60,
    maxEmployees: 60,
    activeModules: MODULOS,
  };
  const empresa = await prisma.company.upsert({ where: { slug: EMPRESA.slug }, update: dadosEmpresa, create: { slug: EMPRESA.slug, ...dadosEmpresa } });

  const usuarios = {};
  for (const { perfil, rotulo } of PERFIS) {
    const email = emailFixo(perfil);
    const comuns = {
      companyId: empresa.id,
      name: nomeFixo(rotulo),
      role: perfil,
      passwordHash,
      passwordChangedAt: agora, // senha "nova": nao cai na troca obrigatoria por idade (30 dias)
      forcePasswordChange: false,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
      blockedAt: null,
      blockedReason: null,
      canceledAt: null,
      mfaSecretEnc: null,
      mfaEnabledAt: null,
      mfaRecoveryHashes: [],
      emailVerifiedAt: agora,
      welcomeSeenAt: agora,
      // CEO real exige senha, facial, dados e contrato assinado no 1o acesso; a conta do robo ja nasce com isso concluido.
      ...(perfil === 'CEO' ? { onboardingState: 'ACTIVE', onboardingCompletedAt: agora } : {}),
    };
    usuarios[perfil] = await prisma.user.upsert({ where: { email }, update: comuns, create: { email, ...comuns } });
  }

  // Funcionario com cadastro e escala, para o robo bater ponto e pedir ferias.
  const funcionario = usuarios.FUNCIONARIO;
  const admissao = new Date(agora.getFullYear() - 1, 0, 2);
  const dadosFuncionario = {
    companyId: empresa.id,
    name: funcionario.name,
    email: funcionario.email,
    position: 'Analista de Teste',
    department: 'Qualidade',
    admissionDate: admissao,
    status: 'ACTIVE',
    workScale: '5x2',
    standardEntry: '08:00',
    standardLunchStart: '12:00',
    standardLunchReturn: '13:00',
    standardExit: '17:00',
  };
  const cadastro = await prisma.employee.upsert({ where: { userId: funcionario.id }, update: dadosFuncionario, create: { userId: funcionario.id, ...dadosFuncionario } });

  let escala = await prisma.schedule.findFirst({ where: { companyId: empresa.id, name: 'ROBO-QA Escala 5x2' } });
  if (!escala) {
    escala = await prisma.schedule.create({
      data: {
        companyId: empresa.id, name: 'ROBO-QA Escala 5x2', scaleType: '5x2', status: 'ACTIVE',
        entryTime: '08:00', lunchStartTime: '12:00', lunchReturnTime: '13:00', exitTime: '17:00', workDays: [1, 2, 3, 4, 5], restDays: [0, 6],
      },
    });
  }
  const vinculo = await prisma.userSchedule.findFirst({ where: { companyId: empresa.id, employeeId: cadastro.id, scheduleId: escala.id } });
  if (!vinculo) {
    await prisma.userSchedule.create({ data: { companyId: empresa.id, employeeId: cadastro.id, scheduleId: escala.id, startDate: admissao } });
  }

  return { empresa, usuarios };
}

async function main() {
  try { require('dotenv').config(); } catch { /* sem dotenv: usa so as variaveis do ambiente */ }
  const ambiente = avaliarAmbiente(process.env);
  if (!ambiente.ok) {
    console.error(`[seed-robo-qa] Recusado: ${ambiente.motivo}`);
    process.exitCode = 1;
    return;
  }
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const { empresa } = await semear(prisma, process.env.ROBO_QA_SENHA);
    console.log(`[seed-robo-qa] Empresa "${empresa.name}" pronta (slug ${empresa.slug}). Contas (mesma senha, a de ROBO_QA_SENHA):`);
    for (const { perfil } of PERFIS) console.log(`  ${perfil.padEnd(12)} ${emailFixo(perfil)}`);
    console.log('[seed-robo-qa] No site: entre como robo-qa.dev@example.com, abra o robô 🤖, em Opções informe a mesma senha em "Contas fixas" e ligue o teste.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((erro) => { console.error('[seed-robo-qa] Falhou:', erro); process.exitCode = 1; });
}

module.exports = { semear };
