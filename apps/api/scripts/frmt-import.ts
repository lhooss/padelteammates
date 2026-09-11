// Import manuel du classement national padel de la FRMT : npm run frmt:import
import { disconnectPrisma } from '../src/config/prisma.js';
import { importFrmtRanking } from '../src/services/frmt.service.js';

try {
  const run = await importFrmtRanking();
  console.log(`Classement FRMT importe : ${run.menCount} messieurs, ${run.womenCount} dames.`);
} catch (err) {
  console.error('Import echoue :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await disconnectPrisma();
}
