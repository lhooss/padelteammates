import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './config/prisma.js';
import { disconnectRedis } from './config/redis.js';
import { startFrmtImportJob } from './jobs/frmtImport.job.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[padelteammates] API a l'ecoute sur http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

const stopFrmtImport = startFrmtImportJob();

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[padelteammates] ${signal} recu, arret en cours...`);
  stopFrmtImport();
  server.close(() => {
    void (async () => {
      await Promise.allSettled([disconnectPrisma(), disconnectRedis()]);
      process.exit(0);
    })();
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
