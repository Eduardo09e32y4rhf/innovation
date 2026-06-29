import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    try {
      const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { family: 4 });
      const subClient = pubClient.duplicate();

      const connectWithTimeout = (client: Redis) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Redis connection timeout'));
          }, 5000);
          client.on('ready', () => {
            clearTimeout(timeout);
            resolve(true);
          });
          client.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      };

      await connectWithTimeout(pubClient);
      await connectWithTimeout(subClient);

      this.adapterConstructor = createAdapter(pubClient, subClient);
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
    return server;
  }
}
