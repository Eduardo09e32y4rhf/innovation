const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const secret = '2893f418d1844c3c3a4f89d318e8a93e2bdf27f6cf6a090b3952f4405370f7d5';

async function main() {
  const company = await prisma.company.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log('Company:', company.id, company.name);

  const admin = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'ADMIN' }
  });
  console.log('Admin:', admin.email);

  const payload = {
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    companyId: admin.companyId,
    ghostMode: true,
  };
  
  const token = jwt.sign(payload, secret, { expiresIn: '60m' });
  console.log('Token:', token);

  const res = await fetch('http://localhost:3333/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

main().catch(console.error);
