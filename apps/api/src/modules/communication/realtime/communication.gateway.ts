import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: true, credentials: true }, namespace: 'communication' })
export class CommunicationGateway {
  private readonly logger = new Logger(CommunicationGateway.name);

  @WebSocketServer()
  server!: Server;

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(companyId).emit(event, payload);
    this.logger.debug(`event=${event} companyId=${companyId}`);
  }
}
