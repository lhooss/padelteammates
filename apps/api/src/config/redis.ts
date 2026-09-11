import { Redis } from 'ioredis';
import { env } from './env.js';

// Redis sert a suivre les "sessions de match actives" (voir SDD):
// matchs en cours de saisie/validation de score, + petit cache calendrier.
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err: Error) => {
  console.error('[redis] erreur:', err.message);
});

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}
