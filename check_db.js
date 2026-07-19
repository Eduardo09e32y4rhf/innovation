const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const employees = await prisma.employee.findMany({ where: { name: { contains: 'CAMILA' } } });
  console.log('Employees:', employees);
  for (const emp of employees) {
    const schedules = await prisma.userSchedule.findMany({ where: { employeeId: emp.id } });
    console.log(`Schedules for ${emp.name}:`, schedules);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
