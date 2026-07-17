import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private pubClient: any;
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    try {
      const host = process.env.REDIS_URL ? new URL(process.env.REDIS_URL).hostname : (process.env.REDIS_HOST || 'localhost');
      const port = process.env.REDIS_URL ? parseInt(new URL(process.env.REDIS_URL).port || '6379') : parseInt(process.env.REDIS_PORT || '6379');
      this.pubClient = new Redis({ host, port, family: 4 });
      const subClient = this.pubClient.duplicate();

      const connectWithTimeout = (client: any) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Redis connection timeout')), 5000);
          client.on('ready', () => { clearTimeout(timeout); resolve(true); });
          client.on('error', (err: any) => { clearTimeout(timeout); reject(err); });
        });
      };

      await connectWithTimeout(this.pubClient);
      await connectWithTimeout(subClient);

      this.adapterConstructor = createAdapter(this.pubClient, subClient);
      console.log('[RedisIoAdapter] Successfully connected to Redis for WebSockets');
    } catch (error) {
      console.error('[RedisIoAdapter] Failed to connect to Redis. Falling back to default adapter.', error);
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
        
        if (this.pubClient) {
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
      } catch (err) {
        next(new Error('Internal rate limiter error'));
      }
    });

    return server;
  }
}
