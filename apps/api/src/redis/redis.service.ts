import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.client = new Redis(url, { lazyConnect: true });

    this.client.on('connect', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (err: Error) =>
      this.logger.warn(`Redis error: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}