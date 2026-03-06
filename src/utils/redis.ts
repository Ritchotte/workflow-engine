import { config } from '../config';

interface RedisClient {
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  quit: () => Promise<unknown>;
}

interface RedisConstructor {
  new (
    url: string,
    options: {
      maxRetriesPerRequest: null;
      enableReadyCheck: boolean;
      db: number;
      password?: string;
    }
  ): RedisClient;
}

const Redis = require('ioredis') as RedisConstructor;

export const createRedisConnection = (): RedisClient =>
  new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    db: config.redis.db,
    password: config.redis.password || undefined,
  });
