const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'eduardo998468' } }
  });
  console.log(users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
