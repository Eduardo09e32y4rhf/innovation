import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    try {
      const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      const subClient = pubClient.duplicate();

      await new Promise((resolve, reject) => {
        pubClient.on('ready', resolve);
        pubClient.on('error', reject);
      });
      
      await new Promise((resolve, reject) => {
        subClient.on('ready', resolve);
        subClient.on('error', reject);
      });

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
