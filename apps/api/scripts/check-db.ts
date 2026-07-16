import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tracks = await prisma.timeTrack.findMany({
    take: 30,
    orderBy: { date: 'desc' },
    select: {
      date: true,
      entry: true,
      lunchStart: true,
      lunchReturn: true,
      exit: true,
      totalWorked: true,
      dailyBalance: true,
      employee: { select: { name: true, workScale: true } }
    }
  });
  console.log(JSON.stringify(tracks, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
