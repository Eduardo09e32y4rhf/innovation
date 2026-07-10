const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function run() {
  const hash = await bcrypt.hash('Je12345678*', 10);
  await prisma.user.update({
    where: { email: 'eduardo998468@gmail.com' },
    data: { passwordHash: hash, isActive: true }
  });
  console.log('Reset OK');
}
run().then(()=>process.exit(0)).catch(console.error);
