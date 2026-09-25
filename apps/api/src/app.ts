import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes.js';
import { clubRouter } from './routes/club.routes.js';
import { friendRouter } from './routes/friend.routes.js';
import { frmtRouter } from './routes/frmt.routes.js';
import { matchRouter } from './routes/match.routes.js';
import { userRouter } from './routes/user.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { env } from './config/env.js';
import { PRIVACY_HTML } from './legal/privacy.js';
import { prisma } from './config/prisma.js';
import { redis } from './config/redis.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

export function createApp(): Express {
  const app = express();

  // En production l'API est derriere le proxy de l'hebergeur : sans ceci, la limitation
  // de debit verrait l'IP du proxy et punirait tous les joueurs pour un seul.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true }));
  app.use(express.json({ limit: '256kb' }));
  app.use(apiLimiter);

  // Politique de confidentialite : Google Play exige une URL publique, consultable
  // sans compte. Hors authentification et hors limitation de debit.
  app.get('/privacy', (_req, res) => {
    res.type('html').send(PRIVACY_HTML);
  });

  // Sonde de l'hebergeur, jamais limitee. Elle interroge la base et Redis : un serveur
  // qui ecoute mais ne peut rien servir doit etre declare indisponible, sinon un
  // deploiement casse passe pour sain.
  app.get('/health', (_req, res) => {
    void (async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        res.json({ status: 'ok', service: 'padelteammates', version: '0.1.0' });
      } catch {
        res.status(503).json({ status: 'unavailable', service: 'padelteammates', version: '0.1.0' });
      }
    })();
  });

  // Limite stricte sur les portes d'entree du compte.
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  // Sans cette limite, on pourrait essayer les codes a six chiffres en masse,
  // et demander des codes en boucle pour inonder une boite aux lettres.
  app.use('/api/auth/forgot-password', authLimiter);
  app.use('/api/auth/reset-password', authLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/clubs', clubRouter);
  app.use('/api/matches', matchRouter);
  app.use('/api/users', userRouter);
  app.use('/api/friends', friendRouter);
  app.use('/api/frmt', frmtRouter);
  app.use('/api/notifications', notificationRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
