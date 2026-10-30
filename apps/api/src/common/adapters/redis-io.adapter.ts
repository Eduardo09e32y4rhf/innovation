import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { socketAuthMiddleware } from './socket-auth';
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

  /** Limite de conexoes por minuto por IP (antes da autenticacao; o companyId do cliente nao e confiavel). */
  private readonly rateLimit = async (socket: any, next: (err?: Error) => void) => {
    try {
      if (this.pubClient?.status === 'ready') {
        const key = `ratelimit:ws:connections:ip:${socket.handshake.address || 'unknown-ip'}`;
        const current = await this.pubClient.incr(key);
        if (current === 1) await this.pubClient.expire(key, 60);
        if (current > 50) return next(new Error('Too many connections from this IP'));
      }
      next();
    } catch {
      next(); // Redis caiu no meio da chamada: o limitador e opcional, nao derruba o login do socket.
    }
  };

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    // Cada namespace (inclusive 'communication', criado depois) passa pelo limitador por IP e pela autenticacao JWT.
    const guard = (ns: any) => {
      ns.use(this.rateLimit);
      ns.use(socketAuthMiddleware());
    };
    guard(server.of('/'));
    server.on('new_namespace', guard);

    return server;
  }
}
