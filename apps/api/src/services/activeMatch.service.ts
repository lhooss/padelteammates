import { randomUUID } from 'node:crypto';
import { redis } from '../config/redis.js';
import { ConflictError } from '../utils/errors.js';

// Gestion des "sessions de match actives" via Redis (voir SDD).
// Un match devient "actif" des qu'un score est saisi et attend validation.
// Cela permet un suivi rapide en memoire + verrou anti-course sur saisies et validations.

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

const LOCK_TTL_MS = 5000;

// Ne libere le verrou que s'il appartient encore a son detenteur
// (il a pu expirer puis etre repris par une autre requete entre-temps).
const RELEASE_LOCK_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0`;

// Verrou (SET NX + jeton) serialisant les saisies et validations concurrentes d'un meme match.
export async function withMatchLock<T>(matchId: string, fn: () => Promise<T>): Promise<T> {
  const token = randomUUID();
  const acquired = await redis.set(lockKey(matchId), token, 'PX', LOCK_TTL_MS, 'NX');
  if (acquired !== 'OK') {
    throw new ConflictError('Une operation sur ce resultat est deja en cours, reessayez');
  }
  try {
    return await fn();
  } finally {
    await redis.eval(RELEASE_LOCK_SCRIPT, 1, lockKey(matchId), token);
  }
}
