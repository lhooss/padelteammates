import { redis } from '../config/redis.js';

// Gestion des "sessions de match actives" via Redis (voir SDD).
// Un match devient "actif" des qu'un score est saisi et attend validation.
// Cela permet un suivi rapide en memoire + verrou anti-course lors des validations.

const ACTIVE_SET = 'match:active'; // set des matchId en attente de validation
const activeKey = (matchId: string) => `match:active:${matchId}`;
const lockKey = (matchId: string) => `match:lock:${matchId}`;

const ACTIVE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

export interface ActiveMatchState {
  matchId: string;
  enteredById: string;
  validators: string[];
  updatedAt: string;
}

export async function markActive(state: ActiveMatchState): Promise<void> {
  await redis
    .multi()
    .sadd(ACTIVE_SET, state.matchId)
    .set(activeKey(state.matchId), JSON.stringify(state), 'EX', ACTIVE_TTL_SECONDS)
    .exec();
}

export async function getActiveState(matchId: string): Promise<ActiveMatchState | null> {
  const raw = await redis.get(activeKey(matchId));
  return raw ? (JSON.parse(raw) as ActiveMatchState) : null;
}

export async function listActiveMatchIds(): Promise<string[]> {
  return redis.smembers(ACTIVE_SET);
}

export async function clearActive(matchId: string): Promise<void> {
  await redis.multi().srem(ACTIVE_SET, matchId).del(activeKey(matchId)).exec();
}

// Verrou simple (SET NX) pour serialiser les validations concurrentes d'un meme match.
export async function acquireLock(matchId: string, ttlMs = 5000): Promise<boolean> {
  const res = await redis.set(lockKey(matchId), '1', 'PX', ttlMs, 'NX');
  return res === 'OK';
}

export async function releaseLock(matchId: string): Promise<void> {
  await redis.del(lockKey(matchId));
}
