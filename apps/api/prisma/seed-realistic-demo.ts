import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Utilitário para gerar CPF fictício válido para validadores simples
function generateFakeCpf(): string {
  const n = () => Math.floor(Math.random() * 9);
  const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
}

// Dias úteis dos últimos N dias
function getWorkingDays(daysCount: number): Date[] {
  const days: Date[] = [];
  let current = new Date();
  current.setHours(12, 0, 0, 0); // Evitar problemas de fuso horário

  while (days.length < daysCount) {
    current.setDate(current.getDate() - 1);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Ignora domingos e sábados
      days.unshift(new Date(current));
    }
  }
  return days;
}

// Lista de pessoas fictícias com base no pedido do usuário
const peopleData = [
  { name: 'Mariana Azevedo', email: 'mariana.azevedo@innovation.com', role: UserRole.ADMIN, position: 'Diretora de Operações', department: 'Diretoria', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Lucas Ferreira', email: 'lucas.ferreira@innovation.com', role: UserRole.GESTOR, position: 'Gerente Financeiro', department: 'Financeiro', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Camila Rocha', email: 'camila.rocha@innovation.com', role: UserRole.RH, position: 'Analista de RH', department: 'RH', contract: 'CLT', city: 'Osasco/SP', scale: '5x2' },
  { name: 'Bruno Martins', email: 'bruno.martins@innovation.com', role: UserRole.FUNCIONARIO, position: 'Desenvolvedor Backend', department: 'TI', contract: 'PJ', city: 'Campinas/SP', scale: 'Remoto' },
  { name: 'Aline Costa', email: 'aline.costa@innovation.com', role: UserRole.GESTOR, position: 'Coordenadora de Marketing', department: 'Marketing', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Rafael Oliveira', email: 'rafael.oliveira@innovation.com', role: UserRole.FUNCIONARIO, position: 'Consultor Comercial', department: 'Comercial', contract: 'PJ', city: 'Rio de Janeiro/RJ', scale: 'Externa' },
  { name: 'Juliana Santos', email: 'juliana.santos@innovation.com', role: UserRole.FUNCIONARIO, position: 'Assistente Administrativo', department: 'Administrativo', contract: 'CLT', city: 'Guarulhos/SP', scale: '5x2' },
  { name: 'André Lima', email: 'andre.lima@innovation.com', role: UserRole.FUNCIONARIO, position: 'Técnico de Campo', department: 'Operação', contract: 'CLT', city: 'Duque de Caxias/RJ', scale: '6x1' },
  { name: 'Fernanda Almeida', email: 'fernanda.almeida@innovation.com', role: UserRole.FUNCIONARIO, position: 'Especialista de Dados', department: 'TI', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Thiago Barros', email: 'thiago.barros@innovation.com', role: UserRole.GESTOR, position: 'Supervisor de Operações', department: 'Operação', contract: 'CLT', city: 'Santo André/SP', scale: '6x1' },
  { name: 'Renata Nogueira', email: 'renata.nogueira@innovation.com', role: UserRole.FUNCIONARIO, position: 'Analista Financeiro', department: 'Financeiro', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Felipe Carvalho', email: 'felipe.carvalho@innovation.com', role: UserRole.FUNCIONARIO, position: 'Desenvolvedor Frontend', department: 'TI', contract: 'PJ', city: 'Niterói/RJ', scale: 'Remoto' },
  { name: 'Beatriz Ribeiro', email: 'beatriz.ribeiro@innovation.com', role: UserRole.RH, position: 'Estagiária de RH', department: 'RH', contract: 'Estágio', city: 'São Bernardo do Campo/SP', scale: '5x2' },
  { name: 'Daniela Moura', email: 'daniela.moura@innovation.com', role: UserRole.FUNCIONARIO, position: 'Analista de Suporte', department: 'TI', contract: 'CLT', city: 'Rio de Janeiro/RJ', scale: '6x1' },
  { name: 'Vinícius Teixeira', email: 'vinicius.teixeira@innovation.com', role: UserRole.FUNCIONARIO, position: 'Motorista', department: 'Logística', contract: 'CLT', city: 'São Paulo/SP', scale: '6x1' },
  { name: 'Letícia Duarte', email: 'leticia.duarte@innovation.com', role: UserRole.FUNCIONARIO, position: 'Jovem Aprendiz Administrativo', department: 'Administrativo', contract: 'Jovem Aprendiz', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Igor Mendes', email: 'igor.mendes@innovation.com', role: UserRole.FUNCIONARIO, position: 'Auxiliar de Logística', department: 'Logística', contract: 'CLT', city: 'Osasco/SP', scale: '6x1' },
  { name: 'Carolina Freitas', email: 'carolina.freitas@innovation.com', role: UserRole.CONSULTA, position: 'Auditora', department: 'Qualidade', contract: 'Terceirizado', city: 'Rio de Janeiro/RJ', scale: '5x2' },
  { name: 'Rodrigo Cardoso', email: 'rodrigo.cardoso@innovation.com', role: UserRole.FUNCIONARIO, position: 'Operador de Atendimento', department: 'Atendimento', contract: 'Temporário', city: 'Nova Iguaçu/RJ', scale: '6x1' },
  { name: 'Patrícia Gomes', email: 'patricia.gomes@innovation.com', role: UserRole.FUNCIONARIO, position: 'Recepcionista', department: 'Administrativo', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
  { name: 'Marcelo Nascimento', email: 'marcelo.nascimento@innovation.com', role: UserRole.GESTOR, position: 'Gerente Comercial', department: 'Comercial', contract: 'PJ', city: 'São Paulo/SP', scale: 'Externa' },
  { name: 'Larissa Martins', email: 'larissa.martins@innovation.com', role: UserRole.FUNCIONARIO, position: 'Analista de Qualidade', department: 'Qualidade', contract: 'CLT', city: 'Barueri/SP', scale: '5x2' },
  { name: 'Diego Almeida', email: 'diego.almeida@innovation.com', role: UserRole.FUNCIONARIO, position: 'Consultor Comercial', department: 'Comercial', contract: 'PJ', city: 'Campinas/SP', scale: 'Externa' },
  { name: 'Priscila Oliveira', email: 'priscila.oliveira@innovation.com', role: UserRole.FUNCIONARIO, position: 'Assistente Administrativo', department: 'Administrativo', contract: 'CLT', city: 'São Paulo/SP', scale: '5x2' },
];

async function main() {
  console.log('🚀 Iniciando script de seed de dados reais (Demo Profissional)...');

  // 1. Proteger e garantir usuário MASTER
  const masterEmail = 'eduardo998468@gmail.com';
  console.log(`🛡️  Garantindo preservação do master: ${masterEmail}`);

  // 2. Limpeza Idempotente de antigos Demos (com cuidado para não apagar o master)
  console.log('🧹 Limpando usuários e colaboradores "Demo" antigos...');
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: { not: masterEmail },
      OR: [
        { email: { endsWith: '@innovation.local' } },
        { name: { contains: 'Demo' } },
        { employee: { cpf: { in: ['00000000001', '00000000002', '00000000003'] } } }
      ]
    },
    include: { employee: true }
  });

  for (const user of usersToDelete) {
    if (user.employee) {
      await prisma.timeTrack.deleteMany({ where: { employeeId: user.employee.id } });
      await prisma.vacation.deleteMany({ where: { employeeId: user.employee.id } });
      await prisma.employee.delete({ where: { id: user.employee.id } });
    }
    await prisma.user.delete({ where: { id: user.id } });
  }

  // Deletar employees órfãos (que não tem user, mas são demo)
  await prisma.employee.deleteMany({
    where: {
      OR: [
        { cpf: { in: ['00000000001', '00000000002', '00000000003'] } },
        { name: { contains: 'Demo' } }
      ]
    }
  });

  // 3. Criar a Empresa Realista
  console.log('🏢 Configurando Empresa Innovation Gestão e Tecnologia LTDA...');
  const company = await prisma.company.upsert({
    where: { document: '12345678000199' },
    update: {
      name: 'Innovation RH',
      legalName: 'Innovation Gestão e Tecnologia LTDA',
      city: 'São Paulo',
      state: 'SP',
      primaryColor: '#0F766E',
    },
    create: {
      name: 'Innovation RH',
      legalName: 'Innovation Gestão e Tecnologia LTDA',
      document: '12345678000199',
      city: 'São Paulo',
      state: 'SP',
      primaryColor: '#0F766E',
      theme: 'light',
      maxUsers: 100,
      maxEmployees: 100,
    }
  });

  // Garantir que o usuário master tem a company correta (para evitar órfãos)
  const masterUser = await prisma.user.findUnique({ where: { email: masterEmail } });
  if (masterUser && masterUser.companyId !== company.id) {
    await prisma.user.update({
      where: { email: masterEmail },
      data: { companyId: company.id }
    });
  } else if (!masterUser) {
    await prisma.user.create({
      data: {
        email: masterEmail,
        name: 'Eduardo Dev',
        role: UserRole.DEV,
        passwordHash: await bcrypt.hash('Innovation@123', 10),
        companyId: company.id,
      }
    });
  }

  // 4. Criar Regras de Jornada Profissionais
  console.log('⏰ Criando Regras de Escala/Jornada...');
  const scale5x2 = await prisma.workScheduleRule.create({
    data: {
      companyId: company.id,
      name: '5x2 - 08:00 Diárias',
      dailyMinutes: 480,
      weeklyMinutes: 2400,
      entryTime: '09:00',
      exitTime: '18:00',
      breakMinutes: 60,
      workScale: '5x2',
      closingStartDay: 1,
      closingEndDay: 30,
      adjustmentDeadlineDay: 5,
      managerApprovalDeadlineDay: 10
    }
  });

  const scale6x1 = await prisma.workScheduleRule.create({
    data: {
      companyId: company.id,
      name: '6x1 - 07:20 Diárias',
      dailyMinutes: 440,
      weeklyMinutes: 2640,
      entryTime: '08:00',
      exitTime: '16:20',
      breakMinutes: 60,
      workScale: '6x1',
      closingStartDay: 1,
      closingEndDay: 30,
      adjustmentDeadlineDay: 5,
      managerApprovalDeadlineDay: 10
    }
  });

  const scaleList = { '5x2': scale5x2, '6x1': scale6x1 };

  // 5. Inserir Colaboradores e Usuários
  console.log('👥 Injetando 24 Colaboradores Profissionais e Usuários de Acesso...');
  const defaultPassword = await bcrypt.hash('Innovation@123', 10);
  
  const createdEmployees = [];

  for (let i = 0; i < peopleData.length; i++) {
    const person = peopleData[i];
    
    // Calcula admissão nos últimos 12 meses
    const admissionDate = new Date();
    admissionDate.setMonth(admissionDate.getMonth() - Math.floor(Math.random() * 11) - 1);
    
    let unit = 'Matriz';
    if (person.city.includes('RJ')) unit = 'Filial RJ';
    if (person.scale === 'Externa') unit = 'Operação Externa';
    if (person.scale === 'Remoto') unit = 'Home Office';

    const rule = scaleList[person.scale] || null;

    // Criar Usuário (Upsert)
    let user = await prisma.user.findUnique({ where: { email: person.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: person.email,
          name: person.name,
          passwordHash: defaultPassword,
          role: person.role,
          companyId: company.id,
          forcePasswordChange: true,
          isActive: true,
        }
      });
    } else {
      user = await prisma.user.update({
        where: { email: person.email },
        data: { role: person.role, forcePasswordChange: true, isActive: true }
      });
    }

    // Criar Employee (Upsert via user id para prevenir duplicidade pesada)
    let employee = await prisma.employee.findUnique({ where: { userId: user.id } });
    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          userId: user.id,
          companyId: company.id,
          name: person.name,
          email: person.email,
          cpf: generateFakeCpf(),
          admissionDate: admissionDate,
          position: person.position,
          department: person.department,
          contractType: person.contract,
          status: 'ACTIVE',
          salary: (Math.random() * 5000 + 1500).toFixed(2), // 1500 a 6500
          city: person.city.split('/')[0],
          state: person.city.split('/')[1],
          unit: unit,
          workScale: person.scale,
          workScheduleRuleId: rule?.id || null,
          dailyWorkload: rule ? `${Math.floor(rule.dailyMinutes / 60).toString().padStart(2, '0')}:${(rule.dailyMinutes % 60).toString().padStart(2, '0')}` : '08:00',
          standardEntry: rule?.entryTime || '09:00',
          standardExit: rule?.exitTime || '18:00',
          standardLunchStart: '12:00',
          standardLunchReturn: '13:00'
        }
      });
    } else {
      employee = await prisma.employee.update({
        where: { userId: user.id },
        data: {
          position: person.position,
          department: person.department,
          contractType: person.contract,
          workScale: person.scale,
          city: person.city.split('/')[0],
          state: person.city.split('/')[1],
          unit: unit,
          workScheduleRuleId: rule?.id || null,
          dailyWorkload: rule ? `${Math.floor(rule.dailyMinutes / 60).toString().padStart(2, '0')}:${(rule.dailyMinutes % 60).toString().padStart(2, '0')}` : '08:00',
          standardEntry: rule?.entryTime || '09:00',
          standardExit: rule?.exitTime || '18:00',
          standardLunchStart: '12:00',
          standardLunchReturn: '13:00'
        }
      });
    }

    createdEmployees.push(employee);
  }

  // 6. Criar Histórico de Ponto Limpo (Sem faltas)
  console.log('📅 Gerando Histórico de Ponto Perfeito dos últimos 30 dias...');
  const workingDays = getWorkingDays(30);

  for (const emp of createdEmployees) {
    if (emp.contractType !== 'CLT' && emp.contractType !== 'Estágio' && emp.contractType !== 'Jovem Aprendiz') continue;

    const [eh, em] = (emp.standardEntry || '09:00').split(':').map(Number);
    const [lh, lm] = (emp.standardLunchStart || '12:00').split(':').map(Number);
    const [rh, rm] = (emp.standardLunchReturn || '13:00').split(':').map(Number);
    const [exh, exm] = (emp.standardExit || '18:00').split(':').map(Number);

    for (const day of workingDays) {
      if (day < emp.admissionDate) continue;

      const entry = new Date(day); entry.setHours(eh, em + Math.floor(Math.random() * 5), 0);
      const lunchStart = new Date(day); lunchStart.setHours(lh, lm + Math.floor(Math.random() * 5), 0);
      const lunchReturn = new Date(day); lunchReturn.setHours(rh, rm + Math.floor(Math.random() * 5), 0);
      const exit = new Date(day); exit.setHours(exh, exm + Math.floor(Math.random() * 5), 0);

      const totalWorked = Math.floor((lunchStart.getTime() - entry.getTime() + exit.getTime() - lunchReturn.getTime()) / 60000);

      const existingTime = await prisma.timeTrack.findUnique({
        where: { employeeId_date: { employeeId: emp.id, date: day } }
      });
      if (!existingTime) {
        await prisma.timeTrack.create({
          data: {
            employeeId: emp.id,
            date: day,
            entry,
            lunchStart,
            lunchReturn,
            exit,
            totalWorked,
            dailyBalance: 0,
            manualStatus: 'approved'
          }
        });
      }
    }
  }

  // 7. Criar Férias (Realistas)
  console.log('🏖️ Configurando registros de Férias...');
  const cltEmployees = createdEmployees.filter(e => e.contractType === 'CLT');
  if (cltEmployees.length >= 8) {
    // 3 em andamento
    for (let i = 0; i < 3; i++) {
      const emp = cltEmployees[i];
      const start = new Date(); start.setDate(start.getDate() - 5);
      const end = new Date(start); end.setDate(end.getDate() + 30);
      await prisma.vacation.create({
        data: {
          employeeId: emp.id,
          acquisitionPeriod: '2024-2025',
          startDate: start,
          endDate: end,
          daysUsed: 30,
          status: 'APPROVED',
          observation: 'Férias regulares em andamento'
        }
      });
    }
    // 3 aprovadas (futuro)
    for (let i = 3; i < 6; i++) {
      const emp = cltEmployees[i];
      const start = new Date(); start.setDate(start.getDate() + 20);
      const end = new Date(start); end.setDate(end.getDate() + 15);
      await prisma.vacation.create({
        data: {
          employeeId: emp.id,
          acquisitionPeriod: '2024-2025',
          startDate: start,
          endDate: end,
          daysUsed: 15,
          status: 'APPROVED',
          observation: 'Férias divididas - Período 1'
        }
      });
    }
    // 2 pendentes (solicitação)
    for (let i = 6; i < 8; i++) {
      const emp = cltEmployees[i];
      const start = new Date(); start.setDate(start.getDate() + 45);
      const end = new Date(start); end.setDate(end.getDate() + 20);
      await prisma.vacation.create({
        data: {
          employeeId: emp.id,
          acquisitionPeriod: '2025-2026',
          startDate: start,
          endDate: end,
          daysUsed: 20,
          status: 'PENDING',
          observation: 'Aguardando aprovação do gestor'
        }
      });
    }
  }

  console.log('✅ Base de demonstração realista criada com SUCESSO!');
  console.log('Total de colaboradores profissionais cadastrados:', createdEmployees.length);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
