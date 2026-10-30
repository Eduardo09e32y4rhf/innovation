import { Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
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
export class CommunicationGateway implements OnGatewayConnection {
  private readonly logger = new Logger(CommunicationGateway.name);

  @WebSocketServer()
  server!: Server;

  /** A sala vem do JWT verificado no handshake (common/adapters/socket-auth.ts), nunca de dado enviado pelo cliente. */
  handleConnection(client: any) {
    const companyId = client?.data?.user?.companyId;
    if (!companyId) { client?.disconnect?.(true); return; }
    client.join(companyId);
  }

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(companyId).emit(event, payload);
    this.logger.debug(`event=${event} companyId=${companyId}`);
  }
}
