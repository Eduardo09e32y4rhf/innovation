import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  const user = await prisma.user.findFirst();
  
  if (!company || !user) return console.log('No company/user');

  try {
    const notification = await prisma.notification.create({
      data: {
        companyId: company.id,
        type: 'WARNING',
        title: 'teste',
        message: '',
        priority: 'URGENT',
        source: 'MANUAL',
        createdBy: user.id,
        requiresReadConfirmation: true,
        requiresAcceptance: true,
        allowsRefusal: false,
        extraJson: {
          legalReason: 'Desidia no desempenho',
          occurrenceDate: '2026-07-01',
          suspensionDays: '1'
        },
        status: 'SENT',
        sentAt: new Date(),
        recipients: {
          create: [
            {
              userId: user.id,
              status: 'PENDING_RESPONSE'
            }
          ]
        }
      }
    });
    console.log('Success!', notification.id);
  } catch (e) {
    console.error('Error:', e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
