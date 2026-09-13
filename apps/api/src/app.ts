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

  // Avant l'authentification : sonde de l'hebergeur, jamais limitee.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'padelteammates', version: '0.1.0' });
  });

  // Limite stricte sur les portes d'entree du compte.
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
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
