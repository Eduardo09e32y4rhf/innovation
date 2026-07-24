import { Injectable } from '@nestjs/common';
import { SupportTicketPriority } from '@prisma/client';

@Injectable()
export class SupportSlaService {
  /**
   * Horário comercial: 08:00 às 18:00 (10h úteis por dia), Segunda a Sexta.
   */
  calculateDueDates(priority: SupportTicketPriority, createdAt: Date = new Date()): { firstResponseDueAt: Date; resolutionDueAt: Date } {
    const firstResponseDueAt = new Date(createdAt);
    const resolutionDueAt = new Date(createdAt);

    switch (priority) {
      case 'CRITICAL':
        // 15 minutos reais (crítico atende 24/7)
        firstResponseDueAt.setMinutes(firstResponseDueAt.getMinutes() + 15);
        resolutionDueAt.setHours(resolutionDueAt.getHours() + 4);
        break;
      case 'HIGH':
        // 1 hora de resposta, 8 horas úteis de resolução
        this.addBusinessHours(firstResponseDueAt, 1);
        this.addBusinessHours(resolutionDueAt, 8);
        break;
      case 'NORMAL':
        // 4 horas úteis de resposta, 2 dias úteis (20h úteis) de resolução
        this.addBusinessHours(firstResponseDueAt, 4);
        this.addBusinessHours(resolutionDueAt, 20);
        break;
      case 'LOW':
        // 1 dia útil (10h úteis) de resposta, 5 dias úteis (50h úteis) de resolução
        this.addBusinessHours(firstResponseDueAt, 10);
        this.addBusinessHours(resolutionDueAt, 50);
        break;
    }

    return { firstResponseDueAt, resolutionDueAt };
  }

  /**
   * Adiciona N horas úteis a uma data respeitando a janela 08:00-18:00 de segunda a sexta.
   */
  addBusinessHours(date: Date, hours: number) {
    let remainingMinutes = Math.round(hours * 60);

    while (remainingMinutes > 0) {
      const day = date.getDay(); // 0: Dom, 6: Sáb
      const currentHour = date.getHours();
      const currentMinute = date.getMinutes();

      // Se for fim de semana ou pós 18:00, avança para as 08:00 do próximo dia útil
      if (day === 0 || day === 6 || currentHour >= 18) {
        date.setDate(date.getDate() + 1);
        date.setHours(8, 0, 0, 0);
        continue;
      }

      // Se for antes das 08:00, avança para 08:00 do mesmo dia
      if (currentHour < 8) {
        date.setHours(8, 0, 0, 0);
        continue;
      }

      // Calcula quantos minutos restam até o encerramento do expediente (18:00)
      const minutesUntilEnd = (18 - currentHour) * 60 - currentMinute;

      if (remainingMinutes <= minutesUntilEnd) {
        date.setMinutes(date.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= minutesUntilEnd;
        date.setDate(date.getDate() + 1);
        date.setHours(8, 0, 0, 0);
      }
    }
  }

  /**
   * Verifica se o SLA está congelado (ex: aguardando resposta do cliente)
   */
  isSlaPaused(status: string): boolean {
    return status === 'WAITING_CUSTOMER' || status === 'RESOLVED' || status === 'CLOSED';
  }
}