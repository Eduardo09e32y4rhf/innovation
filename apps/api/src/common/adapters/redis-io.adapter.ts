import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { redisConnection } from '../redis/redis-config';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: any;
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    let pub: any;
    let sub: any;
    try {
      pub = new Redis({ ...redisConnection(), family: 4, connectTimeout: 3000 });
      sub = pub.duplicate();
      // Sem listener, o ioredis registra "Unhandled error event" a cada tentativa de reconexao.
      for (const client of [pub, sub]) client.on('error', () => undefined);

      // Os dois clientes conectam em paralelo: aguardar um de cada vez perdia o 'ready' do segundo.
      const ready = (client: any) =>
        client.status === 'ready'
          ? Promise.resolve()
          : new Promise<void>((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
              client.once('ready', () => { clearTimeout(timer); resolve(); });
              client.once('error', (err: Error) => { clearTimeout(timer); reject(err); });
            });
      await Promise.all([ready(pub), ready(sub)]);

      this.pubClient = pub;
      this.adapterConstructor = createAdapter(pub, sub);
      console.log('[RedisIoAdapter] Successfully connected to Redis for WebSockets');
    } catch (error) {
      pub?.disconnect();
      sub?.disconnect();
      this.pubClient = undefined;
      console.error('[RedisIoAdapter] Failed to connect to Redis. Falling back to default adapter.', error instanceof Error ? error.message : error);
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    server.use(async (socket: any, next: (err?: Error) => void) => {
      try {
        const companyId = socket.handshake.query?.companyId || socket.handshake.auth?.companyId;
        const ip = socket.handshake.address || 'unknown-ip';
        const identifier = companyId ? `company:${companyId}` : `ip:${ip}`;
        
        if (this.pubClient?.status === 'ready') {
          const key = `ratelimit:ws:connections:${identifier}`;
          const current = await this.pubClient.incr(key);
          if (current === 1) {
            await this.pubClient.expire(key, 60); // 1 minute window
          }
          
          if (current > 50) { // Limit to 50 connections per minute per company/IP
            return next(new Error('Too many connections from this company/IP'));
          }
        }
        next();
      } catch {
        next(); // Redis caiu no meio da chamada: o limitador e opcional, nao derruba o login do socket.
      }
    });

    return server;
  }
}
