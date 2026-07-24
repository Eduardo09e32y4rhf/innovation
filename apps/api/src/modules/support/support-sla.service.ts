import { Injectable } from '@nestjs/common';
import { SupportTicketPriority } from '@prisma/client';

@Injectable()
export class SupportSlaService {
  // Simple business hours mock for MVP (assuming 08:00 to 18:00, Mon-Fri)
  // In a real app, you would use a library like `business-days` or similar.
  // For the sake of this prompt, we implement a straightforward calculation.
  
  calculateDueDates(priority: SupportTicketPriority, createdAt: Date = new Date()): { firstResponseDueAt: Date; resolutionDueAt: Date } {
    const firstResponseDueAt = new Date(createdAt);
    const resolutionDueAt = new Date(createdAt);
    
    switch (priority) {
      case 'CRITICAL':
        firstResponseDueAt.setMinutes(firstResponseDueAt.getMinutes() + 15);
        resolutionDueAt.setHours(resolutionDueAt.getHours() + 4);
        break;
      case 'HIGH':
        firstResponseDueAt.setHours(firstResponseDueAt.getHours() + 1);
        this.addBusinessHours(resolutionDueAt, 8);
        break;
      case 'NORMAL':
        this.addBusinessHours(firstResponseDueAt, 4);
        this.addBusinessDays(resolutionDueAt, 2);
        break;
      case 'LOW':
        this.addBusinessDays(firstResponseDueAt, 1);
        this.addBusinessDays(resolutionDueAt, 5);
        break;
    }
    return { firstResponseDueAt, resolutionDueAt };
  }

  private addBusinessHours(date: Date, hours: number) {
    // simplified: just adds hours without skipping nights for now to avoid huge complexity in MVP
    // unless strict business hours calculation is imported
    date.setHours(date.getHours() + hours);
  }

  private addBusinessDays(date: Date, days: number) {
    let remainingDays = days;
    while (remainingDays > 0) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        remainingDays--;
      }
    }
  }
}