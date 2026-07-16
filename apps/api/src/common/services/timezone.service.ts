import { Injectable } from '@nestjs/common';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

@Injectable()
export class TimeZoneService {
  private readonly TIMEZONE = 'America/Sao_Paulo';

  parseFromBRT(dateString: string | Date): Date {
    let dateInput: Date;
    
    if (typeof dateString === 'string') {
      // If it's a simple YYYY-MM-DD string, we need to treat it as a date in BRT
      if (dateString.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // We append the time part so fromZonedTime interprets it as midnight in BRT
        return fromZonedTime(`${dateString}T00:00:00`, this.TIMEZONE);
      }
      dateInput = new Date(dateString);
    } else {
      dateInput = dateString;
    }
    
    // For general dates, if it's already an absolute time (like an ISO string with Z), 
    // it will be correctly mapped.
    return dateInput;
  }

  formatToBRT(date: Date, fmt: string = 'dd/MM/yyyy'): string {
    const zonedDate = toZonedTime(date, this.TIMEZONE);
    return format(zonedDate, fmt);
  }

  startOfMonthBRT(reference: Date | string): Date {
    const date = typeof reference === 'string' ? new Date(`${reference}-01T12:00:00Z`) : reference;
    const zoned = toZonedTime(date, this.TIMEZONE);
    const start = startOfMonth(zoned);
    // Convert back to UTC representing that absolute moment
    return fromZonedTime(start, this.TIMEZONE);
  }

  endOfMonthBRT(reference: Date | string): Date {
    const date = typeof reference === 'string' ? new Date(`${reference}-01T12:00:00Z`) : reference;
    const zoned = toZonedTime(date, this.TIMEZONE);
    const end = endOfMonth(zoned);
    return fromZonedTime(end, this.TIMEZONE);
  }

  getTimezoneOffset(): number {
    return -3;
  }
}
