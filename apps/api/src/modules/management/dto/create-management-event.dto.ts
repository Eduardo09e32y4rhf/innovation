export class CreateManagementEventDto {
  title: string;
  description?: string;
  eventType: string;
  startDateTime: string;
  endDateTime?: string;
  responsibleUserId?: string;
  employeeId?: string;
  priority?: string;
}