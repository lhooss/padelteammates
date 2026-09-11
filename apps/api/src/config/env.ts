import 'dotenv/config';
import { z } from 'zod';

// Validation stricte des variables d'environnement au demarrage (fail fast).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET doit faire au moins 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Import automatique du classement FRMT (au plus une fois par 24 h). "false" pour le couper.
  FRMT_IMPORT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuration invalide (.env):');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
