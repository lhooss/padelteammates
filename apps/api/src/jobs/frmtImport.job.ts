import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { redis } from '../config/redis.js';
import { importFrmtRanking } from '../services/frmt.service.js';

const HOUR_MS = 60 * 60 * 1000;
const IMPORT_EVERY_MS = 24 * HOUR_MS;
// Apres un echec (page FRMT modifiee...), on attend avant de reessayer : pas de relance en boucle.
const RETRY_AFTER_ERROR_MS = 6 * HOUR_MS;
const LOCK_KEY = 'job:frmt-import';

// Import du classement FRMT au plus une fois par 24 h. Verification toutes les heures ;
// un verrou Redis evite deux imports simultanes (plusieurs instances, redemarrages en dev).
export function startFrmtImportJob(): () => void {
  if (!env.FRMT_IMPORT_ENABLED || env.NODE_ENV === 'test') return () => {};

  const tick = async () => {
    try {
      const [lastAttempt, lastSuccess] = await Promise.all([
        prisma.frmtImport.findFirst({ orderBy: { startedAt: 'desc' } }),
        prisma.frmtImport.findFirst({
          where: { error: null, finishedAt: { not: null } },
          orderBy: { startedAt: 'desc' },
        }),
      ]);
      const now = Date.now();
      if (lastSuccess && now - lastSuccess.startedAt.getTime() < IMPORT_EVERY_MS) return;
      if (lastAttempt?.error && now - lastAttempt.startedAt.getTime() < RETRY_AFTER_ERROR_MS) return;
      if ((await redis.set(LOCK_KEY, '1', 'EX', 2 * 60 * 60, 'NX')) !== 'OK') return;

      try {
        const run = await importFrmtRanking();
        console.log(`[frmt] classement importe : ${run.menCount} messieurs, ${run.womenCount} dames`);
      } finally {
        await redis.del(LOCK_KEY);
      }
    } catch (err) {
      console.error('[frmt] import echoue :', err instanceof Error ? err.message : err);
    }
  };

  const first = setTimeout(() => void tick(), 30_000);
  const timer = setInterval(() => void tick(), HOUR_MS);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
