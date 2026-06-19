import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

@WebSocketGateway({
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : process.env.NODE_ENV !== 'production',
    credentials: true,
  },
  namespace: 'communication',
})
export class CommunicationGateway {
  private readonly logger = new Logger(CommunicationGateway.name);

  @WebSocketServer()
  server!: Server;

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(companyId).emit(event, payload);
    this.logger.debug(`event=${event} companyId=${companyId}`);
  }
}
