import { execSync } from 'node:child_process';
import { config } from 'dotenv';

// Prepare le schema de la base de test une fois pour toute la suite.
export default function setup(): void {
  config({ path: '.env.test', override: true });

  // `prisma db push` cree/synchronise le schema sans migrations (ideal pour les tests).
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
