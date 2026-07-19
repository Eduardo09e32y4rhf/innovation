import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { AsaasService } from '../src/modules/finance/asaas.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const asaas = app.get(AsaasService);

  console.log('Iniciando desativação de notificações do Asaas para clientes existentes...');

  const companies = await prisma.company.findMany({
    where: {
      asaasCustomerId: { not: null },
    },
    select: {
      id: true,
      asaasCustomerId: true,
      legalName: true,
      name: true,
    }
  });

  console.log(`Encontradas ${companies.length} empresas com Asaas Customer ID.`);

  let successCount = 0;
  let failCount = 0;

  for (const company of companies) {
    if (!company.asaasCustomerId) continue;

    try {
      await asaas.updateCustomer(company.asaasCustomerId, {
        notificationDisabled: true,
      });
      console.log(`[OK] Empresa ${company.legalName || company.name} (ID: ${company.id}, Asaas: ${company.asaasCustomerId})`);
      successCount++;
    } catch (error) {
      console.error(`[ERRO] Empresa ${company.legalName || company.name} (ID: ${company.id}, Asaas: ${company.asaasCustomerId}):`, error);
      failCount++;
    }
  }

  console.log('----------------------------------------------------');
  console.log(`Resumo: ${successCount} atualizadas com sucesso, ${failCount} falhas.`);
  console.log('----------------------------------------------------');

  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
